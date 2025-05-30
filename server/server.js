const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// ✅ Correct static file path
app.use(express.static(path.join(__dirname, "../client")));

let users = {};

io.on("connection", (socket) => {
  socket.on("join", ({ name }) => {
    users[socket.id] = name;
    socket.join("DUNE_PC");
    io.to("DUNE_PC").emit("user-list", users);
  });

  socket.on("audio", (data) => {
    socket.broadcast.to("DUNE_PC").emit("audio", {
      id: socket.id,
      audio: data,
    });
  });

  socket.on("disconnect", () => {
    delete users[socket.id];
    io.to("DUNE_PC").emit("user-list", users);
  });
});

server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
