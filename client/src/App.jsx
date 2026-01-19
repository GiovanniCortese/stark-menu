// client/src/App.jsx - VERSIONE V34 (REBRANDING + REDIRECT HOME) 🌍
import { useEffect } from 'react'; // <--- IMPORTANTE: Serve per il redirect
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

// --- COMPONENTE SPECIALE PER IL "RIMBALZO" ---
// Se qualcuno va sulla Home vuota (.com), lo spediamo al portale (.it)
const RedirectToIt = () => {
  useEffect(() => {
    window.location.href = "https://www.cosaedovemangiare.it";
  }, []);
  
  return (
    <div style={{
      height:'100vh', 
      background:'#111', 
      color:'white', 
      display:'flex', 
      alignItems:'center', 
      justifyContent:'center',
      flexDirection: 'column',
      fontFamily: 'sans-serif'
    }}>
      <h2>Ti stiamo portando al portale... 🚀</h2>
      <p style={{color:'#888', marginTop:10}}>www.cosaedovemangiare.it</p>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. LA NUOVA HOME PAGE (REINDIRIZZA AL .IT) */}
        <Route path="/" element={<RedirectToIt />} />

        {/* 2. DASHBOARD CLIENTE */}    
        <Route path="/dashboard" element={<Dashboard />} />

        {/* 3. LOGIN E AMMINISTRAZIONE */}
        <Route path="/login" element={<Login />} />
        <Route path="/admin/:slug" element={<Admin />} />
        <Route path="/super-admin" element={<SuperAdmin />} />
        
        {/* 4. REPARTI OPERATIVI (STAFF) */}
        <Route path="/cucina/:slug" element={<Cucina />} />
        <Route path="/bar/:slug" element={<Bar />} />
        <Route path="/pizzeria/:slug" element={<Pizzeria />} />
        <Route path="/cassa/:slug" element={<Cassa />} />
        <Route path="/haccp/:slug" element={<Haccp />} />
        <Route path="/haccp/:slug/scan/:scanId" element={<Haccp />} />

        {/* 5. MENU DIGITALE (Cattura tutti i link tipo /pizzeria-da-mario) */}
        {/* Questa rotta deve stare sempre in fondo per evitare conflitti */}
        <Route path="/:slug" element={<Menu />} />
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;