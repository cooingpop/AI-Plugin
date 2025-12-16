const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const Game = require('./game');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Game instance
const game = new Game();

// Game loop (60fps server tick, 30fps state broadcast)
const TICK_RATE = 1000 / 60;
const BROADCAST_RATE = 1000 / 30;

setInterval(() => {
  game.update();
}, TICK_RATE);

setInterval(() => {
  const state = game.getState();
  io.emit('gameState', state);
}, BROADCAST_RATE);

// Socket connection handling
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Add player to game
  const player = game.addPlayer(socket.id);
  socket.emit('init', {
    playerId: socket.id,
    config: game.getConfig(),
    state: game.getState()
  });

  // Broadcast new player to others
  socket.broadcast.emit('playerJoined', player);

  // Handle name setting
  socket.on('setName', (name) => {
    game.setPlayerName(socket.id, name);
    console.log(`Player ${socket.id} set name to: ${name}`);
  });

  // Handle direction change
  socket.on('changeDirection', (direction) => {
    game.changeDirection(socket.id, direction);
  });

  // Handle respawn request
  socket.on('respawn', () => {
    game.respawnPlayer(socket.id);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    game.removePlayer(socket.id);
    io.emit('playerLeft', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Snake Game Server running on http://localhost:${PORT}`);
});
