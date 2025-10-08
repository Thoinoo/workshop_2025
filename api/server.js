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
const ROOM_DURATION_SECONDS = Number(process.env.ROOM_DURATION_SECONDS || 3600);
const AVAILABLE_TOOLS = {
  fileFixer: { id: 'fileFixer' }
};

const buildInitialToolsState = () =>
  Object.keys(AVAILABLE_TOOLS).reduce((acc, id) => {
    acc[id] = { holder: null };
    return acc;
  }, {});

const TERMINAL_HISTORY_LIMIT = 200;

let rooms = {}; // { roomNumber: { players: [{ username, avatar, scene, terminalRole }], messages: [], timer: { remaining, interval, started }, enigmes: {}, startedAt: number|null, missionSummary?: { elapsedSeconds, completedAt }, missionFailed: boolean, tools: { [toolId]: { holder: string|null } }, terminalRoles: { [username]: 'operator'|'observer' }, terminal: { sharedInput: string, history: Array<{ command: string, outputs: string[] }> } } }

const ensureRoom = (roomName) => {
  if (!rooms[roomName]) {
    rooms[roomName] = {
      players: [],
      messages: [],
      timer: { remaining: ROOM_DURATION_SECONDS, interval: null, started: false },
      enigmes: {},
      startedAt: null,
      missionSummary: null,
      missionFailed: false,
      tools: buildInitialToolsState(),
      terminalRoles: {},
      terminal: {
        sharedInput: '',
        history: []
      }
    };
  }

  if (!rooms[roomName].tools) {
    rooms[roomName].tools = buildInitialToolsState();
  }

  return rooms[roomName];
};

const resetTerminalState = (roomState) => {
  if (!roomState) {
    return;
  }
  roomState.terminal = {
    sharedInput: '',
    history: []
  };
};

const sanitizePlayerList = (players = []) =>
  (players || []).filter(
    (player) => player && typeof player.username === 'string' && player.username.trim().length
  );

const assignTerminalRolesForRoom = (roomState) => {
  if (!roomState) {
    return;
  }

  const players = sanitizePlayerList(roomState.players);

  if (!players.length) {
    roomState.terminalRoles = {};
    return;
  }

  if (players.length === 1) {
    const username = players[0].username.trim();
    roomState.terminalRoles = { [username]: 'operator' };
  } else {
    const shuffled = players
      .map((player) => ({
        player,
        sort: Math.random()
      }))
      .sort((a, b) => a.sort - b.sort)
      .map((entry) => entry.player);

    const operatorCount = Math.max(1, Math.ceil(shuffled.length / 2));
    roomState.terminalRoles = {};

    shuffled.forEach((player, index) => {
      const role = index < operatorCount ? 'operator' : 'observer';
      roomState.terminalRoles[player.username.trim()] = role;
    });
  }

  roomState.players = players.map((player) => ({
    ...player,
    terminalRole: roomState.terminalRoles[player.username.trim()] ?? null
  }));
};

const emitTerminalState = (roomName) => {
  const roomState = rooms[roomName];
  if (!roomState) {
    return;
  }
  io.to(roomName).emit('terminal:state', {
    sharedInput: roomState.terminal?.sharedInput ?? '',
    history: Array.isArray(roomState.terminal?.history) ? roomState.terminal.history : []
  });
};

const broadcastPlayersUpdate = (roomName) => {
  const roomState = rooms[roomName];
  if (!roomState) {
    return;
  }
  io.to(roomName).emit('playersUpdate', roomState.players);
};

const isOperatorForRoom = (roomState, username) =>
  Boolean(
    roomState &&
      roomState.terminalRoles &&
      typeof username === 'string' &&
      roomState.terminalRoles[username] === 'operator'
  );

const emitToolsUpdate = (roomName) => {
  const roomState = rooms[roomName];
  if (!roomState || !roomState.tools) {
    return;
  }
  io.to(roomName).emit('toolsUpdate', { ...roomState.tools });
};

const assignToolsToPlayers = (roomState) => {
  if (!roomState) {
    return;
  }
  const toolIds = Object.keys(AVAILABLE_TOOLS);
  const playerNames = (roomState.players || [])
    .map((player) => (player && typeof player.username === 'string' ? player.username.trim() : ''))
    .filter((name) => Boolean(name));

  if (!toolIds.length) {
    roomState.tools = {};
    return;
  }

  if (!playerNames.length) {
    toolIds.forEach((toolId) => {
      roomState.tools[toolId] = { holder: null };
    });
    return;
  }

  const shuffledPlayers = playerNames
    .map((name) => ({ name, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map((entry) => entry.name);

  toolIds.forEach((toolId, index) => {
    const holder = shuffledPlayers[index % shuffledPlayers.length];
    roomState.tools[toolId] = { holder };
  });
};

const assignToolsForRoom = (roomName) => {
  const roomState = ensureRoom(roomName);
  assignToolsToPlayers(roomState);
  emitToolsUpdate(roomName);
};

const updateEnigmeStatusForRoom = (roomName, key, completed) => {
  const normalizedKey = typeof key === 'string' ? key.trim() : '';
  if (!normalizedKey) {
    return;
  }
  const roomState = ensureRoom(roomName);
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
  io.to(roomName).emit('enigmeStatusUpdate', {
    key: normalizedKey,
    completed: Boolean(completed)
  });
  io.to(roomName).emit('enigmesProgressSync', { ...roomState.enigmes });
};

const releaseToolsForUsername = (roomState, username) => {
  if (!roomState?.tools || !username) {
    return false;
  }
  let updated = false;
  Object.keys(roomState.tools).forEach((toolId) => {
    const toolState = roomState.tools[toolId];
    if (toolState?.holder === username) {
      roomState.tools[toolId] = { holder: null };
      updated = true;
    }
  });
  return updated;
};

const startTimerForRoom = (roomName, { reset = false } = {}) => {
  const room = ensureRoom(roomName);

  if (reset || !room.timer.started) {
    room.timer.remaining = ROOM_DURATION_SECONDS;
    room.timer.started = true;
    room.startedAt = Date.now();
    room.missionSummary = null;
    room.missionFailed = false;
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
      room.timer.started = false;
      room.timer.remaining = 0;
      const completedAt = Date.now();
      const elapsedMs = room.startedAt ? completedAt - room.startedAt : 0;
      room.missionSummary = {
        completedAt,
        elapsedSeconds: Math.max(0, Math.round(elapsedMs / 1000)),
        status: "failed"
      };
      room.startedAt = null;
      room.missionFailed = true;
      io.to(roomName).emit('missionFailed', {
        elapsedSeconds: room.missionSummary.elapsedSeconds
      });
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
  room.missionFailed = false;
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

  let toolsUpdated = false;
  if (socket.data?.username) {
    room.players = room.players.filter((player) => player.username !== socket.data.username);
    if (room.terminalRoles) {
      delete room.terminalRoles[socket.data.username];
    }
    toolsUpdated = releaseToolsForUsername(room, socket.data.username) || toolsUpdated;
    if (room.timer.started && room.players.length) {
      assignToolsToPlayers(room);
      toolsUpdated = true;
    } else if (!room.timer.started && !room.players.length) {
      room.tools = buildInitialToolsState();
      toolsUpdated = true;
    }
  }

  if (!room.players.length) {
    stopTimerForRoom(roomName);
  }

  if (!room.players.length && !room.messages.length) {
    delete rooms[roomName];
  } else {
    if (room.timer.started && room.players.length) {
      assignTerminalRolesForRoom(room);
    }
    io.to(roomName).emit('playersUpdate', room.players);
    if (toolsUpdated) {
      emitToolsUpdate(roomName);
    }
    if (room.timer.started) {
      emitTerminalState(roomName);
    }
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

    const existingPlayer = roomState.players.find((player) => player.username === trimmedUsername);
    roomState.players = roomState.players.filter((player) => player.username !== trimmedUsername);
    roomState.players.push({
      username: trimmedUsername,
      avatar: sanitizedAvatar,
      scene: existingPlayer?.scene ?? null,
      terminalRole: roomState.terminalRoles[trimmedUsername] ?? existingPlayer?.terminalRole ?? null
    });

    io.to(trimmedRoom).emit('playersUpdate', roomState.players);
    socket.emit('chatHistory', roomState.messages);
    socket.emit('timerUpdate', timerValue);
    socket.emit('enigmesProgressSync', { ...roomState.enigmes });
    socket.emit('toolsUpdate', { ...roomState.tools });
    socket.emit('terminal:state', {
      sharedInput: roomState.terminal?.sharedInput ?? '',
      history: Array.isArray(roomState.terminal?.history) ? roomState.terminal.history : []
    });
    if (roomState.timer.started) {
      socket.emit('missionStarted');
    }

    callback({
      players: [...roomState.players],
      messages: [...roomState.messages],
      timer: timerValue,
      missionStarted: roomState.timer.started,
      missionFailed: roomState.missionFailed,
      missionSummary: roomState.missionSummary ? { ...roomState.missionSummary } : null,
      enigmes: { ...roomState.enigmes },
      tools: { ...roomState.tools },
      terminal: {
        sharedInput: roomState.terminal?.sharedInput ?? '',
        history: Array.isArray(roomState.terminal?.history) ? roomState.terminal.history : []
      },
      terminalRoles: { ...roomState.terminalRoles }
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
    assignToolsForRoom(trimmedRoom);
    assignTerminalRolesForRoom(roomState);
    resetTerminalState(roomState);
    broadcastPlayersUpdate(trimmedRoom);
    emitTerminalState(trimmedRoom);
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
    roomState.missionFailed = false;
    roomState.tools = buildInitialToolsState();
    roomState.terminalRoles = {};
    roomState.players = roomState.players.map((player) => ({
      ...player,
      terminalRole: null
    }));
    resetTerminalState(roomState);
    io.to(trimmedRoom).emit('missionReset');
    io.to(trimmedRoom).emit('timerUpdate', roomState.timer.remaining);
    io.to(trimmedRoom).emit('enigmesProgressSync', {});
    emitToolsUpdate(trimmedRoom);
    broadcastPlayersUpdate(trimmedRoom);
    emitTerminalState(trimmedRoom);
  });

  socket.on('terminal:requestState', ({ room } = {}, callback = () => {}) => {
    const trimmedRoom = (room ?? '').trim();
    if (!trimmedRoom) {
      if (typeof callback === 'function') {
        callback({ sharedInput: '', history: [] });
      }
      return;
    }
    const roomState = ensureRoom(trimmedRoom);
    const snapshot = {
      sharedInput: roomState.terminal?.sharedInput ?? '',
      history: Array.isArray(roomState.terminal?.history) ? roomState.terminal.history : []
    };
    if (typeof callback === 'function') {
      callback(snapshot);
    } else {
      socket.emit('terminal:state', snapshot);
    }
  });

  socket.on('terminal:input', ({ room, text } = {}) => {
    const trimmedRoom = (room ?? '').trim();
    const username = (socket.data?.username ?? '').trim();
    if (!trimmedRoom || !username) {
      return;
    }
    const roomState = ensureRoom(trimmedRoom);
    if (!isOperatorForRoom(roomState, username)) {
      return;
    }
    const sanitizedText =
      typeof text === 'string' ? text.slice(0, 512) : '';
    roomState.terminal.sharedInput = sanitizedText;
    io.to(trimmedRoom).emit('terminal:inputUpdate', { text: sanitizedText });
  });

  socket.on('terminal:execute', ({ room, command, outputs } = {}, callback = () => {}) => {
    const trimmedRoom = (room ?? '').trim();
    const username = (socket.data?.username ?? '').trim();
    if (!trimmedRoom || !username) {
      if (typeof callback === 'function') {
        callback({ ok: false, error: 'invalid_payload' });
      }
      return;
    }

    const roomState = ensureRoom(trimmedRoom);
    if (!isOperatorForRoom(roomState, username)) {
      if (typeof callback === 'function') {
        callback({ ok: false, error: 'forbidden' });
      }
      return;
    }

    const sanitizedCommand = typeof command === 'string' ? command.trim() : '';
    if (!sanitizedCommand) {
      if (typeof callback === 'function') {
        callback({ ok: false, error: 'empty_command' });
      }
      return;
    }

    const sanitizedOutputs = Array.isArray(outputs)
      ? outputs
          .map((line) =>
            typeof line === 'string' ? line : String(line ?? '')
          )
          .slice(0, 50)
      : [];

    if (!Array.isArray(roomState.terminal?.history)) {
      roomState.terminal.history = [];
    }

    roomState.terminal.history.push({
      command: sanitizedCommand,
      outputs: sanitizedOutputs
    });

    if (roomState.terminal.history.length > TERMINAL_HISTORY_LIMIT) {
      roomState.terminal.history.splice(
        0,
        roomState.terminal.history.length - TERMINAL_HISTORY_LIMIT
      );
    }

    roomState.terminal.sharedInput = '';

    io.to(trimmedRoom).emit('terminal:commandExecuted', {
      command: sanitizedCommand,
      outputs: sanitizedOutputs
    });
    io.to(trimmedRoom).emit('terminal:inputUpdate', { text: '' });

    if (typeof callback === 'function') {
      callback({ ok: true });
    }
  });

  socket.on('terminal:clear', ({ room } = {}, callback = () => {}) => {
    const trimmedRoom = (room ?? '').trim();
    const username = (socket.data?.username ?? '').trim();
    if (!trimmedRoom || !username) {
      if (typeof callback === 'function') {
        callback({ ok: false, error: 'invalid_payload' });
      }
      return;
    }
    const roomState = ensureRoom(trimmedRoom);
    if (!isOperatorForRoom(roomState, username)) {
      if (typeof callback === 'function') {
        callback({ ok: false, error: 'forbidden' });
      }
      return;
    }

    resetTerminalState(roomState);
    io.to(trimmedRoom).emit('terminal:cleared');
    io.to(trimmedRoom).emit('terminal:inputUpdate', { text: '' });

    if (typeof callback === 'function') {
      callback({ ok: true });
    }
  });

  socket.on('tool:fileFixer:repair', ({ room, content } = {}, callback = () => {}) => {
    const trimmedRoom = (room ?? '').trim();
    const username = (socket.data?.username ?? '').trim();
    if (!trimmedRoom || !username) {
      callback({ ok: false, error: 'invalid_payload' });
      return;
    }

    const roomState = ensureRoom(trimmedRoom);
    const toolState = roomState.tools.fileFixer;
    if (!toolState) {
      callback({ ok: false, error: 'unknown_tool' });
      return;
    }
    if (!toolState.holder) {
      callback({ ok: false, error: 'unassigned' });
      return;
    }

    if (toolState.holder !== username) {
      callback({ ok: false, error: 'not_holder', holder: toolState.holder });
      return;
    }

    const text = typeof content === 'string' ? content : '';
    const containsSignature = text.includes('block_0365468.hash');
    const randomMessage = Math.random() < 0.5 ? 'reparation impossible' : 'repare';
    const message = containsSignature ? 'repare' : randomMessage;
    const alreadyCompleted = roomState.enigmes.enigme1 === true;

    if (containsSignature && !alreadyCompleted) {
      updateEnigmeStatusForRoom(trimmedRoom, 'enigme1', true);
    }

    callback({
      ok: true,
      message,
      success: containsSignature,
      alreadyCompleted
    });
  });

  socket.on('enigmeStatusUpdate', ({ room, key, completed }) => {
    const trimmedRoom = (room ?? '').trim();
    if (!trimmedRoom) {
      return;
    }

    updateEnigmeStatusForRoom(trimmedRoom, key, completed);
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
      roomState.players.push({ username: trimmedUsername, avatar: sanitizedAvatar, scene: null });
    }
    io.to(trimmedRoom).emit('playersUpdate', roomState.players);
  });

  socket.on('playerSceneUpdate', ({ room, username, scene }) => {
    const trimmedRoom = (room ?? '').trim();
    const trimmedUsername = (username ?? '').trim();
    if (!trimmedRoom || !trimmedUsername) {
      return;
    }
    const roomState = ensureRoom(trimmedRoom);
    let updated = false;
    const normalizedScene = typeof scene === 'string' && scene.trim().length ? scene.trim() : null;
    roomState.players = roomState.players.map((player) => {
      if (player.username === trimmedUsername) {
        if (player.scene !== normalizedScene) {
          updated = true;
          return { ...player, scene: normalizedScene };
        }
      }
      return player;
    });
    if (updated) {
      io.to(trimmedRoom).emit('playersUpdate', roomState.players);
    }
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

