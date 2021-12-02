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
// roomID -> cantPersonas
const rooms = {};
let currentRoom = null;
const maxPlayers = 2;

io.on('connection', socket => {

    socket.on("join room", (user) => {
      if (currentRoom == null)
        currentRoom = uuid.v1();
      
      socketToRoom[socket.id] = currentRoom;
      if (rooms[currentRoom])
        rooms[currentRoom].users.push(socket.id);
      else {
        rooms[currentRoom] = {}
        rooms[currentRoom].users = [socket.id];
      }

      socket.join(currentRoom);
      io.to(currentRoom).emit("user joined", rooms[currentRoom].users.length);

      if (rooms[currentRoom].users.length == maxPlayers) {
        io.to(currentRoom).emit("start game", rooms[currentRoom].users);
        const aux = currentRoom
        rooms[currentRoom].interval = setInterval(() => io.to(aux).emit("fog tick"), 3000);
        currentRoom = uuid.v1();
      }
    })

    socket.on("change direction", (direction) => {
      io.to(socketToRoom[socket.id]).emit("update direction", { id: socket.id, direction })
    })

    socket.on("players collision", () => {
      const roomID = socketToRoom[socket.id];

      if (rooms[roomID] == undefined)
        return

      socket.to(roomID).emit("player died", socket.id)
      rooms[roomID].users = rooms[roomID].users.filter(id => id != socket.id);
      delete socketToRoom[socket.id]
      socket.leave(roomID)
    })

    socket.on('disconnect', () => {
        const roomID = socketToRoom[socket.id];

        if (rooms[roomID] == undefined)
          return

        if (roomID != currentRoom)
          socket.to(roomID).emit("player died", socket.id)

        rooms[roomID].users = rooms[roomID].users.filter(id => id != socket.id);
        delete socketToRoom[socket.id]
    });

    socket.on('game over', () => {
      const roomID = socketToRoom[socket.id];

      if (!rooms[roomID])
        return;
    
      clearInterval(rooms[roomID].interval)
      delete rooms[roomID]
      delete socketToRoom[socket.id]
      socket.leave(roomID)
    })

});

const port = process.env.PORT || 8000;
server.listen(port, () => console.log(`Server running on port ${port}`));