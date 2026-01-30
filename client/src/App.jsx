// client/src/App.jsx - VERSIONE V100 (ROUTING COMPLETO & PRENOTAZIONI) 🚦
import { useEffect, useState } from 'react'; 
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Importazione Componenti Pagine
import Cucina from './Cucina';
import Bar from './Bar'; 
import Pizzeria from './Pizzeria';
import Cassa from './Cassa'; 
import Login from './Login';
import Admin from './Admin';
import SuperAdmin from './SuperAdmin'; 
import Menu from './Menu'; 
import Dashboard from './Dashboard';
import Haccp from './Haccp';
import Magazzino from './Magazzino';
import BookingPage from './BookingPage'; // <--- NUOVO IMPORT PRENOTAZIONI

// Stili Globali
import './App.css';

function App() {
  // --- CONTROLLO NUCLEARE ---
  // Questo codice viene eseguito PRIMA di disegnare qualsiasi cosa.
  // Se siamo sulla Home (/) e NON siamo in localhost, reindirizza subito alla landing page.
  const path = window.location.pathname;
  const isLocal = window.location.hostname.includes("localhost");
  
  if ((path === "/" || path === "") && !isLocal) {
      window.location.replace("https://www.cosaedovemangiare.it");
      return null; // Non renderizza nulla, schermata bianca istantanea per redirect
  }
  // --------------------------

  return (
    <BrowserRouter>
      <Routes>
        {/* --- ROTTE AMMINISTRAZIONE & GENERALI --- */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/:slug" element={<Admin />} />
        <Route path="/super-admin" element={<SuperAdmin />} />
        
        {/* --- ROTTE OPERATIVE STAFF (KDS & POS) --- */}
        <Route path="/cucina/:slug" element={<Cucina />} />
        <Route path="/bar/:slug" element={<Bar />} />
        <Route path="/pizzeria/:slug" element={<Pizzeria />} />
        <Route path="/cassa/:slug" element={<Cassa />} />
        
        {/* --- ROTTE MODULI AVANZATI (Protette internamente dal check abbonamento) --- */}
        <Route path="/haccp/:slug" element={<Haccp />} />
        <Route path="/haccp/:slug/scan/:scanId" element={<Haccp />} />
        <Route path="/magazzino/:slug" element={<Magazzino />} />

        {/* --- NUOVA ROTTA PRENOTAZIONI PUBBLICHE --- */}
        <Route path="/prenota/:slug" element={<BookingPage />} />

        {/* --- ROTTA MENU DIGITALE (Public Client) --- */}
        {/* Importante: Questa rotta prende tutto ciò che non è sopra (es. /pizzeria-da-mario) */}
        <Route path="/:slug" element={<Menu />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;