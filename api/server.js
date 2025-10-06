require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;
const ROOM_DURATION_SECONDS = Number(process.env.ROOM_DURATION_SECONDS || 600);

let rooms = {}; // { roomNumber: { players: [], messages: [], timer: { remaining, interval, started } } }

const ensureRoom = (roomName) => {
  if (!rooms[roomName]) {
    rooms[roomName] = {
      players: [],
      messages: [],
      timer: { remaining: ROOM_DURATION_SECONDS, interval: null, started: false }
    };
  }
  return rooms[roomName];
};

const startTimerForRoom = (roomName) => {
  const room = ensureRoom(roomName);

  if (room.timer.interval) {
    return room.timer.remaining;
  }

  if (!room.timer.started) {
    room.timer.remaining = ROOM_DURATION_SECONDS;
    room.timer.started = true;
  }

  room.timer.interval = setInterval(() => {
    room.timer.remaining = Math.max(0, room.timer.remaining - 1);
    io.to(roomName).emit('timerUpdate', room.timer.remaining);

    if (room.timer.remaining <= 0) {
      clearInterval(room.timer.interval);
      room.timer.interval = null;
    }
  }, 1000);

  io.to(roomName).emit('timerUpdate', room.timer.remaining);
  return room.timer.remaining;
};

const stopTimerForRoom = (roomName) => {
  const room = rooms[roomName];
  if (!room || !room.timer?.interval) {
    return;
  }

  clearInterval(room.timer.interval);
  room.timer.interval = null;
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
    room.players = room.players.filter((player) => player !== socket.data.username);
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

  socket.on('joinRoom', ({ username, room }, callback = () => {}) => {
    const trimmedUsername = (username ?? '').trim();
    const trimmedRoom = (room ?? '').trim();

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
    const timerValue = roomState.timer.interval ? roomState.timer.remaining : startTimerForRoom(trimmedRoom);

    roomState.players = roomState.players.filter((player) => player !== trimmedUsername);
    roomState.players.push(trimmedUsername);

    io.to(trimmedRoom).emit('playersUpdate', roomState.players);
    socket.emit('chatHistory', roomState.messages);
    socket.emit('timerUpdate', timerValue);

    callback({
      players: roomState.players,
      messages: roomState.messages,
      timer: timerValue
    });

    console.log(`${trimmedUsername} a rejoint la salle ${trimmedRoom}`);
  });

  socket.on('chatMessage', ({ room, username, message }) => {
    const msg = { username, message };
    const roomState = ensureRoom(room);
    roomState.messages.push(msg);
    io.to(room).emit('newMessage', msg);
  });

  socket.on('disconnect', () => {
    const { room } = socket.data || {};

    leaveRoom(socket, room);
    console.log('🔴 Déconnexion');
  });
});

server.listen(PORT, () => console.log(`API sur http://localhost:${PORT}`));
