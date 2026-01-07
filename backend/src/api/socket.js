import { Server } from "socket.io";

export default function handler(req, res) {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server);
    res.socket.server.io = io;

    io.on("connection", socket => {
      socket.on("rider:location", data => {
        socket.broadcast.emit("rider:update", data);
      });
    });
  }
  res.end();
}

socket.on("admin:assign", ({ riderId, order }) => {
  socket.to(riderId).emit("order:assigned", order);
});

socket.emit("join", riderId);
