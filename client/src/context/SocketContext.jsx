// client/src/context/SocketContext.jsx
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from "socket.io-client";
import API_URL from '../config';

const SocketContext = createContext();
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);

  // ✅ memorizza l'ultima room richiesta (ristorante_id)
  const lastRoomRef = useRef(null);

  useEffect(() => {
    // Inizializza connessione UNA sola volta
    const s = io(API_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
      withCredentials: true, // se non usi cookie puoi anche metterlo false, ma lascio com'è
    });

    socketRef.current = s;
    setSocket(s);

    // ✅ su connect/reconnect: se avevamo già una room, rientra
    const handleConnect = () => {
      const room = lastRoomRef.current;
      if (room) {
        s.emit('join_room', String(room));
        console.log(`🔌 Socket (re)joined room: ${room}`);
      }
    };

    s.on('connect', handleConnect);

    return () => {
      try {
        s.off('connect', handleConnect);
        s.close();
      } catch (e) {}
      socketRef.current = null;
      setSocket(null);
    };
  }, []);

  // ✅ joinRoom robusto: funziona anche se socket non è ancora pronto
  const joinRoom = useCallback((ristoranteId) => {
    if (!ristoranteId) return;

    lastRoomRef.current = String(ristoranteId);

    const s = socketRef.current;
    if (s && s.connected) {
      s.emit('join_room', String(ristoranteId));
      console.log(`🔌 Socket joined room: ${ristoranteId}`);
    } else {
      // verrà joinata automaticamente al prossimo connect
      console.log(`⏳ Socket non pronto: room salvata (${ristoranteId})`);
    }
  }, []);

  return (
    <SocketContext.Provider value={{ socket, joinRoom }}>
      {children}
    </SocketContext.Provider>
  );
};
