import React, { useState, useEffect } from 'react';
import { Compass, Clock, Globe, Palette, Loader2, AlertCircle, Sparkles, UserCheck, Heart } from 'lucide-react';

export default function Visits({ selectedMuseum }) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'my'
  const [allVisits, setAllVisits] = useState([]);
  const [myVisits, setMyVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carica TUTTE le visite pubbliche per il museo selezionato
  const fetchAllVisits = () => {
    if (!selectedMuseum) return;
    setLoading(true);
    setError(null);
    fetch('http://localhost:8000/api/visits')
      .then((res) => {
        if (!res.ok) throw new Error('Impossibile recuperare le visite pubbliche');
        return res.json();
      })
      .then((data) => {
        const filtered = data.filter(
          (visit) => visit.museumId && visit.museumId._id === selectedMuseum._id
        );
        setAllVisits(filtered);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching all visits:', err);
        setError(err.message);
        setLoading(false);
      });
  };

  // Carica le visite "My Visits" (create dall'utente o salvate)
  const fetchMyVisits = () => {
    setLoading(true);
    setError(null);
    fetch('http://localhost:8000/api/my-visits')
      .then((res) => {
        if (res.status === 401) {
          // Gestione utente non loggato: mostriamo mock-data locali per scopi demo
          // così il Navigator non si rompe se provato in modalità ospite!
          const guestMockVisits = [
            {
              _id: 'guest_mock_1',
              title: `La mia visita a ${selectedMuseum?.name || 'Museo'}`,
              description: 'Un percorso personalizzato che raccoglie le mie opere preferite.',
              duration: 35,
              price: 0,
              language: 'it',
              works: [1, 2, 3],
              museumId: selectedMuseum,
              isGuestMock: true
            }
          ].filter(v => v.museumId && v.museumId._id === selectedMuseum?._id);
          
          setMyVisits(guestMockVisits);
          setLoading(false);
          return null;
        }
        if (!res.ok) throw new Error('Impossibile recuperare le tue visite');
        return res.json();
      })
      .then((data) => {
        if (data) {
          // Filtriamo le mie visite solo per il museo correntemente selezionato
          const filtered = data.filter(
            (visit) => visit.museumId && visit.museumId._id === selectedMuseum._id
          );
          setMyVisits(filtered);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching my visits:', err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (activeTab === 'all') {
      fetchAllVisits();
    } else {
      fetchMyVisits();
    }
  }, [selectedMuseum, activeTab]);

  if (!selectedMuseum) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 bg-slate-950 p-6 text-center">
        <div className="bg-slate-900 p-6 rounded-full mb-4">
          <AlertCircle size={48} className="text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Nessun Museo Selezionato</h2>
        <p className="max-w-md text-sm text-slate-400">Torna alla home o seleziona un museo dal menu per visualizzare le visite.</p>
      </div>
    );
  }

  const visitsToShow = activeTab === 'all' ? allVisits : myVisits;

  return (
    <div className="min-h-screen w-full relative bg-slate-950 text-white pb-36">
      {/* BACKGROUND IMAGE FISSA SFUMATA */}
      <div className="absolute inset-0 z-0 h-96">
         <img 
            src="/img1.jpg" 
            alt="Background" 
            className="w-full h-full object-cover opacity-20"
         />
         <div 
           className="absolute inset-0"
           style={{ 
             backgroundImage: 'linear-gradient(to bottom, transparent 0%, rgba(14, 22, 42, 1) 90%, rgba(14, 22, 42, 1) 100%)'
           }}
         ></div>
      </div>

      <div className="relative z-10 flex flex-col items-center pt-8 px-4 md:px-6 w-full max-w-lg mx-auto">
        
        {/* INTESTAZIONE PAGINA */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
            <Compass size={14} /> {activeTab === 'all' ? 'Tutti i Percorsi' : 'I Miei Itinerari'}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-white">
            {activeTab === 'all' ? 'Esplora Itinerari' : 'Le Mie Visite'}
          </h1>
          <p className="text-slate-400 text-xs md:text-sm">
            {activeTab === 'all' 
              ? `Scopri i percorsi disponibili per ${selectedMuseum.name}` 
              : `I tuoi percorsi salvati e creati per ${selectedMuseum.name}`}
          </p>
        </div>

        {/* LOGICA CARICAMENTO / ERRORE / ELENCO */}
        {loading ? (
          <div className="flex flex-col items-center py-20">
            <Loader2 className="animate-spin text-amber-500 mb-3" size={36} />
            <span className="text-slate-400 text-sm">Caricamento itinerari in corso...</span>
          </div>
        ) : error ? (
          <div className="w-full bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-5 flex items-start gap-3">
            <AlertCircle size={22} className="shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">Errore di connessione</h4>
              <p className="text-xs text-red-400/80 mt-1">{error}. Assicurati che il database sia raggiungibile.</p>
            </div>
          </div>
        ) : visitsToShow.length === 0 ? (
          <div className="w-full bg-[#1e293b]/40 backdrop-blur-md border border-slate-800 rounded-3xl p-8 text-center flex flex-col items-center">
            <div className="w-14 h-14 bg-slate-800 text-slate-500 rounded-2xl flex items-center justify-center mb-4">
              <Sparkles size={26} />
            </div>
            <h3 className="text-white font-bold text-lg mb-1">Nessun Itinerario Trovato</h3>
            <p className="text-slate-400 text-xs leading-relaxed max-w-xs mb-6">
              {activeTab === 'all' 
                ? 'Non sono ancora presenti visite pubbliche per questo museo.' 
                : 'Non hai ancora salvato, usato o creato itinerari per questo museo.'}
            </p>
          </div>
        ) : (
          <div className="w-full space-y-5">
            {visitsToShow.map((visit) => (
              <div 
                key={visit._id}
                className="group relative flex flex-col bg-[#1e293b]/50 backdrop-blur-md border border-slate-800 hover:border-slate-700 rounded-3xl overflow-hidden transition-all duration-300"
              >
                {/* IMMAGINE DI COPERTINA */}
                <div className="relative h-32 w-full bg-gradient-to-r from-slate-800 to-slate-900 overflow-hidden shrink-0">
                  {visit.coverImage ? (
                    <img 
                      src={visit.coverImage.startsWith('http') ? visit.coverImage : `http://localhost:8000${visit.coverImage}`} 
                      alt={visit.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-tr from-amber-500/10 via-purple-500/5 to-slate-900/10">
                      <Compass size={40} className="text-slate-700" />
                    </div>
                  )}
                  {/* PREZZO BADGE */}
                  <div className="absolute top-4 right-4 px-3 py-1 bg-slate-900/90 backdrop-blur-sm border border-slate-800 text-amber-500 text-xs font-extrabold rounded-lg">
                    {visit.price === 0 ? 'Gratis' : `€ ${visit.price.toFixed(2)}`}
                  </div>

                  {/* USER TAG IN "MY VISITS" */}
                  {activeTab === 'my' && (
                    <div className="absolute top-4 left-4 px-2.5 py-1 bg-purple-500/90 border border-purple-600/20 text-white text-[10px] font-bold rounded-lg flex items-center gap-1">
                      {visit.isGuestMock ? <Heart size={10} /> : <UserCheck size={10} />}
                      <span>{visit.isGuestMock ? 'Demo Ospite' : 'Mia Visita'}</span>
                    </div>
                  )}
                </div>

                {/* CONTENUTO CARD */}
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-white font-bold text-lg mb-1 leading-snug group-hover:text-amber-400 transition-colors">
                    {visit.title}
                  </h3>
                  <p className="text-slate-400 text-xs leading-relaxed mb-4 flex-1 line-clamp-2">
                    {visit.description || 'Nessuna descrizione fornita per questo percorso.'}
                  </p>

                  {/* METADATA RIG */}
                  <div className="flex flex-wrap gap-4 text-slate-500 text-xs pt-3 border-t border-slate-800/60">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-slate-400" />
                      <span>{visit.duration ? `${visit.duration} min` : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Palette size={14} className="text-slate-400" />
                      <span>{visit.works ? `${visit.works.length} opere` : '0 opere'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Globe size={14} className="text-slate-400" />
                      <span className="uppercase">{visit.language || 'it'}</span>
                    </div>
                  </div>

                  {/* PULSANTE ESPLORA */}
                  <button className="w-full mt-4 bg-slate-800 hover:bg-amber-500 group-hover:bg-amber-500 text-slate-300 group-hover:text-slate-950 font-bold py-2.5 px-4 rounded-xl transition-all text-xs flex items-center justify-center gap-2">
                    Avvia Itinerario
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* --- SELETTORE GRAFICO IN FONDO ALLA PAGINA --- */}
      {/* Posizionato sopra il menu in basso (ha classe fixed con bottom-20 per stare subito sopra) */}
      <div className="fixed bottom-24 left-0 right-0 z-40 px-4 pointer-events-none">
        <div className="max-w-xs mx-auto bg-slate-900/95 backdrop-blur-md border border-slate-800/90 p-1.5 rounded-full shadow-2xl shadow-black/80 flex items-center justify-between pointer-events-auto">
          
          {/* TAB: ALL VISITS */}
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 text-center py-2 rounded-full font-bold text-xs transition-all ${activeTab === 'all' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10' : 'text-slate-400 hover:text-white'}`}
          >
            All visits
          </button>

          {/* TAB: MY VISITS */}
          <button
            onClick={() => setActiveTab('my')}
            className={`flex-1 text-center py-2 rounded-full font-bold text-xs transition-all ${activeTab === 'my' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10' : 'text-slate-400 hover:text-white'}`}
          >
            My visits
          </button>

        </div>
      </div>

    </div>
  );
}
