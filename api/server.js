require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { addEntry, getTopEntries, getTotalEntries } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;
const ROOM_DURATION_SECONDS = Number(process.env.ROOM_DURATION_SECONDS || 600);

let rooms = {}; // { roomNumber: { players: [{ username, avatar }], messages: [], timer: { remaining, interval, started }, enigmes: {}, startedAt: number|null, missionSummary?: { elapsedSeconds, completedAt } } }

const ensureRoom = (roomName) => {
  if (!rooms[roomName]) {
    rooms[roomName] = {
      players: [],
      messages: [],
      timer: { remaining: ROOM_DURATION_SECONDS, interval: null, started: false },
      enigmes: {},
      startedAt: null,
      missionSummary: null
    };
  }
  return rooms[roomName];
};

const startTimerForRoom = (roomName, { reset = false } = {}) => {
  const room = ensureRoom(roomName);

  if (reset || !room.timer.started) {
    room.timer.remaining = ROOM_DURATION_SECONDS;
    room.timer.started = true;
    room.startedAt = Date.now();
    room.missionSummary = null;
  }

  if (room.timer.interval) {
    return room.timer.remaining;
  }

  room.timer.interval = setInterval(() => {
    room.timer.remaining = Math.max(0, room.timer.remaining - 0.1);
    io.to(roomName).emit('timerUpdate', room.timer.remaining);

    if (room.timer.remaining <= 0) {
      clearInterval(room.timer.interval);
      room.timer.interval = null;
    }
  }, 100);

  io.to(roomName).emit('timerUpdate', room.timer.remaining);
  return room.timer.remaining;
};

const stopTimerForRoom = (roomName) => {
  const room = rooms[roomName];
  if (!room || !room.timer) {
    return;
  }

  if (room.timer.interval) {
    clearInterval(room.timer.interval);
    room.timer.interval = null;
  }

  room.timer.started = false;
  room.timer.remaining = ROOM_DURATION_SECONDS;
  room.startedAt = null;
  room.missionSummary = null;
};

const leaveRoom = (socket, roomName) => {
  if (!roomName) {
    return;
  }

  socket.leave(roomName);
  const room = rooms[roomName];

  if (!room) {
    return;
  }

  if (socket.data?.username) {
    room.players = room.players.filter((player) => player.username !== socket.data.username);
  }

  if (!room.players.length) {
    stopTimerForRoom(roomName);
  }

  if (!room.players.length && !room.messages.length) {
    delete rooms[roomName];
  } else {
    io.to(roomName).emit('playersUpdate', room.players);
  }
};

io.on('connection', (socket) => {
  console.log('🟢 Nouvelle connexion');

  socket.on('joinRoom', ({ username, room, avatar }, callback = () => {}) => {
    const trimmedUsername = (username ?? '').trim();
    const trimmedRoom = (room ?? '').trim();
    const sanitizedAvatar = typeof avatar === 'string' ? avatar.trim() : null;

    if (!trimmedUsername || !trimmedRoom) {
      callback({ players: [], messages: [], timer: ROOM_DURATION_SECONDS });
      return;
    }

    if (socket.data?.room && socket.data.room !== trimmedRoom) {
      leaveRoom(socket, socket.data.room);
    }

    socket.join(trimmedRoom);
    socket.data.username = trimmedUsername;
    socket.data.room = trimmedRoom;

    const roomState = ensureRoom(trimmedRoom);
    if (roomState.timer.started && !roomState.timer.interval) {
      startTimerForRoom(trimmedRoom);
    }
    const timerValue = roomState.timer.remaining;

    roomState.players = roomState.players.filter((player) => player.username !== trimmedUsername);
    roomState.players.push({ username: trimmedUsername, avatar: sanitizedAvatar });

    io.to(trimmedRoom).emit('playersUpdate', roomState.players);
    socket.emit('chatHistory', roomState.messages);
    socket.emit('timerUpdate', timerValue);
    socket.emit('enigmesProgressSync', { ...roomState.enigmes });
    if (roomState.timer.started) {
      socket.emit('missionStarted');
    }

    callback({
      players: [...roomState.players],
      messages: [...roomState.messages],
      timer: timerValue,
      missionStarted: roomState.timer.started,
      enigmes: { ...roomState.enigmes }
    });

    console.log(`${trimmedUsername} a rejoint la salle ${trimmedRoom}`);
  });

  socket.on('chatMessage', ({ room, username, message }) => {
    const msg = { username, message };
    const roomState = ensureRoom(room);
    roomState.messages.push(msg);
    io.to(room).emit('newMessage', msg);
  });

  socket.on('startMission', ({ room }) => {
    const trimmedRoom = (room ?? '').trim();
    if (!trimmedRoom) {
      return;
    }

    const roomState = ensureRoom(trimmedRoom);
    const shouldReset = !roomState.timer.started;
    const timerValue = startTimerForRoom(trimmedRoom, { reset: shouldReset });
    io.to(trimmedRoom).emit('missionStarted');
    io.to(trimmedRoom).emit('timerUpdate', timerValue);
  });

  socket.on('resetMission', ({ room }) => {
    const trimmedRoom = (room ?? '').trim();
    if (!trimmedRoom) {
      return;
    }

    const roomState = ensureRoom(trimmedRoom);
    stopTimerForRoom(trimmedRoom);
    roomState.messages = [];
    roomState.enigmes = {};
    roomState.startedAt = null;
    roomState.missionSummary = null;
    io.to(trimmedRoom).emit('missionReset');
    io.to(trimmedRoom).emit('timerUpdate', roomState.timer.remaining);
    io.to(trimmedRoom).emit('enigmesProgressSync', {});
  });

  socket.on('enigmeStatusUpdate', ({ room, key, completed }) => {
    const trimmedRoom = (room ?? '').trim();
    const normalizedKey = typeof key === 'string' ? key.trim() : '';
    if (!trimmedRoom || !normalizedKey) {
      return;
    }

    const roomState = ensureRoom(trimmedRoom);
    roomState.enigmes[normalizedKey] = Boolean(completed);
    const enigmeStatuses = Object.values(roomState.enigmes);
    const allSolved = enigmeStatuses.length > 0 && enigmeStatuses.every(Boolean);
    if (allSolved && roomState.startedAt && !roomState.missionSummary) {
      const completedAt = Date.now();
      const elapsedMs = completedAt - roomState.startedAt;
      roomState.missionSummary = {
        completedAt,
        elapsedSeconds: Math.max(0, Math.round(elapsedMs / 1000))
      };
    }
    io.to(trimmedRoom).emit('enigmeStatusUpdate', {
      key: normalizedKey,
      completed: Boolean(completed)
    });
    io.to(trimmedRoom).emit('enigmesProgressSync', { ...roomState.enigmes });
  });

  socket.on('avatarUpdate', ({ room, username, avatar }) => {
    const trimmedRoom = (room ?? '').trim();
    const trimmedUsername = (username ?? '').trim();
    if (!trimmedRoom || !trimmedUsername) {
      return;
    }
    const roomState = ensureRoom(trimmedRoom);
    const sanitizedAvatar = typeof avatar === 'string' ? avatar.trim() : null;
    let updated = false;
    roomState.players = roomState.players.map((player) => {
      if (player.username === trimmedUsername) {
        updated = true;
        return { ...player, avatar: sanitizedAvatar };
      }
      return player;
    });
    if (!updated) {
      roomState.players.push({ username: trimmedUsername, avatar: sanitizedAvatar });
    }
    io.to(trimmedRoom).emit('playersUpdate', roomState.players);
  });

  socket.on('leaderboardEntryRecorded', ({ room, entry }) => {
    const trimmedRoom = (room ?? '').trim();
    if (!trimmedRoom) {
      return;
    }
    io.to(trimmedRoom).emit('leaderboardEntryRecorded', entry ?? null);
  });

  socket.on('disconnect', () => {
    const { room } = socket.data || {};

    leaveRoom(socket, room);
    console.log('🔴 Déconnexion');
  });
});

app.get('/api/leaderboard', (req, res) => {
  const limit = Number.parseInt(req.query.limit, 10);
  const entries = getTopEntries(limit);
  res.json({ entries, total: getTotalEntries() });
});

app.post('/api/leaderboard', (req, res) => {
  const { teamName, players, elapsedSeconds } = req.body ?? {};
  if (!Array.isArray(players) || players.length === 0) {
    return res.status(400).json({ error: 'players must be a non-empty array of names' });
  }
  if (!Number.isFinite(elapsedSeconds)) {
    return res.status(400).json({ error: 'elapsedSeconds must be provided' });
  }

  try {
    const entry = addEntry({ teamName, players, elapsedSeconds });
    res.status(201).json({ entry, total: getTotalEntries() });
  } catch (error) {
    console.error('Failed to add leaderboard entry', error);
    res.status(500).json({ error: 'Failed to store leaderboard entry' });
  }
});

server.listen(PORT, () => console.log(`API sur http://localhost:${PORT}`));
