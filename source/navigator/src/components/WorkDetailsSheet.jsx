import { useState, useEffect } from "react";
import { Volume, VolumeX, Mic, X, Sparkles } from "lucide-react";
import { API_BASE_URL } from "../config";

export default function WorkDetailsSheet({ work, onClose, onSpeak, commandsMap, currentExpertise, setCurrentExpertise, currentLength, setCurrentLength }) {
  // --- LOGICA TRASCINAMENTO BOTTOM SHEET ---
  const [dragStartY, setDragStartY] = useState(null);
  const [dragCurrentY, setDragCurrentY] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [showFunFact, setShowFunFact] = useState(false);
  
  //lunghezza descrizione opera
  const lengthLevels = ["short", "medium", "long", "exhaustive"];
  const expertiseLevels = ["simple", "medium", "professional", "expert"];

  const handlePointerDown = (e) => {
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

    // Se ha trascinato in basso per più di 100px, chiudiamo
    if (dragCurrentY > 100) {
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
        onSpeak(textToSpeak);
      } else {
        onSpeak("Mi dispiace, ma non ho ulteriori dettagli scritti per quest'opera.");
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
        onSpeak(textToSpeak);
      } else {
        onSpeak("Non ci sono versioni più brevi di questa descrizione.");
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
        onSpeak(textToSpeak);
      } else {
        onSpeak("Mi dispiace, ma non ho una spiegazione più tecnica per quest'opera a questa lunghezza.");
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
        onSpeak(textToSpeak);
      } else {
        onSpeak("Non riesco a semplificare ulteriormente questa spiegazione.");
      }
    }
  };

  const handleFunFact = () => {
    if(work.funFact) {
      setShowFunFact(true);
      onSpeak(`ecco una curiosità su quest'opera: ${work.funFact}`);
    } else {
      onSpeak(`mi dispiace ma non ho curiosità interessanti riguardanti quest'opera`);
    }
  }

  const startListening = () => {
    // 1. Controllo compatibilità browser
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Il tuo browser non supporta i comandi vocali.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'it-IT'; // riconosciamo l'italiano l'italiano
    recognition.interimResults = false; // Aspetta che l'utente finisca di parlare
    recognition.maxAlternatives = 1;

    // Inizia ascolto
    recognition.onstart = () => {
      setIsListening(true);
      // Opzionale: Zittiamo la voce se stava parlando, per non accavallarsi!
      window.speechSynthesis.cancel(); 
    };

    // Quando ha capito cosa hai detto
    recognition.onresult = async (event) => {
      // Estraiamo il testo, lo mettiamo in minuscolo e togliamo gli spazi ai lati
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      console.log("Hai detto:", transcript); // debug

      // --- MAPPATURA ESATTA DEI COMANDI (Fase 1) ---
      // rimozione eventuale punto finale che a volte l'API aggiunge
      const cleanTranscript = transcript.replace(/\.$/, ''); 

      let action = commandsMap[cleanTranscript];

      if(!action) {
        console.log("AI");
        // --- FUTURA FASE 2: INTEGRAZIONE AI ---
        // Qui in futuro metterai: const aiResponse = await fetch('/api/ai-mapper', { body: cleanTranscript })

        setIsListening(true); // Tieni acceso un feedback visivo di "Sto pensando..."
        try {
          // mando la promp alla rotta ai per farla intepretare a Gemini
          const aiResponse = await fetch(`${API_BASE_URL}/ai/map-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: transcript })
          });
          const aiData = await aiResponse.json();
          action = aiData.mappedAction; // L'IA restituisce "PLAY", "NEXT_DESC", "CLOSE" o "UNKNOWN"
        } catch (error) {
          action = "UNKNOWN";
        }
      }

      console.log(action);

      switch (action) {
        case "PLAY":
          onSpeak(work?.description?.[expertiseLevel]?.[currentLength]);
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
          onClose();
          break;
        case "UNKNOWN":
          console.log(`Comando non riconosciuto: "${cleanTranscript}". Riprova con "ascolta", "dimmi di più" o "chiudi".`);
          break;
        default:
          console.log(`Non ho capito. Puoi dire cose come "ascolta" o "chiudi".`);
      }
    };

    // 4. Gestione fine o errori
    recognition.onerror = (event) => {
      console.error("Errore riconoscimento vocale:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false); // Spegne il microfono visivamente
    };

    // Facciamo partire l'ascolto!
    recognition.start();
  };

  // Resettiamo la posizione del menu se l'utente lo chiude con la X
useEffect(() => {
    if (!work) {
      setDragCurrentY(0);
    }
    setCurrentLength("medium");
    setShowFunFact(false);
  }, [work]);

  return (
    <>
      {work && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10001] transition-opacity duration-300"
        />
      )}

      <div 
        className="fixed bottom-0 left-0 right-0 bg-[#121218] rounded-t-3xl p-0 z-[10002] shadow-[0_-4px_20px_rgba(0,0,0,0.5)] text-white flex flex-col max-h-[85vh]"
        style={{
          transform: work ? `translateY(${dragCurrentY}px)` : "translateY(100%)",
          transition: dragStartY ? "none" : "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        }}
      >
        {work && (
          <>
            <div 
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="pt-6 pb-2 px-6 cursor-grab touch-none relative"
            >
              <div className="w-10 h-1.5 bg-white/20 rounded-full mx-auto mb-5" />
              
              <button 
                onClick={onClose}
                className="absolute top-4 right-5 w-8 h-8 flex items-center justify-center rounded-full border border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>

              <h3 className="font-extrabold text-xl mb-1">{work.name}</h3>
              <p className="text-cyan-400 font-semibold m-0 text-sm">
                {work.authorName || 'Autore Sconosciuto'} • {work.year} {work.styleName ? `• ${work.styleName}` : ''}
              </p>
            </div>

            <div className="px-6 pb-6 overflow-y-auto">
              <img 
                src={work.image} 
                alt={work.name} 
                className="w-full max-h-[250px] object-cover rounded-xl mb-5 mt-2" 
              />
              
              {/* DESCRIZIONE NORMALE */}
              <h6 className="text-white/50 uppercase tracking-wider mb-2 text-xs font-bold">Descrizione</h6>
              <p className="leading-relaxed text-slate-300 text-sm mb-7">
                {work.description?.[currentExpertise]?.[currentLength] || "Nessuna descrizione disponibile per quest'opera."}
              </p>

              {/* BOX CURIOSITÀ (Appare solo se richiesto e se esiste) */}
              {showFunFact && work?.funFact && (
                <div className="mb-7 p-4 bg-gradient-to-r from-amber-500/10 to-orange-600/10 border border-amber-500/30 rounded-2xl animate-fadeIn">
                  <h6 className="text-amber-400 uppercase tracking-wider mb-2 text-xs font-bold flex items-center gap-2">
                    <Sparkles size={14} /> Curiosità
                  </h6>
                  <p className="leading-relaxed text-amber-50 text-sm">
                    {work.funFact}
                  </p>
                </div>
              )}

              {/* Contenitore principale flex-col per impaginare su due righe */}
              <div className="flex flex-col gap-3">
                
                {/* RIGA 1: Riproduzione e Lunghezza */}
                <div className="flex gap-2">
                  <button
                    onClick={handleLessDesc}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-white/20 text-white hover:bg-white/10 py-2.5 transition-colors text-xs sm:text-sm"
                  >
                    <VolumeX size={16} /> Più corta
                  </button>
                  <button 
                    onClick={() => onSpeak(work.description?.[currentExpertise]?.[currentLength])}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-cyan-400 text-slate-900 font-semibold py-2.5 hover:bg-cyan-300 transition-colors text-xs sm:text-sm" 
                  >
                    <Volume size={16} /> Ascolta
                  </button>
                  <button
                    onClick={handleMoreDesc}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-white/20 text-white hover:bg-white/10 py-2.5 transition-colors text-xs sm:text-sm"
                  >
                    <Volume size={16} /> Più lunga
                  </button>
                </div>

                {/* RIGA 2: Difficoltà e Microfono */}
                <div className="flex gap-2">
                  <button
                    onClick={handleLowerExper}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-white/20 text-white hover:bg-white/10 py-2.5 transition-colors text-xs sm:text-sm"
                  >
                    Semplifica
                  </button>
                  <button
                    onClick={handleHigherExper}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-white/20 text-white hover:bg-white/10 py-2.5 transition-colors text-xs sm:text-sm"
                  >
                    Approfondisci
                  </button>
                  <button
                    onClick={startListening}
                    className="w-11 h-11 flex items-center justify-center rounded-full transition-all duration-300 shrink-0"
                    style={{ 
                      backgroundColor: isListening ? "#ff4444" : "rgba(255,255,255,0.1)",
                      color: isListening ? "white" : "#ccc",
                      boxShadow: isListening ? "0 0 15px rgba(255, 68, 68, 0.6)" : "none"
                    }}
                    title="Comandi vocali"
                  >
                    <Mic size={20} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
