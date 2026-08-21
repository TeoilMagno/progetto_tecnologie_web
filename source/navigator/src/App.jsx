import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Compass, User, MapPin, Map as MapIcon, Menu, Settings, Users } from 'lucide-react';

// Importiamo la pagina Home e le nuove pagine/componenti
import HomePage from './pages/Home';
import Visits from './pages/Visits';
import JoinSession from './pages/JoinSession';
import FreeVisitMap from './pages/FreeVisitMap';
import MuseumSelectorOverlay from './components/MuseumSelectorOverlay';

// Placeholder per le pagine future
const Placeholder = ({ title }) => (
  <div className="flex flex-col items-center justify-center h-full text-slate-500 bg-slate-950 p-6 text-center">
    <div className="bg-slate-900 p-6 rounded-full mb-4">
      <Settings size={48} className="text-slate-700" />
    </div>
    <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
    <p className="max-w-md text-sm text-slate-400">Questa sezione verrà sviluppata nei primi step del progetto.</p>
  </div>
);

export default function App() {
  const [selectedMuseum, setSelectedMuseum] = useState(null);

  return (
    <Router>
      {/* Layout Principale:
        - h-[100dvh] assicura che l'app occupi esattamente l'altezza visibile del telefono,
          evitando che la barra in basso venga coperta dall'interfaccia del browser.
      */}
      <div className="flex h-[100dvh] w-full bg-slate-950 text-white font-sans overflow-hidden flex-col">
        
        {/* --- OVERLAY SELEZIONE MUSEO --- */}
        {!selectedMuseum && (
          <MuseumSelectorOverlay onSelect={(museum) => setSelectedMuseum(museum)} />
        )}

        {/* --- HEADER MUSEO --- */}
        <header className="bg-slate-900/95 backdrop-blur-lg border-b border-slate-800 px-4 py-4 shrink-0 z-50 w-full">
          <div className="flex items-center justify-center max-w-lg mx-auto">
            <div className="flex items-center gap-3 justify-center">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0 overflow-hidden">
                <img src="/img/logob.svg" alt="Logo Museo" className="w-full h-full object-cover" />
              </div>
              <h1 className="font-bold text-lg text-white">
                {selectedMuseum ? selectedMuseum.name : 'Seleziona un museo'}
              </h1>
            </div>
            
          </div>
        </header>

        {/* --- MAIN CONTENT WRAPPER --- */}
        <div className="flex-1 flex flex-col relative w-full h-full overflow-hidden">
          
          {/* Area Scorrevole (Contenuto Pagina) */}
          <main className="flex-1 overflow-y-auto scroll-smooth w-full relative">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/visits" element={<Visits selectedMuseum={selectedMuseum} />} />
              <Route path="/join" element={<JoinSession />} />
              <Route path="/my-visits" element={<Placeholder title="My Visits" />} />
              <Route path="/free-map" element={<FreeVisitMap selectedMuseum={selectedMuseum} />} />
              <Route path="/menu" element={<Placeholder title="Menu" />} />
            </Routes>
          </main>

          {/* --- MOBILE BOTTOM BAR --- */}
          {/* Fissata in basso nel flusso flex, con z-index alto per stare sopra il contenuto */}
          <nav className=" bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 pb-safe pt-2 shrink-0 z-50 w-full">
            <div className="flex justify-center max-w-lg mx-auto">
              <ul className="flex justify-around items-center h-16 w-full">
                <MobileNavItem to="/" icon={<Home size={24} />} label="Home" />
                <MobileNavItem to="/visits" icon={<Compass size={24} />} label="Visits" />
                <MobileNavItem to="/join" icon={<Users size={24} />} label="Join" />
                <MobileNavItem to="/free-map" icon={<MapIcon size={24} />} label="Free Visit-Map" />
                <MobileNavItem to="/menu" icon={<Menu size={24} />} label="Menu" />
              </ul>
            </div>
          </nav>

        </div>
      </div>
    </Router>
  );
}

// Componente Link Bottom Bar (Mobile)
function MobileNavItem({ to, icon, label }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <li className="flex-1 flex justify-center">
      <Link to={to} className={`flex flex-col items-center gap-1 w-full py-1 transition-colors relative ${isActive ? 'text-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>
        {/* Indicatore attivo (puntino sopra icona) */}
        {icon}
        <span className="text-[10px] font-medium leading-none mt-0.5">{label}</span>
      </Link>
    </li>
  );
}
