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

let rooms = {}; // { roomNumber: { players: [], messages: [] } }

io.on('connection', (socket) => {
  console.log('🟢 Nouvelle connexion');

  socket.on('joinRoom', ({ username, room }) => {
    const trimmedUsername = (username ?? '').trim();
    const trimmedRoom = (room ?? '').trim();

    socket.join(trimmedRoom);
    socket.data.username = trimmedUsername;
    socket.data.room = trimmedRoom;

    if (!rooms[trimmedRoom]) rooms[trimmedRoom] = { players: [], messages: [] };

    rooms[trimmedRoom].players = rooms[trimmedRoom].players.filter(
      (player) => player !== trimmedUsername
    );
    rooms[trimmedRoom].players.push(trimmedUsername);

    io.to(trimmedRoom).emit('playersUpdate', rooms[trimmedRoom].players);
    console.log(`${trimmedUsername} a rejoint la salle ${trimmedRoom}`);
  });

  socket.on('chatMessage', ({ room, username, message }) => {
    const msg = { username, message };
    rooms[room]?.messages.push(msg);
    io.to(room).emit('newMessage', msg);
  });

  socket.on('disconnect', () => {
    const { room, username } = socket.data || {};

    if (room && rooms[room]) {
      rooms[room].players = rooms[room].players.filter((player) => player !== username);

      if (!rooms[room].players.length && !rooms[room].messages.length) {
        delete rooms[room];
      } else {
        io.to(room).emit('playersUpdate', rooms[room].players);
      }
    }
    console.log('🔴 Déconnexion');
  });
});

server.listen(PORT, () => console.log(`API sur http://localhost:${PORT}`));
