import React, { useState } from 'react';
import { Lock, User, ArrowLeft, AlertCircle, Github } from 'lucide-react';
import { BASE_URL, API_BASE_URL } from '../config';

// Piccolo logo Google inline (il classico marchio a 4 colori)
function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.09-1.8 2.73v2.27h2.91c1.7-1.57 2.69-3.88 2.69-6.64z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.27c-.81.54-1.85.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.34C2.44 15.98 5.48 18 9 18z"/>
      <path fill="#FBBC05" d="M3.96 10.7A5.4 5.4 0 013.68 9c0-.59.1-1.17.28-1.7V4.96H.96A9 9 0 000 9c0 1.45.35 2.83.96 4.04l3-2.34z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l3 2.34C4.67 5.16 6.66 3.58 9 3.58z"/>
    </svg>
  );
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess, returnTo = '/navigator' }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const safeReturnTo = encodeURIComponent(returnTo);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Non seguiamo il redirect di Passport: sia successo che fallimento
      // rispondono con un 302, quindi "response.ok" dopo averlo seguito
      // sarebbe vero in ENTRAMBI i casi (è il bug che stavamo inseguendo).
      await fetch(`${BASE_URL}/login/password?returnTo=${safeReturnTo}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
        redirect: 'manual',
      });

      // L'unico modo affidabile per sapere se la sessione si è davvero
      // aperta è chiederlo al server, non interpretare la risposta sopra.
      const meRes = await fetch(`${API_BASE_URL}/current-user`, { credentials: 'include' });
      const me = meRes.ok ? await meRes.json() : null;

      if (me && (me.username || me._id)) {
        onLoginSuccess();
      } else {
        setError('Username o password non corretti. Riprova.');
      }
    } catch (err) {
      setError('Errore di connessione al server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 custom-scrollbar animate-fadeIn">
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
          <h2 className="text-xl font-bold text-white">Accesso</h2>
          <p className="text-slate-400 text-xs mt-1">Effettua il login per vedere le tue visite o gestire le sessioni di gruppo</p>
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
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>

        {/* Separatore */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">oppure</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* Login federato: stessi provider offerti sul Marketplace */}
        <div className="space-y-3">
          <a
            href={`${BASE_URL}/login/federated/google?returnTo=${safeReturnTo}`}
             className="w-full flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold py-3 px-6 rounded-xl transition-all active:scale-[0.98]"
          >
            <GoogleIcon size={18} />
            Continua con Google
          </a>
          <a
            href={`${BASE_URL}/login/federated/github?returnTo=${safeReturnTo}`}
            className="w-full flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold py-3 px-6 rounded-xl transition-all active:scale-[0.98]"
          >
            <Github size={18} />
            Continua con GitHub
          </a>
        </div>

        <div className="text-center mt-4">
          <a 
            href={`${BASE_URL}/signup`} 
            target="_blank" 
            rel="noreferrer" 
            className="text-xs text-slate-400 hover:text-purple-400 transition-colors"
          >
            Non hai un account? Registrati sul Marketplace
          </a>
        </div>

      </div>
    </div>
  );
}