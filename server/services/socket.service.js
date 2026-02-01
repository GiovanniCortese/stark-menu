// server/services/socket.service.js
const { Server } = require("socket.io");

let io = null;

const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST", "PUT", "DELETE"]
        }
    });

    io.on('connection', (socket) => {
        // Gestione Stanze (Ristoranti)
        socket.on('join_room', (ristorante_id) => {
            if(ristorante_id) {
                socket.join(String(ristorante_id));
                // console.log(`🟢 User joined Room: ${ristorante_id}`);
            }
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error("Socket.io non è stato inizializzato!");
    }
    return io;
};

module.exports = { initSocket, getIO };