import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// RIMOSSO <StrictMode> per far funzionare correttamente il Drag & Drop
createRoot(document.getElementById('root')).render(
    <App />
)