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
const maxPlayers = 2;

io.on('connection', socket => {

    socket.on("join room", (user) => {
      if (currentRoom == null)
        currentRoom = uuid.v1();
      
      socketToRoom[socket.id] = currentRoom;
      socketToUser[socket.id] = {user, socket: socket.id};
      if (rooms[currentRoom])
        rooms[currentRoom].users.push({user, socket:socket.id});
      else {
        rooms[currentRoom] = {}
        rooms[currentRoom].users = [{user, socket:socket.id}];
        rooms[currentRoom].position = maxPlayers;
        rooms[currentRoom].results = [];
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

      let pos
      console.log("results")
      console.log(rooms[roomID].results)
      for(pos = 0; pos < rooms[roomID].results.length && rooms[roomID].results[pos].score > score; pos++);
      rooms[roomID].results.splice(pos, 0, {player, score})
      delete socketToRoom[socket.id]
      if(rooms[roomID].results.length == maxPlayers) {
        io.to(roomID).emit("results finish", rooms[roomID].results)
        delete rooms[roomID]
      }
    })

    socket.on('disconnect', () => {
        const roomID = socketToRoom[socket.id];
        const player = socketToUser[socket.id];

        if (rooms[roomID] == undefined)
          return

        rooms[roomID].users = rooms[roomID].users.filter(user => user.socket != socket.id);

        if (roomID == currentRoom) {
          io.to(currentRoom).emit("user left", rooms[currentRoom].users.length)
        }

        rooms[roomID].results.push({player, score:0})
        if(rooms[roomID].results.length == maxPlayers) {
          io.to(roomID).emit("results finish", rooms[roomID].results)
          delete rooms[roomID]
        }
        delete socketToRoom[socket.id]
    });

    socket.on("leaving pvp", () => {
      const roomID = socketToRoom[socket.id];
      const player = socketToUser[socket.id];

      if (rooms[roomID] == undefined)
        return

      rooms[roomID].users = rooms[roomID].users.filter(user => user.socket != socket.id);

      if (roomID == currentRoom) {
        io.to(currentRoom).emit("user left", rooms[currentRoom].users.length)
      }

      rooms[roomID].results.push({player, score:0})
      if(rooms[roomID].results.length == maxPlayers) {
        io.to(roomID).emit("results finish", rooms[roomID].results)
        delete rooms[roomID]
      }
      delete socketToRoom[socket.id]
    })

});

const port = process.env.PORT || 8000;
server.listen(port, () => console.log(`Server running on port ${port}`));