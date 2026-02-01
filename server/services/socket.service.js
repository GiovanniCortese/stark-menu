// server/services/socket.service.js
const { Server } = require("socket.io");

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: true,            // ✅ riflette l'origin reale
      credentials: true,       // ✅ coerente con withCredentials lato client
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
    transports: ["websocket"],
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    // join room (ristorante)
    socket.on('join_room', (ristorante_id) => {
      if (!ristorante_id) return;

      const room = String(ristorante_id);
      socket.join(room);
      socket.data.room = room;

      // console.log(`🟢 socket ${socket.id} joined room: ${room}`);
    });

    // (opzionale) debug disconnessione
    // socket.on('disconnect', () => console.log(`🔴 socket disconnected: ${socket.id}`));
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error("Socket.io non è stato inizializzato!");
  return io;
};

module.exports = { initSocket, getIO };
