import { createRoot } from 'react-dom/client'
import './App.css';
import './index.css'
import App from './App.jsx'
import { SocketProvider } from './context/SocketContext'; // <--- IMPORTA QUESTO

createRoot(document.getElementById('root')).render(
    <SocketProvider>
        <App />
    </SocketProvider>
)

// RIMOSSO <StrictMode> per far funzionare correttamente il Drag & Drop
createRoot(document.getElementById('root')).render(
    <App />
)