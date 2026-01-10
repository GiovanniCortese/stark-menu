// client/src/config.js
// Gestione intelligente dell'URL: usa localhost se sei in sviluppo, altrimenti quello di Render
const API_URL = window.location.hostname === "localhost" 
  ? "http://localhost:3000" 
  : "https://stark-backend-gg17.onrender.com";

export default API_URL;