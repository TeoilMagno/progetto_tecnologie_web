import React, { useState } from 'react';
import { Lock, ChevronLeft, Play, ChevronRight, BookOpen, Volume2, Keyboard, Mic, QrCode, Plus, Minus, Send, Sparkles, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function NavigationControlBar({
  currentWorkIndex,
  visitedWorks,
  onPrev,
  onNext,
  onEndVisit,
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
  onShowJoinModal,
  hasMap,
  commandsMap,
  setCurrentLength,
  setCurrentExpertise,
  socket,
  roomCode
}) {
  const [isListening, setIsListening] = useState(false);
  const [textCommand, setTextCommand] = useState("");
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  const currentWork = currentWorkIndex >= 0 ? visitedWorks[currentWorkIndex] : null;
  const lengthLevels = ["short", "medium", "long", "exhaustive"];
  const expertiseLevels = ["simple", "medium", "professional", "expert"];

  // --- HELPER PER SEGNALARE LE INTERAZIONI ALLA DASHBOARD ---
  const sendInteraction = (text) => {
    if (isSharedSession && !isTeacher && socket && roomCode) {
      socket.emit('student_interaction', {
        roomCode,
        studentName: localStorage.getItem('student_name') || 'Studente',
        interactionType: 'button',
        query: `Pulsante cliccato: ${text}`
      });
    }
  };

  const handleMoreDesc = () => {
    sendInteraction("Più lunga");
    const currentIndex = lengthLevels.indexOf(currentLength);
    if (currentIndex < lengthLevels.length - 1) {
      const nextLength = lengthLevels[currentIndex + 1];
      setCurrentLength(nextLength);
      onSpeak(currentWork?.description?.[expertiseLevel]?.[nextLength] || "Non ho ulteriori dettagli scritti per quest'opera.");
    } else {
      onSpeak("Questa è la descrizione più dettagliata disponibile.");
    }
  };

  const handleLessDesc = () => {
    sendInteraction("Più corta");
    const currentIndex = lengthLevels.indexOf(currentLength);
    if (currentIndex > 0) {
      const prevLength = lengthLevels[currentIndex - 1];
      setCurrentLength(prevLength);
      onSpeak(currentWork?.description?.[expertiseLevel]?.[prevLength] || "Nessuna versione più breve.");
    } else {
      onSpeak("Non ci sono versioni più brevi di questa descrizione.");
    }
  };

  const handleHigherExper = () => {
    sendInteraction("Approfondisci");
    const currentIndex = expertiseLevels.indexOf(expertiseLevel);
    if (currentIndex < expertiseLevels.length - 1) {
      const nextExpertise = expertiseLevels[currentIndex + 1];
      setCurrentExpertise(nextExpertise);
      onSpeak(currentWork?.description?.[nextExpertise]?.[currentLength] || "Nessuna spiegazione più tecnica disponibile.");
    } else {
      onSpeak("Questa è la spiegazione più avanzata disponibile.");
    }
  };

  const handleLowerExper = () => {
    sendInteraction("Semplifica");
    const currentIndex = expertiseLevels.indexOf(expertiseLevel);
    if (currentIndex > 0) {
      const prevExpertise = expertiseLevels[currentIndex - 1];
      setCurrentExpertise(prevExpertise);
      onSpeak(currentWork?.description?.[prevExpertise]?.[currentLength] || "Nessuna spiegazione più semplice disponibile.");
    } else {
      onSpeak("Non riesco a semplificare ulteriormente questa spiegazione.");
    }
  };

  const handleFunFact = () => {
    sendInteraction("Curiosità");
    if (currentWork?.funFact) {
      onSpeak(`Ecco una curiosità: ${currentWork.funFact}`);
    } else {
      onSpeak("Non ho curiosità per quest'opera.");
    }
  };

  const processCommand = async (transcript) => {
    if (!transcript.trim()) return;

    if (isSharedSession && !isTeacher && socket && roomCode) {
      socket.emit('student_interaction', {
        roomCode,
        studentName: localStorage.getItem('student_name') || 'Studente',
        interactionType: inputMode === 'write' ? 'text' : 'voice',
        query: transcript
      });
    }

    const cleanTranscript = transcript.toLowerCase().trim().replace(/\.$/, '');
    let action = commandsMap?.[cleanTranscript];

    if (!action) {
      setIsProcessingAI(true);
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
      setIsProcessingAI(false);
    }

    switch (action) {
      case "PLAY": onSpeak(currentWork?.description?.[expertiseLevel]?.[currentLength]); break;
      case "NEXT_DESC": handleMoreDesc(); break;
      case "PREV_DESC": handleLessDesc(); break;
      case "NEXT_EXPER": handleHigherExper(); break;
      case "PREV_EXPER": handleLowerExper(); break;
      case "FUN_FACT": handleFunFact(); break;
      case "UNKNOWN": onSpeak("Comando non riconosciuto. Riprova con ascolta, dimmi di più, o semplifica."); break;
      default: break;
    }
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Comandi vocali non supportati.");
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.interimResults = false;
    
    recognition.onstart = () => {
      setIsListening(true);
      window.speechSynthesis.cancel();
    };
    
    recognition.onresult = (event) => processCommand(event.results[0][0].transcript);
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  return (
    // IL CONTENITORE PRINCIPALE: ora è flex-col e non ha limiti di altezza
    <div className="w-full shrink-0 bg-[#121218]/95 border-t border-white/10 flex flex-col p-3 md:px-8 gap-3 z-[999] backdrop-blur-md">
      
      {/* RIGA 1: Navigazione Principale */}
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
          {/* Se è studente in sessione, non mostriamo i comandi di navigazione per liberare spazio */}
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

        {/* Destra: Toggles vari */}
        <div className="flex items-center justify-center gap-2 md:gap-4 w-full md:w-auto">
          
          {/* Toggle Leggi/Ascolta (Logica Booleana) */}
          <div className="flex overflow-hidden rounded-full border border-white/15 w-full md:w-auto">
            <button 
              type="button" 
              className={`flex-1 flex justify-center items-center gap-1.5 px-2 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-semibold outline-none transition-colors cursor-pointer ${playMode === false ? 'bg-cyan-400 text-slate-900' : 'bg-transparent text-slate-400 hover:text-white'}`}
              onClick={() => setPlayMode(false)}
            >
              <BookOpen size={14} /> Leggi
            </button>
            <button 
              type="button" 
              className={`flex-1 flex justify-center items-center gap-1.5 px-2 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-semibold outline-none transition-colors cursor-pointer ${playMode === true ? 'bg-cyan-400 text-slate-900' : 'bg-transparent text-slate-400 hover:text-white'}`}
              onClick={() => {
                setPlayMode(true);
                if (currentWork) onSpeak(currentWork?.description?.[expertiseLevel]?.[currentLength]);
              }}
            >
              <Volume2 size={14} /> Ascolta
            </button>
          </div>

          {/* Toggle Scrivi/Parla (solo in Fallback) */}
          {!hasMap && currentWorkIndex >= 0 && (
            <div className="flex overflow-hidden rounded-full border border-white/15 w-full md:w-auto">
              <button 
                type="button" 
                onClick={() => setInputMode('write')} 
                className={`flex-1 flex justify-center items-center gap-1.5 px-2 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-semibold outline-none transition-colors cursor-pointer ${inputMode === 'write' ? 'bg-cyan-400 text-slate-900' : 'bg-transparent text-slate-400 hover:text-white'}`}
              >
                <Keyboard size={14} /> Scrivi
              </button>
              <button 
                type="button" 
                onClick={() => setInputMode('speak')} 
                className={`flex-1 flex justify-center items-center gap-1.5 px-2 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-semibold outline-none transition-colors cursor-pointer ${inputMode === 'speak' ? 'bg-cyan-400 text-slate-900' : 'bg-transparent text-slate-400 hover:text-white'}`}
              >
                <Mic size={14} /> Parla
              </button>
            </div>
          )}
          
          {/* Bottone QR Code per l'insegnante */}
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

      {/* RIGA 2: Tasti Interazione IA (Solo in modalità Fallback) */}
      {!hasMap && currentWorkIndex >= 0 && (
        <div className="w-full flex flex-col md:flex-row gap-3 pt-3 border-t border-white/10 animate-fadeIn">
          
          {/* Tasti controllo lunghezza/dettaglio */}
          <div className="flex gap-2 justify-center w-full md:w-1/2">
            <button onClick={handleLessDesc} className="flex-1 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-xs py-2 rounded-lg text-slate-300 transition-colors cursor-pointer">
              <Minus size={12} /> Corta
            </button>
            <button onClick={handleMoreDesc} className="flex-1 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-xs py-2 rounded-lg text-slate-300 transition-colors cursor-pointer">
              <Plus size={12} /> Lunga
            </button>
            <button onClick={handleLowerExper} className="flex-1 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-xs py-2 rounded-lg text-slate-300 transition-colors cursor-pointer">
              <Minus size={12} /> Semplice
            </button>
            <button onClick={handleHigherExper} className="flex-1 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-xs py-2 rounded-lg text-slate-300 transition-colors cursor-pointer">
              <Plus size={12} /> Esperta
            </button>
            <button onClick={handleFunFact} className="flex-1 flex items-center justify-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 text-xs py-2 rounded-lg text-amber-400 transition-colors cursor-pointer">
              <Sparkles size={12} /> Curiosità
            </button>
          </div>

          {/* Campo Input IA (Testo o Microfono) */}
          <div className="flex items-center gap-2 w-full md:w-1/2">
            {inputMode === 'write' ? (
              <div className="flex w-full relative">
                <input 
                  type="text" 
                  value={textCommand}
                  onChange={e => setTextCommand(e.target.value)}
                  placeholder="Chiedi qualcosa all'IA..." 
                  className="w-full bg-slate-900 border border-slate-700 rounded-full pl-4 pr-10 py-2 text-xs text-white focus:border-cyan-500 outline-none"
                  onKeyDown={(e) => { if(e.key === 'Enter') { processCommand(textCommand); setTextCommand(''); } }}
                />
                <button onClick={() => { processCommand(textCommand); setTextCommand(''); }} className="absolute right-1 top-1 bottom-1 w-8 flex items-center justify-center bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-full cursor-pointer">
                  {isProcessingAI ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                </button>
              </div>
            ) : (
              <button onClick={startListening} className={`w-full flex items-center justify-center gap-2 py-2 rounded-full font-bold text-xs transition-all cursor-pointer ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30'}`}>
                {isProcessingAI ? <Loader2 size={16} className="animate-spin text-cyan-400" /> : <Mic size={16} />} 
                {isListening ? 'In ascolto...' : isProcessingAI ? 'Elaborazione...' : 'Premi e parla con l\'IA'}
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}