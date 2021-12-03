const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const uuid = require("uuid");
const io = socket(server, {
  cors: {
    origin: "*",
  },
});

const socketToRoom = {};
const socketToUser = {};
// roomID -> cantPersonas
const rooms = {};
let currentRoom = null;
const maxPlayers = 4;

io.on('connection', socket => {

    socket.on("join room", (user) => {
      if (currentRoom == null)
        currentRoom = uuid.v1();

      if(socketToRoom[socket.id]) {
        const roomID = socketToRoom[socket.id]
        rooms[roomID].users = rooms[roomID].users.filter(id => id != socket.id);
        delete socketToRoom[socket.id]
        socket.leave(roomID)
      }
      
      socketToRoom[socket.id] = currentRoom;
      socketToUser[socket.id] = user;
      if (rooms[currentRoom])
        rooms[currentRoom].users.push(user);
      else {
        rooms[currentRoom] = {}
        rooms[currentRoom].users = [user];
        rooms[currentRoom].position = maxPlayers;
      }

      socket.join(currentRoom);
      io.to(currentRoom).emit("user joined", rooms[currentRoom].users.length);

      if (rooms[currentRoom].users.length == maxPlayers) {
        io.to(currentRoom).emit("start game", rooms[currentRoom].users);
        currentRoom = uuid.v1();
      }
    })

    socket.on("player lost", (score) => {
      const roomID = socketToRoom[socket.id];
      const player = socketToUser[socket.id];

      if (rooms[roomID] == undefined)
        return

      io.to(roomID).emit("update positions", {
        id: socket.id,
        player,
        position: rooms[roomID].position--,
        score
      })
      // rooms[roomID].users = rooms[roomID].users.filter(id => id != socket.id);
      // delete socketToRoom[socket.id]
      // socket.leave(roomID)
    })

    socket.on('disconnect', () => {
        const roomID = socketToRoom[socket.id];

        if (rooms[roomID] == undefined)
          return

        if (roomID != currentRoom)
          socket.to(roomID).emit("update positions", socket.id)

        rooms[roomID].users = rooms[roomID].users.filter(id => id != socket.id);
        delete socketToRoom[socket.id]
    });

    socket.on('game over', () => {
      const roomID = socketToRoom[socket.id];

      if (!rooms[roomID])
        return;

      delete rooms[roomID]
      delete socketToRoom[socket.id]
      socket.leave(roomID)
    })

});

const port = process.env.PORT || 8000;
server.listen(port, () => console.log(`Server running on port ${port}`));