import React, { useState, useEffect } from 'react';
import { Building2, Landmark, Loader2, AlertCircle } from 'lucide-react';

export default function MuseumSelectorOverlay({ onSelect }) {
  const [museums, setMuseums] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/museums')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Errore nel caricamento dei musei');
        }
        return res.json();
      })
      .then((data) => {
        setMuseums(data);
        if (data.length > 0) {
          // Seleziona il primo per impostazione predefinita
          setSelectedId(data[0]._id);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Fetch error:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleConfirm = () => {
    const selectedMuseum = museums.find((m) => m._id === selectedId);
    if (selectedMuseum) {
      onSelect(selectedMuseum);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl shadow-amber-500/5 flex flex-col items-center text-center">
        
        {/* ICONA LOGO */}
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-amber-500/5 animate-pulse">
          <Landmark size={32} />
        </div>

        {/* INTESTAZIONE */}
        <h2 className="text-2xl font-bold text-white mb-2">Benvenuto in ArtAround</h2>
        <p className="text-slate-400 text-sm mb-6 max-w-xs">
          Per iniziare la tua visita, seleziona uno dei musei disponibili nel database.
        </p>

        {/* LOGICA STATI (LOADING / ERROR / SELECT) */}
        {loading ? (
          <div className="flex flex-col items-center py-6">
            <Loader2 className="animate-spin text-amber-500 mb-2" size={28} />
            <span className="text-slate-400 text-sm">Caricamento musei...</span>
          </div>
        ) : error ? (
          <div className="w-full bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-4 mb-6 flex items-start gap-3 text-left">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">Si è verificato un errore</h4>
              <p className="text-xs text-red-400/80 mt-1">{error}. Assicurati che il server backend sia attivo sulla porta 8000.</p>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-6">
            {/* SELECT MENU */}
            <div className="relative">
              <label className="block text-left text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Seleziona Museo
              </label>
              <div className="relative flex items-center">
                <Building2 className="absolute left-4 text-slate-500" size={18} />
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 hover:border-slate-600 text-white rounded-xl pl-12 pr-4 py-3.5 text-sm font-medium appearance-none focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all cursor-pointer"
                >
                  {museums.map((m) => (
                    <option key={m._id} value={m._id} className="bg-slate-900 text-white">
                      {m.name}
                    </option>
                  ))}
                </select>
                {/* Custom arrow decoration */}
                <div className="pointer-events-none absolute right-4 flex items-center text-slate-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* BOTTONE CONFERMA */}
            <button
              onClick={handleConfirm}
              className="w-full bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20"
            >
              Conferma e Inizia
            </button>
          </div>
        )}
        
      </div>
    </div>
  );
}
