// client/src/App.jsx - FIX DEFINITIVO REDIRECT HOME 🚀
import { useEffect } from 'react'; 
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

// --- COMPONENTE RIMBALZO ---
const RedirectToIt = () => {
  useEffect(() => {
    // Usa replace invece di href per non lasciare traccia nella cronologia
    console.log("🔄 Tentativo di reindirizzamento verso .it...");
    window.location.replace("https://www.cosaedovemangiare.it");
  }, []);
  
  return (
    <div style={{
      height:'100vh', 
      background:'#000', 
      color:'#fff', 
      display:'flex', 
      alignItems:'center', 
      justifyContent:'center',
      fontSize: '20px',
      fontFamily: 'sans-serif'
    }}>
      🔄 Reindirizzamento in corso...
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. LA HOME PAGE (Priorità Assoluta) */}
        <Route path="/" element={<RedirectToIt />} />

        {/* 2. ALTRE PAGINE STAFF */}
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

        {/* 3. IL MENU (Cattura tutto il resto) */}
        {/* Usiamo path="*" come fallback di sicurezza se :slug fallisce, ma :slug è preferibile */}
        <Route path="/:slug" element={<Menu />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;