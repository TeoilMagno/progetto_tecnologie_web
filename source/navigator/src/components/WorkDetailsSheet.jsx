import { useState, useEffect, useRef } from "react";
import { Play, Pause, Mic, X, Sparkles, RotateCcw, RotateCw, ChevronLeft, ChevronRight } from "lucide-react";
import { API_BASE_URL } from "../config";

export default function WorkDetailsSheet({ 
  work, 
  onClose, 
  onSpeak, 
  onStopAudio,
  onSeekAudio,
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

  // --- STATO PLAYER AUDIO ---
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const timerRef = useRef(null);

  const lengthLevels = ["short", "medium", "long", "exhaustive"];
  const expertiseLevels = ["simple", "medium", "professional", "expert"];

  const currentText = work?.description?.[currentExpertise]?.[currentLength] || "";
  const audioSpeed = parseFloat(localStorage.getItem('audioSpeed')) || 1.0;
  const totalDuration = Math.max(1, Math.round(currentText.length / (15 * audioSpeed)));

  useEffect(() => {
    if (playMode && !isPaused) {
      timerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            clearInterval(timerRef.current);
            return totalDuration;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [playMode, isPaused, totalDuration]);

  useEffect(() => {
    if (!playMode) {
      setCurrentTime(0);
      setIsPaused(false);
    }
  }, [playMode]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleTogglePlayPause = () => {
    if (!playMode) {
      setCurrentTime(0);
      setIsPaused(false);
      if (currentText) onSpeak(currentText);
    } else if (playMode && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    } else if (playMode && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  };

  const handlePlayerClose = () => {
    window.speechSynthesis.cancel();
    if (onStopAudio) onStopAudio();
    setIsPaused(false);
    setCurrentTime(0);
  };

  const handleSeek = (seconds) => {
    if (!playMode && !currentText) return;

    if (!playMode) {
      onSpeak(currentText);
      return;
    }

    setCurrentTime((prev) => Math.max(0, Math.min(totalDuration, prev + seconds)));
    if (onSeekAudio) onSeekAudio(seconds);
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  };

  const handlePointerDown = (e) => {
    // Il drag verso il basso è attivo solo su mobile
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
        if (playMode) {
          setCurrentTime(0);
          onSpeak(textToSpeak);
        }
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
        if (playMode) {
          setCurrentTime(0);
          onSpeak(textToSpeak);
        }
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
        if (playMode) {
          setCurrentTime(0);
          onSpeak(textToSpeak);
        }
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
        if (playMode) {
          setCurrentTime(0);
          onSpeak(textToSpeak);
        }
      }
    }
  };

  const handleFunFact = () => {
    if (work?.funFact) {
      setShowFunFact(true);
      if (playMode) onSpeak(`ecco una curiosità su quest'opera: ${work.funFact}`);
    } else {
      onSpeak(`mi dispiace ma non ho curiosità interessanti riguardanti quest'opera`);
    }
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Il tuo browser non supporta i comandi vocali.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      handlePlayerClose();
      window.speechSynthesis.cancel(); 
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();

      if (isSharedSession && !isTeacher && socket && roomCode) {
        socket.emit('student_interaction', {
          roomCode,
          studentName: localStorage.getItem('student_name') || 'Studente',
          interactionType: 'voice',
          query: transcript
        });
      }

      const cleanTranscript = transcript.replace(/\.$/, ''); 
      let action = commandsMap ? commandsMap[cleanTranscript] : null;

      if (!action) {
        setIsListening(true);
        try {
          const aiResponse = await fetch(`${API_BASE_URL}/ai/map-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: transcript })
          });
          const aiData = await aiResponse.json();
          action = aiData.mappedAction;
        } catch (error) {
          action = "UNKNOWN";
        }
      }

      switch (action) {
        case "PLAY":
          setCurrentTime(0);
          onSpeak(work?.description?.[currentExpertise]?.[currentLength]);
          break;
        case "NEXT_DESC":
          handleMoreDesc();
          break;
        case "PREV_DESC":
          handleLessDesc();
          break;
        case "NEXT_EXPER":
          handleHigherExper();
          break;
        case "PREV_EXPER":
          handleLowerExper();
          break;
        case "FUN_FACT":
          handleFunFact();
          break;
        case "CLOSE":
          handlePlayerClose();
          onClose();
          break;
        default:
          console.log(`Comando non riconosciuto: "${cleanTranscript}".`);
      }
    };

    recognition.onerror = (event) => {
      console.error("Errore riconoscimento vocale:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  useEffect(() => {
    if (!work) {
      setDragCurrentY(0);
    }
    setCurrentLength("medium");
    setShowFunFact(false);
    handlePlayerClose();
  }, [work]);

  const progressPercentage = Math.min(100, Math.round((currentTime / totalDuration) * 100)) || 0;

  return (
    <>
      {work && (
        <div 
          onClick={() => {
            handlePlayerClose();
            onClose();
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10001] transition-opacity duration-300"
        />
      )}

      {/* CONTENITORE: Su mobile sale dal basso a tutta larghezza, su desktop si centra con max-w-4xl e bordi arrotondati */}
      <div 
        className="fixed bottom-0 left-0 right-0 md:inset-x-0 md:mx-auto md:bottom-6 md:max-w-3xl lg:max-w-4xl w-full bg-[#121218] rounded-t-3xl md:rounded-3xl p-0 z-[10002] shadow-[0_-4px_30px_rgba(0,0,0,0.7)] md:shadow-[0_20px_60px_rgba(0,0,0,0.9)] md:border md:border-slate-800/80 text-white flex flex-col max-h-[88vh] md:max-h-[82vh]"
        style={{
          transform: work ? `translateY(${dragCurrentY}px)` : "translateY(100%)",
          transition: dragStartY ? "none" : "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        }}
      >
        {work && (
          <>
            {/* HEADER CON TITOLO E X */}
            <div 
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="pt-5 pb-2 px-6 md:px-8 cursor-grab md:cursor-default touch-none relative shrink-0"
            >
              {/* Barra di trascinamento visibile solo su smartphone */}
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

            {/* CORPO: Griglia a 2 colonne su desktop (md:), colonna singola su mobile */}
            <div className="px-6 md:px-8 pb-6 md:pb-8 overflow-y-auto custom-scrollbar flex-1">
              <div className="md:grid md:grid-cols-12 md:gap-8 items-start mt-2">
                
                {/* COLONNA SINISTRA (Desktop): Immagine nel giusto aspect-ratio + Tasti Navigazione */}
                <div className="md:col-span-5 flex flex-col gap-4">
                  <div className="w-full bg-slate-950/80 border border-slate-800/60 rounded-2xl overflow-hidden flex items-center justify-center p-1.5 shadow-inner">
                    <img 
                      src={work.image} 
                      alt={work.name} 
                      className="w-full h-52 sm:h-64 md:h-72 object-contain rounded-xl" 
                    />
                  </div>

                  {/* Tasti Precedente e Successiva posizionati comodamente sotto l'immagine */}
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
                </div>

                {/* COLONNA DESTRA (Desktop): Testo, Curiosità, Player Audio e Controlli AI */}
                <div className="md:col-span-7 flex flex-col mt-4 md:mt-0">
                  
                  {/* DESCRIZIONE */}
                  <h6 className="text-white/50 uppercase tracking-wider mb-2 text-xs font-bold">Descrizione</h6>
                  <p className="leading-relaxed text-slate-300 text-sm mb-5 max-h-40 md:max-h-52 overflow-y-auto custom-scrollbar pr-1">
                    {currentText || "Nessuna descrizione disponibile per quest'opera."}
                  </p>

                  {/* BOX CURIOSITÀ */}
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
                    
                    {/* RIGA SUPERIORE: TIMELINE E TASTO ANNULLA (X) */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 flex items-center gap-3 bg-slate-900/90 border border-slate-800/80 px-4 py-2.5 rounded-full">
                        <span className="text-xs font-mono font-bold text-slate-300 select-none">
                          {formatTime(currentTime)}
                        </span>
                        
                        <div className="relative flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-500 rounded-full transition-all duration-300"
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

                    {/* RIGA INFERIORE: TASTI CONTROLLO (-5s, PLAY/PAUSE, +5s) */}
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
                        title={playMode && !isPaused ? "Pausa" : "Riproduci"}
                      >
                        {playMode && !isPaused ? (
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

                  {/* PULSANTI LUNGHEZZA, DIFFICOLTÀ E VOCALE */}
                  <div className="flex flex-col gap-2.5">
                    <div className="flex gap-2">
                      <button
                        onClick={handleLessDesc}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/40 hover:bg-slate-800 text-slate-300 py-2.5 transition-colors text-xs font-medium cursor-pointer"
                      >
                        Più corta
                      </button>
                      <button
                        onClick={handleMoreDesc}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/40 hover:bg-slate-800 text-slate-300 py-2.5 transition-colors text-xs font-medium cursor-pointer"
                      >
                        Più lunga
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
                        title="Comandi vocali"
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