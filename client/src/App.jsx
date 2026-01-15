// client/src/App.jsx - VERSIONE V33 (ROTTE + PIZZERIA) 🌍
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Cucina from './Cucina';
import Bar from './Bar'; 
import Pizzeria from './Pizzeria'; // NUOVO IMPORT
import Cassa from './Cassa'; 
import Login from './Login';
import Admin from './Admin';
import SuperAdmin from './SuperAdmin'; 
import Menu from './Menu'; // MENU SPOSTATO
import './App.css';
import Dashboard from './Dashboard'; // <--- Importa il nuovo file
import Haccp from './Haccp';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* LOGIN E AMMINISTRAZIONE */}
        <Route path="/login" element={<Login />} />
        <Route path="/admin/:slug" element={<Admin />} />
        <Route path="/super-admin" element={<SuperAdmin />} />
        
        {/* REPARTI OPERATIVI */}
        <Route path="/cucina/:slug" element={<Cucina />} />
        <Route path="/bar/:slug" element={<Bar />} />
        <Route path="/pizzeria/:slug" element={<Pizzeria />} />
        <Route path="/cassa/:slug" element={<Cassa />} />
        <Route path="/haccp/:slug" element={<Haccp />} />
        <Route path="/haccp/:slug/scan/:scanId" element={<Haccp />} />

        {/* DASHBOARD CLIENTE (Mettila PRIMA delle rotte generiche) */}    
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* MENU CLIENTE (Queste "catturano" tutto il resto, lasciale per ultime) */}
        <Route path="/:slug" element={<Menu />} />
        <Route path="/" element={<Menu />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;