// client/src/context/SocketContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from "socket.io-client";
import API_URL from '../config'; // Assicurati che config.js sia in src/

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        // Inizializza la connessione UNA sola volta
        const newSocket = io(API_URL, {
            transports: ["websocket"], // Forza websocket per performance
            reconnectionAttempts: 5,
            withCredentials: true
        });

        setSocket(newSocket);

        // Cleanup quando l'app si chiude
        return () => newSocket.close();
    }, []);

    // Funzione helper per entrare nella stanza del ristorante
    const joinRoom = (ristoranteId) => {
        if (socket && ristoranteId) {
            socket.emit('join_room', String(ristoranteId));
            console.log(`🔌 Socket entrato nella stanza: ${ristoranteId}`);
        }
    };

    return (
        <SocketContext.Provider value={{ socket, joinRoom }}>
            {children}
        </SocketContext.Provider>
    );
};