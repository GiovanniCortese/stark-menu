// client/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// --- CONTEXT GLOBALE ---
import { SocketProvider } from './context/SocketContext';

// --- FEATURE: AUTH ---
import Login from './features/auth/Login';

// --- FEATURE: ADMIN & SUPERADMIN ---
import SuperAdmin from './features/admin/SuperAdmin';
import Admin from './features/admin/Admin';

// --- FEATURE: POS (CASSA) ---
import Cassa from './features/pos/Cassa';

// --- FEATURE: PRODUCTION (KDS) ---
import Cucina from './features/production/Cucina';
import Pizzeria from './features/production/Pizzeria';
import Bar from './features/production/Bar';

// --- FEATURE: WAREHOUSE (MAGAZZINO) ---
import Magazzino from './features/warehouse/Magazzino';

// --- FEATURE: HACCP ---
import Haccp from './features/haccp/Haccp';

// --- FEATURE: PUBLIC MENU & BOOKING ---
import MenuPage from './features/public-menu/MenuPage';
import BookingPage from './features/public-menu/BookingPage';

/**
 * ✅ Redirect robusto per /admin senza slug.
 * Usa prima lo slug target del superadmin (razzo), poi fallback sullo slug utente salvato.
 */
function AdminRedirect() {
  const targetSlug = localStorage.getItem("superadmin_target_slug");

  if (targetSlug) {
    return <Navigate to={`/admin/${targetSlug}`} replace />;
  }

  // fallback: prova a leggere lo slug dall'utente loggato
  const storedUserRaw = localStorage.getItem("user") || localStorage.getItem("stark_user");
  if (storedUserRaw) {
    try {
      const u = JSON.parse(storedUserRaw);
      if (u?.slug) return <Navigate to={`/admin/${u.slug}`} replace />;
    } catch (e) {}
  }

  // se non sappiamo dove andare -> login
  return <Navigate to="/login" replace />;
}

/**
 * ✅ Fallback 404 (evita che /admin venga "mangiato" dalla rotta /:slug)
 */
function NotFound() {
  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <SocketProvider>
      <Router>
        <Routes>
          {/* --- 1. AUTHENTICATION --- */}
          <Route path="/login" element={<Login />} />

          {/* --- 2. AMMINISTRAZIONE --- */}
          <Route path="/super-admin" element={<SuperAdmin />} />

          {/* ✅ FIX: se arrivi su /admin senza slug (razzo sbagliato o link manuale) */}
          <Route path="/admin" element={<AdminRedirect />} />
          <Route path="/admin/" element={<AdminRedirect />} />

          <Route path="/admin/:slug" element={<Admin />} />

          {/* --- 3. OPERATIVITA' (POS & KDS) --- */}
          <Route path="/cassa/:slug" element={<Cassa />} />
          <Route path="/cucina/:slug" element={<Cucina />} />
          <Route path="/pizzeria/:slug" element={<Pizzeria />} />
          <Route path="/bar/:slug" element={<Bar />} />

          {/* --- 4. MODULI SPECIALI --- */}
          <Route path="/magazzino/:slug" element={<Magazzino />} />
          <Route path="/haccp/:slug" element={<Haccp />} />
          <Route path="/haccp/:slug/scan/:scanId" element={<Haccp />} />

          {/* --- 5. LATO CLIENTE (PUBBLICO) --- */}
          <Route path="/prenota/:slug" element={<BookingPage />} />

          {/* Il Menu è la rotta dinamica principale (mantienila in fondo) */}
          <Route path="/:slug" element={<MenuPage />} />

          {/* --- 6. DEFAULT / FALLBACK --- */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </SocketProvider>
  );
}

export default App;
