import { Play, Pause, Mic, X, Sparkles, RotateCcw, RotateCw, ChevronLeft, ChevronRight, User, Palette, Send, Loader2, BookOpen } from "lucide-react";
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
  onDragPointerUp,
  socket,
  roomCode,
  isSharedSession,
  isTeacher
}) {
  const { 
    playMode, currentExpertise, currentLength, audioProgressRatio, audioDuration,
    isListening, voiceToast, showFunFact,
    setCurrentExpertise, setCurrentLength,
    speakText, handleStopAudio, handlePauseAudio, handleResumeAudio, handleSeekAudio,
    startListening, handleMoreDesc, handleLessDesc, handleHigherExper, handleLowerExper,
    handleFunFact, handleAuthorBio, handleAuthorStudies, handleAuthorWorks, handleAboutStyle, handleParaphrase,
    processUserCommand, authorText, styleText, activeTab, setActiveTab, authorSubTab, setAuthorSubTab
  } = guide;

  // Notifica la dashboard dell'insegnante quando uno studente interagisce
  // tramite bottone. Il comando vocale è gestito internamente dall'hook
  // "guide" (che deve ricevere socket/roomCode) e non transita da qui.
  const sendInteraction = (query, interactionType = "button") => {
    if (isSharedSession && !isTeacher && socket && roomCode) {
      socket.emit("student_interaction", {
        roomCode,
        studentName: localStorage.getItem("student_name") || "Studente",
        interactionType,
        query,
      });
    }
  };

  // Agli studenti (in una sessione condivisa) nascondiamo la possibilità di
  // saltare autonomamente a un'altra opera: la navigazione la guida solo
  // l'insegnante, esattamente come già succede in NavigationControlBar.
  const canNavigate = !(isSharedSession && !isTeacher);

  // Estraiamo i dati dell'autore per mostrare il testo visivo corretto
  const currentMuseumId = localStorage.getItem('selected_museum_id');
  const authorDataList = work?.author?.data || work?.authorId?.data || [];
  const authorData = authorDataList.find(d => 
    d.museumId && d.museumId.some(m => (m._id ? m._id.toString() : m.toString()) === currentMuseumId)
  ) || authorDataList[0] || {};

  // TESTO DINAMICO IN BASE AL TAB E SUB-TAB
  let currentText = "";
  let sectionTitle = "Descrizione";

  if (activeTab === 'work') {
    currentText = work?.description?.[currentExpertise]?.[currentLength] || "";
    sectionTitle = "L'Opera";
  } else if (activeTab === 'author') {
    sectionTitle = "L'Autore";
    if (authorSubTab === 'studies') currentText = authorData?.studies || "Non ho informazioni sugli studi dell'autore.";
    else if (authorSubTab === 'works') currentText = authorData?.mainWorks || "Non ho informazioni sulle altre opere principali.";
    else currentText = authorData?.bio || `Mi dispiace, non ho una biografia dettagliata per ${work?.authorName || "questo autore"}.`;
  } else if (activeTab === 'style') {
    currentText = styleText;
    sectionTitle = "Lo Stile";
  }

  const totalWords = currentText.trim().split(/\s+/).filter(Boolean).length || 1;
  const audioSpeed = parseFloat(localStorage.getItem('audioSpeed')) || 1.0;
  const [isPaused, setIsPaused] = useState(false);
  const lastToggleClickRef = useRef(0);

  const totalDuration = audioDuration > 0 ? audioDuration : Math.max(1, Math.round(totalWords / (2.2 * audioSpeed)));

  // Stato interno che gestisce l'animazione fluida
  const [internalRatio, setInternalRatio] = useState(0);

  // Stati per l'inserimento testuale
  const [textCommand, setTextCommand] = useState("");
  const [isProcessingText, setIsProcessingText] = useState(false);

  // Azzera il tab quando si cambia opera
  useEffect(() => { setActiveTab('work'); }, [work]);

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
                {work.authorName || 'Autore sconosciuto'} • {work.year} {work.styleName ? `• ${work.styleName}` : ''}
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

                {(onPrev || onNext) && canNavigate && (
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        sendInteraction("Precedente");
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
                        sendInteraction("Successiva");
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

                {/* SELETTORE A SCHEDE (TABS) */}
                <div className="flex gap-1.5 bg-slate-900/50 p-1.5 border border-slate-800/80 rounded-2xl mb-2">
                  <button
                    type="button"
                    onClick={() => { setActiveTab('work'); sendInteraction("Apro Opera"); }}
                    className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${activeTab === 'work' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
                  >
                    <BookOpen size={14} /> Opera
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('author'); setAuthorSubTab('bio'); sendInteraction("Apro Autore"); }}
                    className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${activeTab === 'author' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
                  >
                    <User size={14} /> Autore
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('style'); sendInteraction("Apro Stile"); }}
                    className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${activeTab === 'style' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
                  >
                    <Palette size={14} /> Stile
                  </button>
                </div>
              </div>

              {/* COLONNA DESTRA */}
              <div className="md:col-span-7 flex flex-col mt-4 md:mt-0">
                <h6 className="text-white/50 uppercase tracking-wider mb-2 text-xs font-bold transition-all">
                  {sectionTitle}
                </h6>
                <p className="leading-relaxed text-slate-300 text-sm mb-5 max-h-40 md:max-h-52 overflow-y-auto custom-scrollbar pr-1 animate-fadeIn">
                  {currentText}
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

                {/* CONTROLLI DINAMICI IN BASE AL TAB */}
                <div className="flex flex-col gap-2.5">
                  
                  {/* PULSANTI OPERA */}
                  {activeTab === 'work' && (
                    <>
                      <div className="flex gap-2">
                        <button onClick={() => { sendInteraction("Dimmi di meno"); handleLessDesc(); }} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/40 hover:bg-slate-800 text-slate-300 py-2.5 transition-colors text-xs font-medium cursor-pointer">
                          Dimmi di meno
                        </button>
                        <button onClick={() => { sendInteraction("Dimmi di più"); handleMoreDesc(); }} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/40 hover:bg-slate-800 text-slate-300 py-2.5 transition-colors text-xs font-medium cursor-pointer">
                          Dimmi di più
                        </button>
                      </div>
                      <div className="flex gap-2 items-center">
                        <button onClick={() => { sendInteraction("Semplifica"); handleLowerExper(); }} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/40 hover:bg-slate-800 text-slate-300 py-2.5 transition-colors text-xs font-medium cursor-pointer">
                          Semplifica
                        </button>
                        <button onClick={() => { sendInteraction("Approfondisci"); handleHigherExper(); }} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/40 hover:bg-slate-800 text-slate-300 py-2.5 transition-colors text-xs font-medium cursor-pointer">
                          Approfondisci
                        </button>
                      </div>
                    </>
                  )}

                  {/* PULSANTI AUTORE */}
                  {activeTab === 'author' && (
                    <>
                      <div className="flex gap-2">
                        <button onClick={() => { sendInteraction("Chi è l'artista?"); handleAuthorBio(); }} className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2.5 transition-colors text-xs font-medium cursor-pointer ${authorSubTab === 'bio' ? 'bg-amber-600/30 text-amber-400 border-amber-600/50' : 'bg-slate-800/40 hover:bg-slate-800 text-slate-300'}`}>
                          Chi è?
                        </button>
                        <button onClick={() => { sendInteraction("Dove ha studiato?"); handleAuthorStudies(); }} className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2.5 transition-colors text-xs font-medium cursor-pointer ${authorSubTab === 'studies' ? 'bg-amber-600/30 text-amber-400 border-amber-600/50' : 'bg-slate-800/40 hover:bg-slate-800 text-slate-300'}`}>
                          Studi
                        </button>
                      </div>
                      <div className="flex gap-2 items-center">
                        <button onClick={() => { sendInteraction("Opere principali"); handleAuthorWorks(); }} className={`w-full flex items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2.5 transition-colors text-xs font-medium cursor-pointer ${authorSubTab === 'works' ? 'bg-amber-600/30 text-amber-400 border-amber-600/50' : 'bg-slate-800/40 hover:bg-slate-800 text-slate-300'}`}>
                          Altre opere principali
                        </button>
                      </div>
                    </>
                  )}

                  {/* BARRA DI TESTO E MICROFONO (Sempre visibili e compattati in una riga) */}
                  <div className="flex gap-2 items-center mt-1">
                    <div className="relative flex-1">
                      <input 
                        type="text" 
                        value={textCommand}
                        onChange={(e) => setTextCommand(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter' && textCommand.trim()) {
                            setIsProcessingText(true);
                            await processUserCommand(textCommand);
                            setIsProcessingText(false);
                            setTextCommand('');
                          }
                        }}
                        placeholder="Chiedi qualcosa..." 
                        className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-inner transition-colors"
                      />
                      <button 
                        type="button"
                        onClick={async () => {
                          if (textCommand.trim()) {
                            setIsProcessingText(true);
                            await processUserCommand(textCommand);
                            setIsProcessingText(false);
                            setTextCommand('');
                          }
                        }}
                        disabled={isProcessingText || !textCommand.trim()}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer"
                      >
                        {isProcessingText ? <Loader2 size={16} className="animate-spin text-white" /> : <Send size={16} />}
                      </button>
                    </div>
                    <button
                      onClick={startListening}
                      className="w-[46px] h-[46px] flex items-center justify-center rounded-xl transition-all duration-300 shrink-0 cursor-pointer"
                      style={{ 
                        backgroundColor: isListening ? "#ef4444" : "rgba(255,255,255,0.08)", 
                        color: isListening ? "white" : "#cbd5e1", 
                        boxShadow: isListening ? "0 0 15px rgba(239, 68, 68, 0.6)" : "none" 
                      }}
                      title="Comandi vocali"
                    >
                      <Mic size={20} />
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