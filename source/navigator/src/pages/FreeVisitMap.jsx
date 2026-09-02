import React, { useState, useEffect, useRef } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { API_BASE_URL } from "../config";
import HighlyOptimizedMapView from "../components/HighlyOptimizedMapView";
import WorkDetailsSheet from "../components/WorkDetailsSheet";

export default function FreeVisitMap({ selectedMuseum }) {
  const [sections, setSections] = useState([]);
  const [allWorks, setAllWorks] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [svgMapString, setSvgMapString] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  // Indice e Dettagli dell'opera selezionata
  const [currentWorkIndex, setCurrentWorkIndex] = useState(-1);
  const [detailsWork, setDetailsWork] = useState(null);

  // Audio e sintetizzatore vocale
  const [playMode, setPlayMode] = useState(false);
  const [expertiseLevel, setExpertiseLevel] = useState("medium");
  const [currentLength, setCurrentLength] = useState("medium");

  // Riferimenti persistenti per prevenire il Garbage Collection e gestire il seek (+5s / -5s)
  const currentAudioTextRef = useRef("");
  const audioCharIndexRef = useRef(0);
  const isAudioActiveRef = useRef(false);
  const currentUtteranceRef = useRef(null);

  const museumId = selectedMuseum?._id;
  const hasMap = sections && sections.length > 0;

  // 1. Caricamento iniziale Sezioni e Mappa SVG
  useEffect(() => {
    if (!museumId) {
      setLoading(false);
      return;
    }

    const fetchMapAndSections = async () => {
      setLoading(true);
      setApiError(false);

      try {
        const [sectionsRes, mapRes] = await Promise.all([
          fetch(`${API_BASE_URL}/museums/${museumId}/sections`, { credentials: "include" }),
          fetch(`${API_BASE_URL}/museums/${museumId}/map-svg`)
        ]);

        if (sectionsRes.ok) {
          const sData = await sectionsRes.json();
          setSections(Array.isArray(sData) ? sData : []);
        }

        if (mapRes.ok) {
          const mapText = await mapRes.text();
          setSvgMapString(mapText);
        }

        setLoading(false);
      } catch (error) {
        console.error("Errore caricamento dati free-map:", error);
        setApiError(true);
        setLoading(false);
      }
    };

    fetchMapAndSections();
  }, [museumId]);

  // 2. Quando una sezione viene selezionata, scarichiamo le sue opere
  const handleSelectSection = async (section) => {
    setSelectedSection(section);
    if (!section || !section._id) return;

    try {
      const res = await fetch(`${API_BASE_URL}/sections/${section._id}/works`, { credentials: "include" });
      if (res.ok) {
        const worksData = await res.json();
        const loadedWorks = Array.isArray(worksData) ? worksData : [];

        const normalized = loadedWorks.map(w => ({
          ...w,
          _id: w._id?.toString() || w._id
        }));

        setAllWorks(prev => {
          const map = new Map(prev.map(w => [w._id?.toString(), w]));
          normalized.forEach(w => map.set(w._id?.toString(), w));
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.error("Errore nel recupero delle opere della sezione:", err);
    }
  };

  useEffect(() => {
    return () => window.speechSynthesis.cancel();
  }, []);

  // --- CONTROLLER AUDIO ROBUSTO (PLAY, STOP, +5s, -5s) ---
  const speakFromOffset = (text, startChar = 0) => {
    console.log("--> [AUDIO DEBUG - FREEMAP] Avvio riproduzione.");

    if (!text || typeof text !== "string" || text.trim() === "") {
      setPlayMode(false);
      isAudioActiveRef.current = false;
      currentUtteranceRef.current = null;
      return;
    }

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    
    window.speechSynthesis.cancel();

    const safeStart = Math.max(0, Math.min(startChar, text.length - 1));
    const subText = text.slice(safeStart);

    const utterance = new SpeechSynthesisUtterance(subText);
    currentUtteranceRef.current = utterance; // Impedisce al GC del browser di killare l'audio!

    utterance.lang = "it-IT";
    const speed = parseFloat(localStorage.getItem('audioSpeed')) || 1.0;
    utterance.rate = speed;

    utterance.onstart = () => {
      console.log("--> [AUDIO DEBUG - FREEMAP] Voce partita regolarmente.");
      setPlayMode(true);
      isAudioActiveRef.current = true;
    };

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        audioCharIndexRef.current = safeStart + event.charIndex;
      }
    };

    utterance.onend = () => {
      console.log("--> [AUDIO DEBUG - FREEMAP] Lettura completata.");
      setPlayMode(false);
      isAudioActiveRef.current = false;
      audioCharIndexRef.current = 0;
      currentUtteranceRef.current = null;
    };

    utterance.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      console.error("Errore TTS:", e);
      setPlayMode(false);
      isAudioActiveRef.current = false;
      currentUtteranceRef.current = null;
    };

    const voices = window.speechSynthesis.getVoices();
    const itVoice = voices.find(v => v.lang.startsWith("it"));
    if (itVoice) {
      utterance.voice = itVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  const speakText = (textToRead) => {
    if (!textToRead) {
      handleStopAudio();
      return;
    }
    currentAudioTextRef.current = textToRead;
    audioCharIndexRef.current = 0;
    speakFromOffset(textToRead, 0);
  };

  const handleStopAudio = () => {
    window.speechSynthesis.cancel();
    setPlayMode(false);
    isAudioActiveRef.current = false;
    audioCharIndexRef.current = 0;
    currentUtteranceRef.current = null;
  };

  const handleSeekAudio = (seconds) => {
    const fullText = currentAudioTextRef.current;
    if (!fullText) return;

    const speed = parseFloat(localStorage.getItem('audioSpeed')) || 1.0;
    const charsToShift = Math.round(15 * speed * seconds);
    const targetChar = Math.max(0, Math.min(fullText.length - 1, audioCharIndexRef.current + charsToShift));

    speakFromOffset(fullText, targetChar);
  };

  // Navigazione opere Successiva / Precedente all'interno della sezione corrente
  const currentSectionWorks = selectedSection?.works
    ? allWorks.filter(w => selectedSection.works.some(sw => (sw.workId?._id || sw.workId)?.toString() === w._id?.toString()))
    : allWorks;

  const handleNextWork = () => {
    if (currentWorkIndex < currentSectionWorks.length - 1) {
      handleStopAudio();
      const nextIdx = currentWorkIndex + 1;
      setCurrentWorkIndex(nextIdx);
      setDetailsWork(currentSectionWorks[nextIdx]);
    }
  };

  const handlePrevWork = () => {
    if (currentWorkIndex > 0) {
      handleStopAudio();
      const prevIdx = currentWorkIndex - 1;
      setCurrentWorkIndex(prevIdx);
      setDetailsWork(currentSectionWorks[prevIdx]);
    }
  };

  if (!selectedMuseum) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6 text-center">
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl max-w-sm flex flex-col items-center shadow-xl">
          <AlertCircle size={36} className="text-amber-500 mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">Nessun museo selezionato</h3>
          <p className="text-xs text-slate-400">Seleziona un museo per visualizzare la mappa.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white">
        <Loader2 className="animate-spin text-amber-500 mb-3" size={36} />
        <p className="text-slate-400 text-sm">Caricamento mappa...</p>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white p-6 text-center">
        <AlertCircle className="text-red-500 mb-3" size={36} />
        <h3 className="text-lg font-bold mb-1">Errore caricamento</h3>
        <p className="text-slate-400 text-xs">Impossibile recuperare la mappa.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      <div className="w-full h-full relative overflow-hidden flex-1">
        {hasMap && svgMapString ? (
          <HighlyOptimizedMapView
            svgString={svgMapString}
            activeSection={selectedSection}
            sections={sections}
            onSelectSection={handleSelectSection}
            onBack={() => {
              handleStopAudio();
              setSelectedSection(null);
              setDetailsWork(null);
              setCurrentWorkIndex(-1);
            }}
            works={allWorks}
            activeWorkId={detailsWork?._id}
            onWorkClick={(work) => {
              handleStopAudio();
              const idx = currentSectionWorks.findIndex(w => w._id?.toString() === work._id?.toString());
              setCurrentWorkIndex(idx !== -1 ? idx : 0);
              setDetailsWork(work);
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white">
            <Loader2 className="animate-spin text-amber-500 mr-2" size={24} /> Caricamento mappa...
          </div>
        )}
      </div>

      {hasMap && (
        <WorkDetailsSheet
          work={detailsWork}
          onClose={() => {
            handleStopAudio();
            setDetailsWork(null);
          }}
          onSpeak={speakText}
          onStopAudio={handleStopAudio}
          onSeekAudio={handleSeekAudio}
          onPrev={handlePrevWork}
          onNext={handleNextWork}
          hasPrev={currentWorkIndex > 0}
          hasNext={currentWorkIndex < currentSectionWorks.length - 1}
          commandsMap={null}
          currentExpertise={expertiseLevel}
          setCurrentExpertise={setExpertiseLevel}
          currentLength={currentLength}
          setCurrentLength={setCurrentLength}
          socket={null}
          roomCode={null}
          isSharedSession={false}
          isTeacher={false}
          playMode={playMode}
        />
      )}
    </div>
  );
}