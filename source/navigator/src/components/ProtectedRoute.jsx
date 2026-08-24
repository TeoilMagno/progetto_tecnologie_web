import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config';
import LoginModal from './LoginModal';

export default function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Se c'è un roomCode nell'URL, è uno studente che entra in una sessione condivisa, non serve il login!
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('roomCode')) {
      setIsAuthenticated(true);
      return;
    }
    
    // Verifichiamo lo stato dell'utente ad ogni mount della rotta protetta
    fetch(`${API_BASE_URL}/current-user`, { credentials: 'include' })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("Non autenticato");
      })
      .then(data => {
        if (data && (data.username || data._id)) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          setShowLogin(true);
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
        setShowLogin(true);
      });
  }, []);

  // 1. Stato di caricamento (Mentre aspetta la risposta dal server)
  if (isAuthenticated === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-slate-950 text-white">
        <Loader2 className="animate-spin text-purple-500 mb-4" size={40} />
        <p className="text-slate-400 text-sm">Verifica autorizzazioni...</p>
      </div>
    );
  }

  // 2. Se non è autorizzato, mostriamo un background scuro e il modale di Login
  if (!isAuthenticated) {
    return (
      <div className="min-h-[100dvh] bg-slate-950">
        <LoginModal 
          isOpen={showLogin} 
          onClose={() => navigate('/')} // Se chiude il login senza accedere, torna alla home
          onLoginSuccess={() => setIsAuthenticated(true)} // Se accede, sblocchiamo il contenuto!
        />
      </div>
    );
  }

  // 3. Se è autorizzato, renderizziamo il componente originale
  return children;
}