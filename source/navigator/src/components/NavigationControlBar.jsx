import React from 'react';
import { Lock, ChevronLeft, Play, ChevronRight, BookOpen, Volume2, Keyboard, Mic, QrCode } from 'lucide-react';

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
  isTeacher,
  currentLength,
  expertiseLevel,
  onShowJoinModal
}) {
  const currentWork = currentWorkIndex >= 0 ? visitedWorks[currentWorkIndex] : null;

  return (
    <div className="w-full shrink-0 bg-[#121218]/95 border-t border-white/10 flex flex-col md:flex-row items-center justify-between p-3 md:px-8 md:h-[120px] gap-3 md:gap-0 z-[999] backdrop-blur-md">

      {/* Sinistra: Dettagli Opera Corrente */}
      {/* w-full su mobile (centrato), w-[320px] su desktop (a sinistra) */}
      <div className="w-full md:w-[320px] flex flex-col items-center md:items-start text-center md:text-left">
        {currentWorkIndex >= 0 ? (
          <>
            <span className="inline-block px-2 py-0.5 bg-cyan-500 text-white text-[10px] font-bold rounded mb-1 tracking-wider">
              OPERA {currentWorkIndex + 1} DI {visitedWorks.length}
              {isSharedSession && !isTeacher && " (Sincro)"}
            </span>
            <h5 className="mb-0 truncate text-white text-[0.95rem] font-bold w-full">{currentWork?.name}</h5>
            <p className="mb-0 text-xs md:text-sm text-slate-400 truncate w-full">
              {currentWork?.authorName || 'Autore Sconosciuto'} {currentWork?.styleName ? `• ${currentWork.year}` : ''}
            </p>
          </>
        ) : (
          <>
            <span className="inline-block px-2 py-0.5 bg-slate-600 text-white text-[10px] font-bold rounded mb-1 tracking-wider">
              PANORAMICA
            </span>
            <h5 className="mb-0 text-white text-[0.95rem] font-bold">Navigazione Libera</h5>
            <p className="mb-0 text-xs md:text-sm text-slate-400">Seleziona un'opera per iniziare</p>
          </>
        )}
      </div>

      {/* Centro: Pulsanti Avanti/Indietro o Blocchi per studenti */}
      {/* w-full su mobile per sfruttare lo spazio, auto su desktop */}
      <div className="flex items-center justify-center gap-2 w-full md:w-auto">
        {isSharedSession && !isTeacher ? (
          <div className="flex items-center justify-center gap-2 px-4 md:px-5 py-2 md:py-2.5 bg-slate-800/80 border border-slate-700 rounded-full text-xs text-amber-400 font-semibold w-full md:w-auto">
            <Lock size={14} /> Controllata dal docente
          </div>
        ) : (
          <>
            <button 
              onClick={onPrev} 
              className="flex items-center justify-center gap-1 flex-1 md:flex-none md:min-w-[120px] px-3 md:px-4 py-2 border border-white/20 rounded-full text-white hover:bg-white/10 text-xs md:text-sm transition-colors disabled:opacity-50 cursor-pointer"
              disabled={currentWorkIndex < 0}
            >
              <ChevronLeft size={16} /> <span className="hidden sm:inline">Precedente</span>
            </button>
            
            {currentWorkIndex === -1 ? (
              <button 
                onClick={onStartVisit}
                className="flex items-center justify-center gap-1 flex-1 md:flex-none md:min-w-[140px] px-4 md:px-5 py-2 rounded-full text-white text-xs md:text-sm font-semibold border-none cursor-pointer"
                style={{ background: "linear-gradient(90deg, #00ccff, #7a1dd0)" }}
                disabled={visitedWorks.length === 0}
              >
                Inizia Visita <Play size={16} className="fill-white" />
              </button>
            ) : (
              <button 
                onClick={onNext} 
                className="flex items-center justify-center gap-1 flex-1 md:flex-none md:min-w-[140px] px-4 md:px-5 py-2 rounded-full text-white text-xs md:text-sm font-semibold border-none cursor-pointer"
                style={{ background: "linear-gradient(90deg, #00ccff, #7a1dd0)" }}
              >
                {currentWorkIndex === visitedWorks.length - 1 ? "Fine" : "Prossima"} <ChevronRight size={16} />
              </button>
            )}
          </>
        )}
      </div>

      {/* Destra: Toggles Audio/Testo, Scrittura/Parla */}
      {/* Su mobile rimpiccioliamo i padding per farceli stare senza scroll */}
      <div className="flex items-center justify-center gap-2 md:gap-4 w-full md:w-auto">
        <div className="flex overflow-hidden rounded-full border border-white/15 w-full md:w-auto">
          <button 
            type="button" 
            className={`flex-1 flex justify-center items-center gap-1.5 px-2 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-semibold outline-none transition-colors ${playMode === 'read' ? 'bg-cyan-400 text-slate-900' : 'bg-transparent text-slate-400 hover:text-white'} cursor-pointer`}
            onClick={() => setPlayMode('read')}
          >
            <BookOpen size={14} /> Leggi
          </button>
          <button 
            type="button" 
            className={`flex-1 flex justify-center items-center gap-1.5 px-2 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-semibold outline-none transition-colors ${playMode === 'listen' ? 'bg-cyan-400 text-slate-900' : 'bg-transparent text-slate-400 hover:text-white'} cursor-pointer`}
            onClick={() => onSpeak(`Descrizione opera: ${currentWork?.description?.[expertiseLevel]?.[currentLength]}`)}
          >
            <Volume2 size={14} /> Ascolta
          </button>
        </div>

        <div className="flex overflow-hidden rounded-full border border-white/15 w-full md:w-auto">
          <button 
            type="button" 
            className={`flex-1 flex justify-center items-center gap-1.5 px-2 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-semibold outline-none transition-colors ${inputMode === 'write' ? 'bg-cyan-400 text-slate-900' : 'bg-transparent text-slate-400 hover:text-white'} cursor-pointer`}
            onClick={() => setInputMode('write')}
          >
            <Keyboard size={14} /> Scrivi
          </button>
          <button 
            type="button" 
            className={`flex-1 flex justify-center items-center gap-1.5 px-2 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-semibold outline-none transition-colors ${inputMode === 'speak' ? 'bg-cyan-400 text-slate-900' : 'bg-transparent text-slate-400 hover:text-white'} cursor-pointer`}
            onClick={() => setInputMode('speak')}
          >
            <Mic size={14} /> Parla
          </button>
        </div>
      </div>

      {isSharedSession && isTeacher && (
          <button 
            onClick={onShowJoinModal}
            className="p-3 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-full hover:bg-purple-600/40 transition-colors"
            title="Mostra Codice Accesso"
          >
            <QrCode size={20} />
          </button>
        )}

    </div>
  );
}
