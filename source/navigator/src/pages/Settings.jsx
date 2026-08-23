import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Headphones, Building2, Shield, Trash2, ChevronRight } from 'lucide-react';

export default function SettingsPage() {
  const navigate = useNavigate();
  
  // Inizializziamo lo stato leggendo dal localStorage (default 1.0)
  const [playbackSpeed, setPlaybackSpeed] = useState(() => {
    return localStorage.getItem('audioSpeed') || '1.0';
  });

  // Quando cambia, salviamo in localStorage
  useEffect(() => {
    localStorage.setItem('audioSpeed', playbackSpeed);
  }, [playbackSpeed]);

  const clearCache = () => {
    if (window.confirm("Sei sicuro di voler svuotare i dati salvati offline? Dovrai rifare l'accesso.")) {
      localStorage.clear();
      alert("Cache svuotata con successo.");
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white p-6 flex flex-col items-center animate-fadeIn">
      <div className="w-full max-w-lg mt-4 flex flex-col h-full">
        
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 bg-slate-900 text-slate-400 hover:text-white rounded-full transition-colors cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-white">Impostazioni</h1>
        </div>

        <div className="space-y-6">
          
          {/* SEZIONE 1: AUDIO */}
          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Headphones size={14} /> Riproduzione Audio
            </h3>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-200 text-sm">Velocità Voce</p>
                  <p className="text-xs text-slate-500 mt-0.5">Regola la velocità dell'audioguida</p>
                </div>
                <select 
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="0.75">Lenta (0.75x)</option>
                  <option value="1.0">Normale (1x)</option>
                  <option value="1.25">Veloce (1.25x)</option>
                  <option value="1.5">Molto Veloce (1.5x)</option>
                </select>
              </div>
            </div>
          </section>

          {/* SEZIONE 2: MUSEO */}
          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building2 size={14} /> Navigazione
            </h3>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <button 
                onClick={() => navigate('/')}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <div className="text-left">
                  <p className="font-semibold text-slate-200 text-sm">Cambia Museo</p>
                  <p className="text-xs text-slate-500 mt-0.5">Torna alla selezione principale</p>
                </div>
                <ChevronRight size={18} className="text-slate-600" />
              </button>
            </div>
          </section>

          {/* SEZIONE 3: DATI E PRIVACY */}
          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Shield size={14} /> Dati e Privacy
            </h3>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col divide-y divide-slate-800">
              
              <button 
                onClick={() => alert("Qui andrà il link alla tua Privacy Policy.")}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <p className="font-semibold text-slate-200 text-sm">Termini e Privacy</p>
                <ChevronRight size={18} className="text-slate-600" />
              </button>

              <button 
                onClick={clearCache}
                className="w-full flex items-center justify-between p-4 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <p className="font-semibold text-red-400 text-sm">Svuota Cache Locale</p>
                <Trash2 size={18} className="text-red-500/70" />
              </button>

            </div>
          </section>
        </div>

        <div className="mt-auto pt-8 pb-4 text-center">
          <p className="text-xs text-slate-600 font-mono">ArtAround Navigator v1.0.0</p>
        </div>

      </div>
    </div>
  );
}