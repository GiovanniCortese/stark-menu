// client/src/App.jsx - VERSIONE V35 (HARD REDIRECT) ☢️
import { useEffect, useState } from 'react'; 
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Cucina from './Cucina';
import Bar from './Bar'; 
import Pizzeria from './Pizzeria';
import Cassa from './Cassa'; 
import Login from './Login';
import Admin from './Admin';
import SuperAdmin from './SuperAdmin'; 
import Menu from './Menu'; 
import './App.css';
import Dashboard from './Dashboard';
import Haccp from './Haccp';

function App() {
  // --- CONTROLLO NUCLEARE ---
  // Questo codice viene eseguito PRIMA di disegnare qualsiasi cosa.
  // Se siamo sulla Home (/) e NON siamo in localhost, reindirizza subito.
  const path = window.location.pathname;
  const isLocal = window.location.hostname.includes("localhost");
  
  if ((path === "/" || path === "") && !isLocal) {
      window.location.replace("https://www.cosaedovemangiare.it");
      return null; // Non renderizza nulla, schermata bianca istantanea
  }
  // --------------------------

  return (
    <BrowserRouter>
      <Routes>
        {/* ROTTE STAFF */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/:slug" element={<Admin />} />
        <Route path="/super-admin" element={<SuperAdmin />} />
        
        <Route path="/cucina/:slug" element={<Cucina />} />
        <Route path="/bar/:slug" element={<Bar />} />
        <Route path="/pizzeria/:slug" element={<Pizzeria />} />
        <Route path="/cassa/:slug" element={<Cassa />} />
        <Route path="/haccp/:slug" element={<Haccp />} />
        <Route path="/haccp/:slug/scan/:scanId" element={<Haccp />} />

        {/* MENU */}
        <Route path="/:slug" element={<Menu />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;