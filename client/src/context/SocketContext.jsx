// client/src/context/SocketContext.jsx
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from "socket.io-client";
import API_URL from '../config';

const SocketContext = createContext();
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);

  const lastRoomRef = useRef(null);

  useEffect(() => {
    // ✅ NON forzare solo websocket: su Render spesso fallisce
    const s = io(API_URL, {
      // lascia che socket.io scelga (polling -> upgrade websocket)
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 800,
      timeout: 20000,
    });

    socketRef.current = s;
    setSocket(s);

    const handleConnect = () => {
      const room = lastRoomRef.current;
      if (room) {
        s.emit('join_room', String(room));
        // console.log(`🔌 Socket (re)joined room: ${room}`);
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

  const joinRoom = useCallback((ristoranteId) => {
    if (!ristoranteId) return;
    lastRoomRef.current = String(ristoranteId);

    const s = socketRef.current;
    if (s && s.connected) {
      s.emit('join_room', String(ristoranteId));
      // console.log(`🔌 Socket joined room: ${ristoranteId}`);
    }
  }, []);

  return (
    <SocketContext.Provider value={{ socket, joinRoom }}>
      {children}
    </SocketContext.Provider>
  );
};
