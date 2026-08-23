import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Compass, Map as MapIcon, Image as ImageIcon } from 'lucide-react';
import { API_BASE_URL } from '../config';
import LoginModal from './LoginModal'; 

export default function VisitPreviewModal({ visit, onClose, activeTab }) {
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);

  if (!visit) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-end sm:items-center bg-black/80 backdrop-blur-sm animate-fadeIn p-0 sm:p-6">
      <div className="w-full max-w-lg bg-slate-900 border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[90dvh] shadow-2xl relative">
        
        {/* Tasto Chiudi */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 cursor-pointer backdrop-blur-md"
        >
          <X size={20} />
        </button>

        {/* Header Modale: Immagine */}
        <div className="h-48 w-full bg-slate-800 relative shrink-0">
          {visit.coverImage ? (
            <img 
              src={visit.coverImage.startsWith('http') ? visit.coverImage : `http://localhost:8000${visit.coverImage}`} 
              alt={visit.title} 
              className="w-full h-full object-cover" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-600">
              <Compass size={48} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent"></div>
          <h2 className="absolute bottom-4 left-4 right-16 text-2xl font-bold text-white leading-tight">
            {visit.title}
          </h2>
        </div>

        {/* Corpo Modale: Descrizione e Tappe */}
        <div className="p-5 overflow-y-auto flex-1">
          <p className="text-slate-300 text-sm mb-6 leading-relaxed">
            {visit.description || 'Nessuna descrizione disponibile per questo percorso.'}
          </p>
          
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            Tappe del percorso <span className="bg-slate-800 px-2 py-0.5 rounded-full text-slate-300">{visit.works?.length || 0}</span>
          </h4>
          
          <div className="space-y-3 mb-4">
            {visit.works?.map((work, idx) => {
              const isPopulated = typeof work === 'object' && work.name;
              return (
                <div key={idx} className="flex items-center gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
                  <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                    {isPopulated && work.image ? (
                      <img src={work.image} className="w-full h-full object-cover"/>
                    ) : (
                      <ImageIcon size={16} className="text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-200 truncate">
                      {isPopulated ? work.name : `Tappa ${idx + 1}`}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {isPopulated && work.authorName ? work.authorName : 'Dettaglio tappa'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Modale: Azione */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0">
           {activeTab === 'my' ? (
              <button 
                onClick={() => {
                  if (visit.isGuestMock) {
                    alert("Questa è una visita dimostrativa. Accedi per creare e avviare itinerari reali sulla mappa!");
                  } else {
                    navigate(`/map?visitId=${visit._id}`);
                  }
                }}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 flex justify-center items-center gap-2 cursor-pointer"
              >
                <MapIcon size={20} /> Avvia Itinerario
              </button>
           ) : (
              <button 
                onClick={async () => {
                  try {
                    // Chiamiamo direttamente la rotta di checkout!
                    const response = await fetch(`${API_BASE_URL}/checkout`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        items: [], // Nessun gadget fisico
                        visits: [{
                          visitId: visit._id,
                          title: visit.title,
                          price: visit.price || 0
                        }],
                        totalAmount: visit.price || 0
                      })
                    });
                    
                    if (response.ok) {
                      alert(`Acquisto di "${visit.title}" completato! L'ordine è stato registrato e la trovi ne "Le mie visite".`);
                      onClose();
                    } else if (response.status === 401) {
                      // Se l'utente non è autenticato, apriamo il modale!
                      setShowLoginModal(true);
                    } else {
                      const data = await response.json();
                      alert(data.error || "Si è verificato un errore durante l'acquisto.");
                    }
                  } catch (err) {
                    console.error(err);
                    alert("Errore di connessione al server.");
                  }
                }}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-purple-500/20 flex justify-center items-center gap-2 cursor-pointer"
              >
                Acquista {visit.price === 0 ? 'Gratis' : `(€ ${(visit.price || 0).toFixed(2)})`}
              </button>
           )}
        </div>

        {/* MODALE LOGIN INTEGRATO */}
        <LoginModal 
          isOpen={showLoginModal} 
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={() => {
            setShowLoginModal(false);
            alert("Login effettuato con successo! Clicca di nuovo su 'Acquista' per confermare l'ordine.");
          }}
      />

      </div>
    </div>
  );
}