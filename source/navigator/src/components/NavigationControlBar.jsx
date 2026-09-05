import React from 'react';
import { ChevronLeft, Play, ChevronRight, BookOpen, Volume2, QrCode } from 'lucide-react';

export default function NavigationControlBar({
  currentWorkIndex, visitedWorks, onPrev, onNext, onEndVisit, onStartVisit,
  isSharedSession, isTeacher, onShowJoinModal, guide 
}) {
  const currentWork = currentWorkIndex >= 0 ? visitedWorks[currentWorkIndex] : null;

  return (
    <div className="w-full shrink-0 bg-[#121218]/95 border-t border-white/10 flex flex-col p-3 md:px-8 gap-3 z-[999] backdrop-blur-md">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-0 w-full">

        {/* Sinistra: Dettagli Opera */}
        <div className="w-full md:w-[320px] flex flex-col items-center md:items-start text-center md:text-left">
          {currentWorkIndex >= 0 ? (
            <>
              <span className="inline-block px-2 py-0.5 bg-cyan-500 text-white text-[10px] font-bold rounded mb-1 tracking-wider">
                OPERA {currentWorkIndex + 1} DI {visitedWorks.length}
                {isSharedSession && !isTeacher && " (Sincro)"}
              </span>
              <h5 className="mb-0 truncate text-white text-[0.95rem] font-bold w-full">{currentWork?.name}</h5>
            </>
          ) : (
            <>
              <span className="inline-block px-2 py-0.5 bg-slate-600 text-white text-[10px] font-bold rounded mb-1 tracking-wider">PANORAMICA</span>
              <h5 className="mb-0 text-white text-[0.95rem] font-bold">Navigazione Libera</h5>
            </>
          )}
        </div>

        {/* Centro: Pulsanti Avanti/Indietro */}
        <div className="flex items-center justify-center gap-2 w-full md:w-auto">
          {isSharedSession && !isTeacher ? null : (
            <>
              <button 
                onClick={onPrev} 
                disabled={currentWorkIndex < 0} 
                className="flex items-center justify-center gap-1 flex-1 md:flex-none md:min-w-[120px] px-3 md:px-4 py-2 border border-white/20 rounded-full text-white hover:bg-white/10 text-xs md:text-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                <ChevronLeft size={16} /> <span className="hidden sm:inline">Precedente</span>
              </button>
              {currentWorkIndex === -1 ? (
                <button 
                  onClick={onStartVisit} 
                  disabled={visitedWorks.length === 0} 
                  className="flex items-center justify-center gap-1 flex-1 md:flex-none md:min-w-[140px] px-4 md:px-5 py-2 rounded-full text-white text-xs md:text-sm font-semibold border-none cursor-pointer" 
                  style={{ background: "linear-gradient(90deg, #00ccff, #7a1dd0)" }}
                >
                  Inizia Visita <Play size={16} className="fill-white" />
                </button>
              ) : (
                <button 
                  onClick={currentWorkIndex === visitedWorks.length - 1 ? onEndVisit : onNext} 
                  className="flex items-center justify-center gap-1 flex-1 md:flex-none md:min-w-[140px] px-4 md:px-5 py-2 rounded-full text-white text-xs md:text-sm font-semibold border-none cursor-pointer" 
                  style={{ background: "linear-gradient(90deg, #00ccff, #7a1dd0)" }}
                >
                  {currentWorkIndex === visitedWorks.length - 1 ? "Fine" : "Prossima"} <ChevronRight size={16} />
                </button>
              )}
            </>
          )}
        </div>

        {/* Destra: Toggle Leggi/Ascolta + QR insegnante */}
        <div className="flex items-center justify-center gap-2 md:gap-4 w-full md:w-auto">
          <div className="flex overflow-hidden rounded-full border border-white/15 w-full md:w-auto">
            <button 
              type="button" 
              className={`flex-1 flex justify-center items-center gap-1.5 px-2 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-semibold outline-none transition-colors cursor-pointer ${guide.playMode === false ? 'bg-cyan-400 text-slate-900' : 'bg-transparent text-slate-400 hover:text-white'}`}
              onClick={() => guide.handleStopAudio()}
            >
              <BookOpen size={14} /> Leggi
            </button>
            <button 
              type="button" 
              className={`flex-1 flex justify-center items-center gap-1.5 px-2 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-semibold outline-none transition-colors cursor-pointer ${guide.playMode === true ? 'bg-cyan-400 text-slate-900' : 'bg-transparent text-slate-400 hover:text-white'}`}
              onClick={() => guide.speakText(currentWork?.description?.[guide.currentExpertise]?.[guide.currentLength])}
            >
              <Volume2 size={14} /> Ascolta
            </button>
          </div>

          {isSharedSession && isTeacher && (
            <button 
              onClick={onShowJoinModal} 
              className="p-2 md:p-3 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-full hover:bg-purple-600/40 transition-colors cursor-pointer"
            >
              <QrCode size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}