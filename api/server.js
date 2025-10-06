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
    socket.join(room);
    if (!rooms[room]) rooms[room] = { players: [], messages: [] };

    rooms[room].players.push(username);
    io.to(room).emit('playersUpdate', rooms[room].players);
    console.log(`${username} a rejoint la salle ${room}`);
  });

  socket.on('chatMessage', ({ room, username, message }) => {
    const msg = { username, message };
    rooms[room]?.messages.push(msg);
    io.to(room).emit('newMessage', msg);
  });

  socket.on('disconnect', () => {
    // Simple: pas de cleanup ici pour la démo
    console.log('🔴 Déconnexion');
  });
});

server.listen(PORT, () => console.log(`API sur http://localhost:${PORT}`));
