import { Play, Pause, Mic, X, Sparkles, RotateCcw, RotateCw, ChevronLeft, ChevronRight, User, Palette } from "lucide-react";
import { useState, useEffect, useRef } from "react"; 
import { createPortal } from "react-dom";

export default function WorkDetailsContent({
  work,
  guide, // L'oggetto restituito da useWorkGuide
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onClose, // Opzionale, per chiudere il popup se presente
  onDragPointerDown,
  onDragPointerMove,
  onDragPointerUp
}) {
  const { 
    playMode, currentExpertise, currentLength, audioProgressRatio, audioDuration,
    isListening, voiceToast, showFunFact,
    setCurrentExpertise, setCurrentLength,
    speakText, handleStopAudio, handlePauseAudio, handleResumeAudio, handleSeekAudio,
    startListening, handleMoreDesc, handleLessDesc, handleHigherExper, handleLowerExper,
    handleFunFact, handleAboutAuthor, handleAboutStyle
  } = guide;
  
  // STATO INTERNO DEL PLAYER AUDIO (Durata, Posizione in secondi e Play/Pausa reale)
  const currentText = work?.description?.[currentExpertise]?.[currentLength] || "";
  const totalWords = currentText.trim().split(/\s+/).filter(Boolean).length || 1;
  const audioSpeed = parseFloat(localStorage.getItem('audioSpeed')) || 1.0;
  const [isPaused, setIsPaused] = useState(false);
  const lastToggleClickRef = useRef(0);

  const totalDuration = audioDuration > 0 ? audioDuration : Math.max(1, Math.round(totalWords / (2.2 * audioSpeed)));

  // Stato interno che gestisce l'animazione fluida
  const [internalRatio, setInternalRatio] = useState(0);

  // 1. Allinea il timer interno immediatamente quando il padre invia un salto (-5s/+5s) o un onboundary
  useEffect(() => {
    setInternalRatio(audioProgressRatio);
  }, [audioProgressRatio]);

  // 2. Azzera l'animazione al cambio opera o testo
  useEffect(() => {
    setInternalRatio(0);
  }, [work, currentExpertise, currentLength]);

  // 3. Motore fluido: avanza in autonomia partendo dall'ultimo ratio noto se l'audio è in play
  useEffect(() => {
    let timer = null;
    if (playMode && totalDuration > 0) {
      timer = setInterval(() => {
        setInternalRatio(prev => {
          const step = 0.1 / totalDuration;
          return Math.min(1, prev + step);
        });
      }, 100);
    }
    return () => clearInterval(timer);
  }, [playMode, totalDuration]);

  // Calcoli UI finali
  const progressRatio = Math.max(0, Math.min(1, internalRatio));
  const currentTime = Math.min(totalDuration, Math.round(progressRatio * totalDuration));
  const progressPercentage = (progressRatio * 100).toFixed(1);

  useEffect(() => {
    if (!playMode && !isPaused) {
      setIsPaused(false);
    }
  }, [playMode, isPaused]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleTogglePlayPause = () => {
    const now = Date.now();
    if (now - lastToggleClickRef.current < 250) return;
    lastToggleClickRef.current = now;

    if (playMode) {
      handlePauseAudio(internalRatio);
    } else {
      // Se avevamo interrotto la riproduzione, passiamo il ratio per riprendere da lì
      if (internalRatio > 0 && internalRatio < 1) {
        handleResumeAudio(internalRatio);
      } else {
        if (currentText) speakText(currentText);
      }
    }
  };

  const handlePlayerClose = () => {
    handleStopAudio();
    setIsPaused(false);
  };

  const handleSeek = (seconds) => {
    if (!currentText) return;
    // Passiamo l'internalRatio per informare MapView dell'esatta posizione grafica
    handleSeekAudio(seconds, internalRatio);
    if (isPaused) setIsPaused(false);
  };

  return (
    <div className="flex flex-col h-full w-full min-h-0 overflow-hidden">
      {/* POP-UP TELETRASPORTATO DIRETTAMENTE IN DOCUMENT.BODY VIA REACT PORTAL */}
      {voiceToast && typeof document !== "undefined" && createPortal(
        <div 
          style={{ zIndex: 999999 }} 
          className="fixed top-6 left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-200 ease-out animate-in fade-in zoom-in-95"
        >
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
            <div className={`w-3 h-3 rounded-full ${isListening ? "bg-red-500 animate-ping" : "bg-amber-500"}`} />
            <Mic size={18} className={isListening ? "text-red-500" : "text-amber-600"} />
            <span className="text-sm font-bold tracking-tight text-slate-900">
              {voiceToast}
            </span>
          </div>
        </div>,
        document.body
      )}

      {work && (
        <>
          {/* HEADER */}
          <div 
            onPointerDown={onDragPointerDown}
            onPointerMove={onDragPointerMove}
            onPointerUp={onDragPointerUp}
            onPointerCancel={onDragPointerUp}
            className="pt-5 pb-2 px-6 md:px-8 cursor-grab md:cursor-default touch-none relative shrink-0"
          >
            <div className="w-10 h-1.5 bg-white/20 rounded-full mx-auto mb-4 md:hidden" />
            
            <button 
              onClick={() => {
                handlePlayerClose();
                onClose();
              }}
              className="absolute top-4 right-5 md:top-5 md:right-6 w-9 h-9 flex items-center justify-center rounded-full border border-slate-700 bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer z-10"
              title="Chiudi dettagli"
            >
              <X size={18} />
            </button>

            <div className="pr-10">
              <h3 className="font-extrabold text-xl md:text-2xl mb-1 text-white leading-tight">{work.name}</h3>
              <p className="text-amber-500 font-semibold m-0 text-xs md:text-sm">
                {work.authorName || 'Autore Sconosciuto'} • {work.year} {work.styleName ? `• ${work.styleName}` : ''}
              </p>
            </div>
          </div>

          {/* CORPO */}
          <div className="px-6 md:px-8 pb-6 md:pb-8 overflow-y-auto custom-scrollbar flex-1 min-h-0">
            <div className="md:grid md:grid-cols-12 md:gap-8 items-start mt-2">
              
              {/* COLONNA SINISTRA */}
              <div className="md:col-span-5 flex flex-col gap-4">
                <div className="w-full bg-slate-950/80 border border-slate-800/60 rounded-2xl overflow-hidden flex items-center justify-center p-1.5 shadow-inner">
                  <img 
                    src={work.image} 
                    alt={work.name} 
                    className="w-full h-52 sm:h-64 md:h-72 object-contain rounded-xl" 
                  />
                </div>

                {(onPrev || onNext) && (
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        handlePlayerClose();
                        if (onPrev) onPrev();
                      }}
                      disabled={!hasPrev}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800/80 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none rounded-xl text-slate-200 text-xs font-bold border border-slate-700/80 active:scale-95 transition-all cursor-pointer shadow-sm"
                    >
                      <ChevronLeft size={16} /> Precedente
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handlePlayerClose();
                        if (onNext) onNext();
                      }}
                      disabled={!hasNext}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800/80 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none rounded-xl text-slate-200 text-xs font-bold border border-slate-700/80 active:scale-95 transition-all cursor-pointer shadow-sm"
                    >
                      Successiva <ChevronRight size={16} />
                    </button>
                  </div>
                )}

                {/* PULSANTI: AUTORE E STILE */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAboutAuthor}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl text-amber-400 hover:text-amber-300 text-xs font-semibold active:scale-95 transition-all cursor-pointer"
                  >
                    <User size={14} /> Autore
                  </button>
                  <button
                    type="button"
                    onClick={handleAboutStyle}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl text-amber-400 hover:text-amber-300 text-xs font-semibold active:scale-95 transition-all cursor-pointer"
                  >
                    <Palette size={14} /> Stile
                  </button>
                </div>
              </div>

              {/* COLONNA DESTRA */}
              <div className="md:col-span-7 flex flex-col mt-4 md:mt-0">
                <h6 className="text-white/50 uppercase tracking-wider mb-2 text-xs font-bold">Descrizione</h6>
                <p className="leading-relaxed text-slate-300 text-sm mb-5 max-h-40 md:max-h-52 overflow-y-auto custom-scrollbar pr-1">
                  {currentText || "Nessuna descrizione disponibile per quest'opera."}
                </p>

                {showFunFact && work?.funFact && (
                  <div className="mb-5 p-4 bg-gradient-to-r from-amber-500/10 to-orange-600/10 border border-amber-500/30 rounded-2xl animate-fadeIn">
                    <h6 className="text-amber-400 uppercase tracking-wider mb-1.5 text-xs font-bold flex items-center gap-2">
                      <Sparkles size={14} /> Curiosità
                    </h6>
                    <p className="leading-relaxed text-amber-50 text-xs md:text-sm">
                      {work.funFact}
                    </p>
                  </div>
                )}

                {/* AUDIO PLAYER */}
                <div className="bg-[#181820] border border-slate-800 rounded-2xl md:rounded-3xl p-3.5 md:p-4 mb-4 shadow-xl flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-3 bg-slate-900/90 border border-slate-800/80 px-4 py-2.5 rounded-full">
                      <span className="text-xs font-mono font-bold text-slate-300 select-none">
                        {formatTime(currentTime)}
                      </span>
                      
                      <div className="relative flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500 rounded-full transition-all duration-100 ease-out"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>

                      <span className="text-xs font-mono font-bold text-slate-400 select-none">
                        {formatTime(totalDuration)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handlePlayerClose}
                      className="w-10 h-10 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-95 cursor-pointer shrink-0"
                      title="Interrompi audio"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleSeek(-5)}
                      className="h-12 md:h-14 bg-slate-900/90 hover:bg-slate-800/80 border border-slate-800 text-slate-300 rounded-xl md:rounded-2xl flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all cursor-pointer"
                      title="Indietro di 5 secondi"
                    >
                      <RotateCcw size={16} />
                      <span className="text-[10px] font-semibold tracking-wider">-5s</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTogglePlayPause}
                      className="h-12 md:h-14 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-500 rounded-xl md:rounded-2xl flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-lg shadow-amber-500/5"
                      title={playMode ? "Pausa" : "Riproduci"}
                    >
                      {playMode ? (
                        <Pause size={22} className="fill-amber-500" />
                      ) : (
                        <Play size={22} className="fill-amber-500 ml-1" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSeek(5)}
                      className="h-12 md:h-14 bg-slate-900/90 hover:bg-slate-800/80 border border-slate-800 text-slate-300 rounded-xl md:rounded-2xl flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all cursor-pointer"
                      title="Avanti di 5 secondi"
                    >
                      <RotateCw size={16} />
                      <span className="text-[10px] font-semibold tracking-wider">+5s</span>
                    </button>
                  </div>
                </div>

                {/* CONTROLLI LUNGHEZZA, DIFFICOLTÀ E VOCALE */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex gap-2">
                    <button
                      onClick={handleLessDesc}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/40 hover:bg-slate-800 text-slate-300 py-2.5 transition-colors text-xs font-medium cursor-pointer"
                    >
                      Dimmi di meno
                    </button>
                    <button
                      onClick={handleMoreDesc}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/40 hover:bg-slate-800 text-slate-300 py-2.5 transition-colors text-xs font-medium cursor-pointer"
                    >
                      Dimmi di più
                    </button>
                  </div>

                  <div className="flex gap-2 items-center">
                    <button
                      onClick={handleLowerExper}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/40 hover:bg-slate-800 text-slate-300 py-2.5 transition-colors text-xs font-medium cursor-pointer"
                    >
                      Semplifica
                    </button>
                    <button
                      onClick={handleHigherExper}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/40 hover:bg-slate-800 text-slate-300 py-2.5 transition-colors text-xs font-medium cursor-pointer"
                    >
                      Approfondisci
                    </button>
                    <button
                      onClick={startListening}
                      className="w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-300 shrink-0 cursor-pointer"
                      style={{ 
                        backgroundColor: isListening ? "#ef4444" : "rgba(255,255,255,0.08)",
                        color: isListening ? "white" : "#cbd5e1",
                        boxShadow: isListening ? "0 0 15px rgba(239, 68, 68, 0.6)" : "none"
                      }}
                      title="Comandi vocali: 'dimmi di più', 'semplifica', ecc."
                    >
                      <Mic size={18} />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </>
      )}
      
    </div>
  );
}