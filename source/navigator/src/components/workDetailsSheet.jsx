import { useState, useEffect } from "react";
import { X, Volume2, Volume1, VolumeX, Mic } from "lucide-react";

export default function WorkDetailsSheet({ work, onClose, onSpeak }) {
  const [dragStartY, setDragStartY] = useState(null);
  const [dragCurrentY, setDragCurrentY] = useState(0);
  const [currentDescIndex, setCurrentDescIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);

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
    if (dragCurrentY > 100) {
      onClose();
    }
    setDragStartY(null);
    setDragCurrentY(0);
    e.target.releasePointerCapture(e.pointerId);
  };

  const handleMoreDesc = () => {
    if (work?.description && currentDescIndex < work.description.length - 1) {
      const nextIndex = currentDescIndex + 1;
      setCurrentDescIndex(nextIndex);
      onSpeak(work.description[nextIndex].description)
    }
  }

  const handleLessDesc = () => {
    if (work?.description && currentDescIndex > 0) {
      const nextIndex = currentDescIndex - 1;
      setCurrentDescIndex(nextIndex);
      onSpeak(work.description[nextIndex].description)
    }
  }

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
      window.speechSynthesis.cancel(); 
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      const cleanTranscript = transcript.replace(/\.$/, ''); 

      if (cleanTranscript === "ascolta" || cleanTranscript === "leggi") {
        onSpeak(work.description?.[currentDescIndex]?.description);
      } 
      else if (cleanTranscript === "dimmi di più" || cleanTranscript === "vai avanti") {
        handleMoreDesc();
      } 
      else if (cleanTranscript === "chiudi" || cleanTranscript === "esci") {
        onClose();
      } 
      else {
        alert(`Comando non riconosciuto: "${cleanTranscript}". Riprova con "ascolta", "dimmi di più" o "chiudi".`);
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
    setCurrentDescIndex(0);
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
              <p className="text-cyan-400 font-semibold m-0">{work.author} • {work.year}</p>
            </div>

            <div className="px-6 pb-6 overflow-y-auto">
              <img 
                src={work.image} 
                alt={work.name} 
                className="w-full max-h-[250px] object-cover rounded-xl mb-5 mt-2" 
              />

              <h6 className="text-white/50 uppercase tracking-wider mb-2 text-xs font-bold">Descrizione</h6>
              <p className="leading-relaxed text-slate-300 text-sm mb-7">
                {work.description?.[0]?.description || "Nessuna descrizione disponibile per quest'opera."}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={handleLessDesc}
                  className="flex-1 flex items-center justify-center gap-2 rounded-full border border-white/20 text-white hover:bg-white/10 py-2.5 transition-colors text-sm"
                >
                  <Volume1 size={16} /> Di meno
                </button>
                <button 
                  onClick={() => onSpeak(work.description?.[currentDescIndex]?.description)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-full bg-cyan-400 text-slate-900 font-semibold py-2.5 hover:bg-cyan-300 transition-colors text-sm" 
                >
                  <Volume2 size={16} /> Ascolta
                </button>
                <button
                  onClick={handleMoreDesc}
                  className="flex-1 flex items-center justify-center gap-2 rounded-full border border-white/20 text-white hover:bg-white/10 py-2.5 transition-colors text-sm"
                >
                  <Volume2 size={16} /> Di più
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
          </>
        )}
      </div>
    </>
  );
}