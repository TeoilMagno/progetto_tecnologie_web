import React from 'react';
import { Lock, ChevronLeft, Play, ChevronRight, BookOpen, Volume2, Keyboard, Mic } from 'lucide-react';

export default function NavigationControlBar({
  currentWorkIndex,
  visitedWorks,
  onPrev,
  onNext,
  onStartVisit,
  playMode,
  setPlayMode,
  inputMode,
  setInputMode,
  onSpeak,
  isSharedSession,
  isTeacher
}) {
  const currentWork = currentWorkIndex >= 0 ? visitedWorks[currentWorkIndex] : null;

  return (
    <div className="absolute bottom-0 left-0 right-0 h-[120px] bg-[#121218]/95 border-t border-white/10 flex items-center justify-between px-8 z-[999] backdrop-blur-md">
      
      {/* Sinistra: Dettagli Opera Corrente */}
      <div className="w-[320px]">
        {currentWorkIndex >= 0 ? (
          <div>
            <span className="inline-block px-2 py-0.5 bg-cyan-500 text-white text-[10px] font-bold rounded mb-1 tracking-wider">
              OPERA {currentWorkIndex + 1} DI {visitedWorks.length}
              {isSharedSession && !isTeacher && " (Sincro)"}
            </span>
            <h5 className="mb-0 truncate text-white text-[0.95rem] font-bold">{currentWork?.name}</h5>
            <p className="mb-0 text-sm text-slate-400 truncate">{currentWork?.author}</p>
          </div>
        ) : (
          <div>
            <span className="inline-block px-2 py-0.5 bg-slate-600 text-white text-[10px] font-bold rounded mb-1 tracking-wider">
              PANORAMICA
            </span>
            <h5 className="mb-0 text-white text-[0.95rem] font-bold">Navigazione Libera</h5>
            <p className="mb-0 text-sm text-slate-400">Seleziona un'opera per iniziare</p>
          </div>
        )}
      </div>

      {/* Centro: Pulsanti Avanti/Indietro o Blocchi per studenti */}
      <div className="flex items-center gap-3">
        {isSharedSession && !isTeacher ? (
          <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-full text-xs text-amber-400 font-semibold">
            <Lock size={14} /> Navigazione controllata dal docente
          </div>
        ) : (
          <>
            <button 
              onClick={onPrev} 
              className="flex items-center justify-center gap-1 min-w-[120px] px-4 py-2 border border-white/20 rounded-full text-white hover:bg-white/10 text-sm transition-colors disabled:opacity-50"
              disabled={currentWorkIndex < 0}
            >
              <ChevronLeft size={16} /> Precedente
            </button>
            
            {currentWorkIndex === -1 ? (
              <button 
                onClick={onStartVisit}
                className="flex items-center justify-center gap-1 min-w-[140px] px-5 py-2 rounded-full text-white text-sm font-semibold border-none"
                style={{ background: "linear-gradient(90deg, #00ccff, #7a1dd0)" }}
                disabled={visitedWorks.length === 0}
              >
                Inizia Visita <Play size={16} className="fill-white" />
              </button>
            ) : (
              <button 
                onClick={onNext} 
                className="flex items-center justify-center gap-1 min-w-[140px] px-5 py-2 rounded-full text-white text-sm font-semibold border-none"
                style={{ background: "linear-gradient(90deg, #00ccff, #7a1dd0)" }}
              >
                {currentWorkIndex === visitedWorks.length - 1 ? "Fine Visita" : "Prossima"} <ChevronRight size={16} />
              </button>
            )}
          </>
        )}
      </div>

      {/* Destra: Toggles Audio/Testo, Scrittura/Parla */}
      <div className="flex items-center gap-4">
        <div className="flex overflow-hidden rounded-full border border-white/15">
          <button 
            type="button" 
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold outline-none transition-colors ${playMode === 'read' ? 'bg-cyan-400 text-slate-900' : 'bg-transparent text-slate-400 hover:text-white'}`}
            onClick={() => setPlayMode('read')}
          >
            <BookOpen size={14} /> Leggi
          </button>
          <button 
            type="button" 
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold outline-none transition-colors ${playMode === 'listen' ? 'bg-cyan-400 text-slate-900' : 'bg-transparent text-slate-400 hover:text-white'}`}
            onClick={() => onSpeak(`Descrizione opera: ${currentWork?.description?.[0]?.description}`)}
          >
            <Volume2 size={14} /> Ascolta
          </button>
        </div>

        <div className="flex overflow-hidden rounded-full border border-white/15">
          <button 
            type="button" 
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold outline-none transition-colors ${inputMode === 'write' ? 'bg-cyan-400 text-slate-900' : 'bg-transparent text-slate-400 hover:text-white'}`}
            onClick={() => setInputMode('write')}
          >
            <Keyboard size={14} /> Scrivi
          </button>
          <button 
            type="button" 
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold outline-none transition-colors ${inputMode === 'speak' ? 'bg-cyan-400 text-slate-900' : 'bg-transparent text-slate-400 hover:text-white'}`}
            onClick={() => setInputMode('speak')}
          >
            <Mic size={14} /> Parla
          </button>
        </div>
      </div>

    </div>
  );
}