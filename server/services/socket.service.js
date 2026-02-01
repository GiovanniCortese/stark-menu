// server/services/socket.service.js
const { Server } = require("socket.io");

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
    // ✅ NON forzare solo websocket: lascia default (polling -> upgrade websocket)
    // transports: ["websocket"],
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    socket.on('join_room', (ristorante_id) => {
      if (!ristorante_id) return;
      const room = String(ristorante_id);
      socket.join(room);
      socket.data.room = room;
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error("Socket.io non è stato inizializzato!");
  return io;
};

module.exports = { initSocket, getIO };
