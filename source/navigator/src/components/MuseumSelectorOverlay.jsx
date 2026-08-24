import React, { useState, useEffect } from 'react';
import { Building2, Landmark, Loader2, AlertCircle, Search } from 'lucide-react';
import { API_BASE_URL } from '../config';

// Algoritmo di Levenshtein
function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Ricerca Fuzzy
function fuzzySearch(query, targetText, maxTypos = 2) {
  query = query.toLowerCase().trim();
  targetText = targetText.toLowerCase().trim();
  
  if (query === "") return true;
  if (targetText.includes(query)) return true;

  const queryWords = query.split(/\s+/);
  const targetWords = targetText.split(/\s+/);

  return queryWords.every(qw => 
    targetWords.some(tw => levenshteinDistance(qw, tw) <= maxTypos)
  );
}

export default function MuseumSelectorOverlay({ onSelect }) {
  const [museums, setMuseums] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const filteredMuseums = museums.filter(m => fuzzySearch(searchQuery, m.name));

  useEffect(() => {
    fetch(`${API_BASE_URL}/museums`)
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
          localStorage.setItem('selected_museum_id', selectedId._id);
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
      localStorage.setItem('selected_museum_id', selectedMuseum._id);
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
            {/* CUSTOM DROPDOWN MUSEI */}
            <div className="w-full relative text-left">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Seleziona Museo
              </label>
              
              {/* Bottone Principale (Mostra il museo selezionato) */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-slate-800 border border-slate-700 hover:border-slate-600 text-white rounded-xl px-4 py-3.5 text-sm font-medium flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Building2 size={18} className="text-amber-500 shrink-0" />
                  <span className="truncate">
                    {museums.find(m => m._id === selectedId)?.name || "Seleziona un museo..."}
                  </span>
                </div>
                <svg className={`fill-current h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </button>

              {/* Tendina a Scomparsa (con Ricerca e Lista) */}
              {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-fadeIn">
                  
                  {/* Barra di ricerca interna alla tendina */}
                  <div className="p-2 border-b border-slate-800 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                      type="text"
                      placeholder="Cerca museo..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                  
                  {/* Lista risultati (max 4-5 visibili, poi scrolla) */}
                  <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
                    {filteredMuseums.length === 0 ? (
                      <p className="text-slate-500 text-sm py-3 text-center">Nessun risultato.</p>
                    ) : (
                      filteredMuseums.map((m) => (
                        <button
                          key={m._id}
                          onClick={() => {
                            setSelectedId(m._id);
                            setIsOpen(false); // Chiude la tendina dopo la scelta
                            setSearchQuery(''); // Resetta la ricerca
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
                            selectedId === m._id 
                              ? 'bg-amber-500/20 text-amber-400 font-bold' 
                              : 'hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <span className="text-sm truncate">{m.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
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
