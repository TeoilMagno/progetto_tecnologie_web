import React, { useState } from 'react';
import { Lock, User, ArrowLeft, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../../../../src/config';

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/login/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
        redirect: 'follow'
      });

      if (response.redirected || response.ok) {
        // Login riuscito, ricarichiamo o aggiorniamo lo stato utente
        onLoginSuccess();
        onClose();
      } else {
        setError('Credenziali non valide. Riprova.');
      }
    } catch (err) {
      setError('Errore di connessione al server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
        
        {/* Pulsante Chiudi */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Lock size={24} />
          </div>
          <h2 className="text-xl font-bold text-white">Accesso Insegnante</h2>
          <p className="text-slate-400 text-xs mt-1">Effettua il login per gestire le sessioni di gruppo</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs mb-4 flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Username</label>
            <div className="relative flex items-center">
              <User className="absolute left-3 text-slate-500" size={16} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-all"
                placeholder="Il tuo username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 text-slate-500" size={16} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 active:scale-[0.98] text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-purple-500/10 mt-2"
          >
            {loading ? 'Accesso in corso...' : 'Entra come Insegnante'}
          </button>
        </form>

        <div className="text-center mt-4">
          <a 
            href="http://localhost:8000/signup" 
            target="_blank" 
            rel="noreferrer" 
            className="text-xs text-slate-400 hover:text-purple-400 transition-colors"
          >
            Non hai un account curatore? Registrati sul Marketplace
          </a>
        </div>

      </div>
    </div>
  );
}