import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Play, Pause, Mic, X, Sparkles, RotateCcw, RotateCw, ChevronLeft, ChevronRight, User, Palette } from "lucide-react";
import { API_BASE_URL } from "../config";

export default function WorkDetailsSheet({ 
  work, 
  onClose, 
  onSpeak, 
  onPauseAudio,
  onResumeAudio,
  onStopAudio, 
  onSeekAudio, 
  audioProgressRatio = 0,
  audioDuration = 0,
  onPrev, 
  onNext, 
  hasPrev, 
  hasNext, 
  commandsMap, 
  currentExpertise, 
  setCurrentExpertise, 
  currentLength, 
  setCurrentLength, 
  socket, 
  roomCode, 
  isSharedSession, 
  isTeacher, 
  playMode 
}) {
  const [dragStartY, setDragStartY] = useState(null);
  const [dragCurrentY, setDragCurrentY] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [showFunFact, setShowFunFact] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // STATO PER IL POP-UP BIANCO
  const [voiceToast, setVoiceToast] = useState("");
  const toastTimeoutRef = useRef(null);

  const recognitionRef = useRef(null);
  const lastToggleClickRef = useRef(0);

  const lengthLevels = ["short", "medium", "long", "exhaustive"];
  const expertiseLevels = ["simple", "medium", "professional", "expert"];

  // STATO INTERNO DEL PLAYER AUDIO (Durata, Posizione in secondi e Play/Pausa reale)
  const currentText = work?.description?.[currentExpertise]?.[currentLength] || "";
  const totalWords = currentText.trim().split(/\s+/).filter(Boolean).length || 1;
  const audioSpeed = parseFloat(localStorage.getItem('audioSpeed')) || 1.0;
  
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
      if (onPauseAudio) onPauseAudio();
    } else {
      // Controlla lo stato nativo del browser invece della variabile locale
      if (window.speechSynthesis.paused) {
        if (onResumeAudio) onResumeAudio();
      } else {
        if (currentText) onSpeak(currentText);
      }
    }
  };

  const handlePlayerClose = () => {
    if (onStopAudio) onStopAudio();
    setIsPaused(false);
  };

  const handleSeek = (seconds) => {
    if (!currentText) return;
    if (onSeekAudio) onSeekAudio(seconds);
    if (isPaused) setIsPaused(false);
  };

  const handlePointerDown = (e) => {
    if (window.innerWidth >= 768) return;
    setDragStartY(e.clientY);
    e.target.setPointerCapture(e.pointerId); 
  };

  const handlePointerMove = (e) => {
    if (!dragStartY) return;
    const delta = e.clientY - dragStartY;
    if (delta > 0) setDragCurrentY(delta); 
  };
  
  const handlePointerUp = (e) => {
    if (!dragStartY) return;
    if (dragCurrentY > 100) {
      handlePlayerClose();
      onClose();
    }
    setDragStartY(null);
    setDragCurrentY(0);
    e.target.releasePointerCapture(e.pointerId);
  };

  const handleMoreDesc = () => {
    const currentIndex = lengthLevels.indexOf(currentLength);
    if (currentIndex < lengthLevels.length - 1) {
      const nextLength = lengthLevels[currentIndex + 1];
      const textToSpeak = work?.description?.[currentExpertise]?.[nextLength];
      if (textToSpeak) {
        setCurrentLength(nextLength);
        if (playMode) onSpeak(textToSpeak);
      }
    }
  };

  const handleLessDesc = () => {
    const currentIndex = lengthLevels.indexOf(currentLength);
    if (currentIndex > 0) {
      const prevLength = lengthLevels[currentIndex - 1];
      const textToSpeak = work?.description?.[currentExpertise]?.[prevLength];
      if (textToSpeak) {
        setCurrentLength(prevLength);
        if (playMode) onSpeak(textToSpeak);
      }
    }
  };

  const handleHigherExper = () => {
    const currentIndex = expertiseLevels.indexOf(currentExpertise);
    if (currentIndex < expertiseLevels.length - 1) {
      const nextExpertise = expertiseLevels[currentIndex + 1];
      const textToSpeak = work?.description?.[nextExpertise]?.[currentLength];
      if (textToSpeak) {
        setCurrentExpertise(nextExpertise);
        if (playMode) onSpeak(textToSpeak);
      }
    }
  };

  const handleLowerExper = () => {
    const currentIndex = expertiseLevels.indexOf(currentExpertise);
    if (currentIndex > 0) {
      const prevExpertise = expertiseLevels[currentIndex - 1];
      const textToSpeak = work?.description?.[prevExpertise]?.[currentLength];
      if (textToSpeak) {
        setCurrentExpertise(prevExpertise);
        if (playMode) onSpeak(textToSpeak);
      }
    }
  };

  const handleFunFact = () => {
    if (work?.funFact) {
      setShowFunFact(true);
      if (playMode) onSpeak(`Ecco una curiosità su quest'opera: ${work.funFact}`);
    } else {
      onSpeak(`Mi dispiace, ma non ho curiosità extra registrate per quest'opera.`);
    }
  };

  const handleAboutAuthor = () => {
    const authorName = work?.authorName || "Autore non specificato";
    const authorBio = work?.authorBio || work?.authorDescription;
    const speech = authorBio 
      ? `L'opera è stata realizzata da ${authorName}. ${authorBio}`
      : `Quest'opera è attribuita a ${authorName}, maestro attivo nel periodo di creazione dell'opera.`;
    onSpeak(speech);
  };

  const handleAboutStyle = () => {
    const styleName = work?.styleName || "Stile non specificato";
    const styleDesc = work?.styleDescription;
    const speech = styleDesc
      ? `Quest'opera appartiene alla corrente ${styleName}. ${styleDesc}`
      : `L'opera è un esempio significativo dello stile ${styleName}, caratteristico dell'epoca ${work?.year || ''}.`;
    onSpeak(speech);
  };

  // Funzione che mostra il pop-up a schermo per 2 secondi
  const triggerToast = (text) => {
    console.log("[MIC TOAST]", text);
    setVoiceToast(text);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setVoiceToast("");
    }, 2000);
  };

  // GESTORE RICONOSCIMENTO VOCALE
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Il browser non supporta il microfono.");
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (err) {}
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = 'it-IT';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log("[MIC] In ascolto...");
      setIsListening(true);
      handlePlayerClose();
      triggerToast("In ascolto...");
    };

    recognition.onresult = async (event) => {
      const phrase = event.results[0][0].transcript.trim().toLowerCase();
      console.log("[MIC] Frase intercettata:", phrase);
      
      // Mostra a schermo esattamente quello che ha capito
      triggerToast(`"${phrase}"`);

      if (isSharedSession && !isTeacher && socket && roomCode) {
        socket.emit('student_interaction', {
          roomCode,
          studentName: localStorage.getItem('student_name') || 'Studente',
          interactionType: 'voice',
          query: phrase
        });
      }

      // Mappatura comandi vocali sui tasti
      if (phrase.includes("approfondisci") || phrase.includes("spiega meglio") || phrase.includes("più difficile") || phrase.includes("più tecnico")) {
        handleHigherExper();
      } else if (phrase.includes("semplifica") || phrase.includes("più facile") || phrase.includes("parla semplice") || phrase.includes("più semplice")) {
        handleLowerExper();
      } else if (phrase.includes("dimmi di più") || phrase.includes("più lunga") || phrase.includes("continua") || phrase.includes("estendi")) {
        handleMoreDesc();
      } else if (phrase.includes("dimmi di meno") || phrase.includes("più corta") || phrase.includes("riassumi") || phrase.includes("meno")) {
        handleLessDesc();
      } else if (phrase.includes("ascolta") || phrase.includes("leggi") || phrase.includes("riproduci") || phrase.includes("play")) {
        onSpeak(work?.description?.[currentExpertise]?.[currentLength]);
      } else if (phrase.includes("ferma") || phrase.includes("stop") || phrase.includes("pausa") || phrase.includes("silenzio")) {
        handlePlayerClose();
      } else if (phrase.includes("curiosità") || phrase.includes("aneddoto")) {
        handleFunFact();
      } else if (phrase.includes("autore") || phrase.includes("chi l'ha fatto")) {
        handleAboutAuthor();
      } else if (phrase.includes("stile") || phrase.includes("corrente")) {
        handleAboutStyle();
      } else {
        let mapped = commandsMap ? commandsMap[phrase.replace(/\.$/, '')] : null;
        if (mapped === "PLAY") onSpeak(work?.description?.[currentExpertise]?.[currentLength]);
      }
    };

    recognition.onerror = (e) => {
      console.warn("[MIC] Errore:", e.error);
      setIsListening(false);
      triggerToast("Non ho capito, riprova");
    };

    recognition.onend = () => {
      console.log("[MIC] Fine ascolto");
      setIsListening(false);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("[MIC] Errore start:", e);
      setIsListening(false);
    }
  };

  useEffect(() => {
    if (!work) {
      setDragCurrentY(0);
    }
    setCurrentLength("medium");
    setShowFunFact(false);
    handlePlayerClose();
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
    };
  }, [work]);

  return (
    <>
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
        <div 
          onClick={() => {
            handlePlayerClose();
            onClose();
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10001] transition-opacity duration-300"
        />
      )}

      <div 
        className="fixed bottom-0 left-0 right-0 md:inset-x-0 md:mx-auto md:bottom-6 md:max-w-3xl lg:max-w-4xl w-full bg-[#121218] rounded-t-3xl md:rounded-3xl p-0 z-[10002] shadow-[0_-4px_30px_rgba(0,0,0,0.7)] md:shadow-[0_20px_60px_rgba(0,0,0,0.9)] md:border md:border-slate-800/80 text-white flex flex-col max-h-[88vh] md:max-h-[82vh]"
        style={{
          transform: work ? `translateY(${dragCurrentY}px)` : "translateY(100%)",
          transition: dragStartY ? "none" : "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        }}
      >
        {work && (
          <>
            {/* HEADER */}
            <div 
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
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
            <div className="px-6 md:px-8 pb-6 md:pb-8 overflow-y-auto custom-scrollbar flex-1">
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
    </>
  );
}