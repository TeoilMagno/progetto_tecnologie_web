import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Compass, Settings, LogOut, ChevronRight, User, LogIn } from 'lucide-react';
import { API_BASE_URL } from '../config';
import LoginModal from '../components/LoginModal'; // Controlla che il path sia corretto

export default function MenuPage() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Controllo iniziale: l'utente è loggato?
  useEffect(() => {
    fetch(`${API_BASE_URL}/current-user`, { credentials: 'include' })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Non autenticato");
      })
      .then((data) => {
        if (data && (data.username || data._id)) {
          setCurrentUser(data);
        }
      })
      .catch(() => setCurrentUser(null));
  }, []);

  // Funzione di logout che fa la chiamata API e reindirizza alla home del Navigator
  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL.replace('/api', '')}/logout`, { 
        method: 'POST', // o GET, a seconda di come l'hai definito in auth.js nel backend
        credentials: 'include' 
      });
      setCurrentUser(null);
      navigate('/'); 
    } catch (err) {
      console.error("Errore durante il logout", err);
      navigate('/');
    }
  };

  return (
    <div className="min-h-[100dvh] text-white p-6 flex flex-col items-center animate-fadeIn">
      <div className="w-full max-w-lg mt-4 flex flex-col h-full">
        
        <h1 className="text-3xl font-bold mb-8 text-white">Menu</h1>

        {/* --- PROFILO O LOGIN --- */}
        {currentUser ? (
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-6 mb-6 flex items-center gap-4">
            <div className="w-16 h-16 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center shrink-0">
              <User size={32} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-200">{currentUser.username}</h2>
              
              {/* Mostriamo sia il ruolo di base (es. visitor/curator) che il tipo nella visita (es. teacher/student) */}
              <p className="text-sm text-slate-400 capitalize">
                {currentUser.role === 'visitor' ? 'Visitatore' : currentUser.role}
                {currentUser.type !== 'none' && ` • ${currentUser.type}`}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-6 mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-200">Non sei loggato</h2>
              <p className="text-sm text-slate-400">Accedi per gestire sessioni</p>
            </div>
            <button 
              onClick={() => setShowLoginModal(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white p-3 rounded-2xl transition-colors cursor-pointer"
            >
              <LogIn size={24} />
            </button>
          </div>
        )}

        {/* Voci di Menu */}
        <div className="space-y-3 mb-auto">
          {/* Mostriamo lo storico report SOLO se è loggato */}
          {currentUser && (
            <>
              <button 
                onClick={() => navigate('/my-visits')}
                className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 p-4 rounded-2xl flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Compass className="text-cyan-400" size={24} />
                  <span className="font-semibold text-slate-200">Le mie Visite</span>
                </div>
                <ChevronRight className="text-slate-600" size={20} />
              </button>
              <button 
                onClick={() => navigate('/my-reports')}
                className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/50 p-4 rounded-2xl flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <FileText className="text-purple-400" size={24} />
                  <span className="font-semibold text-slate-200">Storico Report Quiz</span>
                </div>
                <ChevronRight className="text-slate-600" size={20} />
              </button>
            </>
          )}

          <button 
            onClick={() => navigate('/settings')}
            className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 p-4 rounded-2xl flex items-center justify-between transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Settings className="text-slate-400" size={24} />
              <span className="font-semibold text-slate-200">Impostazioni</span>
            </div>
            <ChevronRight className="text-slate-600" size={20} />
          </button>

        </div>

        {/* Log Out (SOLO se loggato) */}
        {currentUser && (
          <button 
            onClick={handleLogout}
            className="w-full mt-6 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut size={20} /> Disconnetti
          </button>
        )}

        {/* Modale Login Integrato */}
        <LoginModal 
          isOpen={showLoginModal} 
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={() => {
            setShowLoginModal(false);
            // Forza il re-fetch dell'utente per aggiornare l'interfaccia istantaneamente
            fetch(`${API_BASE_URL}/current-user`, { credentials: 'include' })
              .then(res => res.json())
              .then(data => setCurrentUser(data))
              .catch(err => console.error(err));
          }}
        />

      </div>
    </div>
  );
}