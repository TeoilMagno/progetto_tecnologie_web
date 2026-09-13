import React from 'react';
import { ChevronLeft, Play, ChevronRight, BookOpen, Volume2, QrCode, Activity } from 'lucide-react';

export default function NavigationControlBar({
  currentWorkIndex, visitedWorks, onPrev, onNext, onEndVisit, onStartVisit,
  isSharedSession, isTeacher, onShowJoinModal, onShowTeacherDashboard, guide, onReturnToCurrentWork
}) {
  const currentWork = currentWorkIndex >= 0 ? visitedWorks[currentWorkIndex] : null;

  return (
    <div className="w-full shrink-0 overflow-x-hidden bg-[#09090b]/90 border-t border-slate-800 flex flex-col p-3 md:px-6 gap-3 z-[999] backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 w-full">

        {/* Sinistra: Dettagli Opera */}
        <div className="w-full md:flex-1 md:min-w-[200px] md:max-w-[320px] flex flex-col items-center md:items-start text-center md:text-left">
          {currentWorkIndex >= 0 ? (
            <>
              <span className="inline-block px-2 py-0.5 md:px-2.5 md:py-1 bg-slate-800/80 border border-slate-700 text-cyan-400 text-[10px] font-extrabold rounded-lg mb-1 tracking-widest uppercase">
                Opera {currentWorkIndex + 1} di {visitedWorks.length}
                {isSharedSession && !isTeacher && " (Sincro)"}
              </span>
              <h5 className="mb-0 truncate text-white text-[0.95rem] md:text-base font-extrabold w-full">{currentWork?.name}</h5>
            </>
          ) : (
            <>
              <span className="inline-block px-2 py-0.5 md:px-2.5 md:py-1 bg-slate-800/80 border border-slate-700 text-slate-300 text-[10px] font-extrabold rounded-lg mb-1 tracking-widest uppercase">
                Panoramica
              </span>
              <h5 className="mb-0 text-white text-[0.95rem] md:text-base font-extrabold">Navigazione Libera</h5>
            </>
          )}
        </div>

        {/* Centro: Pulsanti Avanti/Indietro */}
        <div className="flex items-center justify-center gap-2 w-full md:w-auto md:flex-none">
          {isSharedSession && !isTeacher ? null : (
            <>
              <button 
                onClick={onPrev} 
                disabled={currentWorkIndex < 0} 
                className="flex items-center justify-center gap-1.5 flex-1 md:flex-none md:min-w-[120px] px-3.5 py-2.5 border border-slate-700 bg-slate-800/50 hover:bg-slate-700 rounded-xl text-slate-300 text-xs md:text-sm font-bold transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95 cursor-pointer shadow-sm"
              >
                <ChevronLeft size={16} /> <span className="hidden sm:inline">Precedente</span>
              </button>
              
              {currentWorkIndex === -1 ? (
                <button 
                  onClick={onStartVisit} 
                  disabled={visitedWorks.length === 0} 
                  className="flex items-center justify-center gap-1.5 flex-1 md:flex-none md:min-w-[140px] px-4 py-2.5 rounded-xl text-white text-xs md:text-sm font-bold transition-all active:scale-95 shadow-lg shadow-cyan-900/20 cursor-pointer bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 disabled:pointer-events-none"
                >
                  Inizia Visita <Play size={16} className="fill-white ml-0.5" />
                </button>
              ) : (
                <button 
                  onClick={currentWorkIndex === visitedWorks.length - 1 ? onEndVisit : onNext} 
                  className="flex items-center justify-center gap-1.5 flex-1 md:flex-none md:min-w-[140px] px-4 py-2.5 rounded-xl text-white text-xs md:text-sm font-bold transition-all active:scale-95 shadow-lg shadow-cyan-900/20 cursor-pointer bg-cyan-600 hover:bg-cyan-500"
                >
                  {currentWorkIndex === visitedWorks.length - 1 ? "Fine" : "Prossima"} <ChevronRight size={16} />
                </button>
              )}
            </>
          )}
        </div>

        {/* Destra: Toggle Leggi/Ascolta + QR insegnante + Radar */}
        <div className="flex items-center justify-center md:justify-end gap-2.5 w-full md:w-auto md:flex-1">
          <div className="flex p-1 bg-slate-900/80 border border-slate-800 rounded-2xl w-full md:w-auto shadow-inner">
            <button 
              type="button" 
              className={`flex-1 flex justify-center items-center gap-1.5 px-3 py-1.5 md:py-2 rounded-xl text-[10px] md:text-xs font-bold transition-all cursor-pointer ${guide.preferAudio === false ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
              onClick={() => {
                onReturnToCurrentWork?.();
                guide.setPreferAudio(false);
                guide.handleStopAudio();
              }}
            >
              <BookOpen size={14} /> <span className="hidden sm:inline">Leggi</span>
            </button>
            <button 
              type="button" 
              className={`flex-1 flex justify-center items-center gap-1.5 px-3 py-1.5 md:py-2 rounded-xl text-[10px] md:text-xs font-bold transition-all cursor-pointer ${guide.preferAudio === true ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
              onClick={() => {
                onReturnToCurrentWork?.();
                guide.setPreferAudio(true);
                guide.speakText(currentWork?.description?.[guide.currentExpertise]?.[guide.currentLength]);
              }}
            >
              <Volume2 size={14} /> <span className="hidden sm:inline">Ascolta</span>
            </button>
          </div>

          {isSharedSession && isTeacher && (
            <>
              <button 
                onClick={onShowTeacherDashboard} 
                className="flex items-center gap-1.5 px-3 py-1.5 md:py-2 bg-purple-600 hover:bg-purple-500 border border-purple-400/50 rounded-xl text-white text-[10px] md:text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm animate-pulse"
                title="Radar Classe"
              >
                <Activity size={16} /> <span className="hidden xl:inline">Radar</span>
              </button>
              <button 
                onClick={onShowJoinModal} 
                className="p-2.5 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-xl hover:bg-purple-500/20 transition-all active:scale-95 cursor-pointer shadow-sm"
                title="Mostra codice stanza"
              >
                <QrCode size={18} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}