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

  const [currentWorkIndex, setCurrentWorkIndex] = useState(-1);
  const [detailsWork, setDetailsWork] = useState(null);

  const [playMode, setPlayMode] = useState(false);
  const [expertiseLevel, setExpertiseLevel] = useState("medium");
  const [currentLength, setCurrentLength] = useState("medium");

  // Tokenizzazione parole e tracciamento
  const wordsListRef = useRef([]);
  const activeWordIdxRef = useRef(0);
  const currentUtteranceRef = useRef(null);
  const isPlayingRef = useRef(false);
  const [wordProgressRatio, setWordProgressRatio] = useState(0);

  const museumId = selectedMuseum?._id;
  const hasMap = Boolean(sections && sections.length > 0);

  useEffect(() => {
    if (!museumId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchMapAndSections = async () => {
      setLoading(true);
      setApiError(false);

      try {
        const [sectionsRes, mapRes] = await Promise.all([
          fetch(`${API_BASE_URL}/museums/${museumId}/sections`, { credentials: "include" }),
          fetch(`${API_BASE_URL}/museums/${museumId}/map-svg`)
        ]);

        if (!isMounted) return;

        if (sectionsRes.ok) {
          const sData = await sectionsRes.json();
          setSections(Array.isArray(sData) ? sData : []);
        } else {
          setSections([]);
        }

        if (mapRes.ok) {
          const mapText = await mapRes.text();
          setSvgMapString(mapText);
        } else {
          setSvgMapString(null);
        }
      } catch (error) {
        console.error("Errore caricamento dati free-map:", error);
        if (isMounted) setApiError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMapAndSections();

    return () => {
      isMounted = false;
      handleStopAudio();
    };
  }, [museumId]);

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
      console.error("Errore recupero opere sezione:", err);
    }
  };

  // Prepara l'elenco delle parole calcolando gli offset dei caratteri
  const prepareWords = (text) => {
    if (!text || typeof text !== "string") return [];
    const tokens = [];
    const regex = /\S+/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      tokens.push({
        word: match[0],
        charStart: match.index,
        charEnd: match.index + match[0].length
      });
    }
    return tokens;
  };

  // Lettura a partire da una specifica parola
  const playFromWordIndex = (wordIdx) => {
    window.speechSynthesis.cancel();

    const words = wordsListRef.current;
    if (!words || words.length === 0) {
      handleStopAudio();
      return;
    }

    const safeIdx = Math.max(0, Math.min(wordIdx, words.length - 1));
    activeWordIdxRef.current = safeIdx;
    setWordProgressRatio(safeIdx / words.length);

    // Ricostruisce la porzione di testo rimanente da pronunciare
    const sliceStartChar = words[safeIdx].charStart;
    const remainingText = words.map(w => w.word).slice(safeIdx).join(" ");

    const utterance = new SpeechSynthesisUtterance(remainingText);
    currentUtteranceRef.current = utterance;

    utterance.lang = "it-IT";
    const speed = parseFloat(localStorage.getItem('audioSpeed')) || 1.0;
    utterance.rate = speed;

    utterance.onstart = () => {
      setPlayMode(true);
      isPlayingRef.current = true;
    };

    // A ogni parola pronunciata dal sintetizzatore, avanziamo nell'indice esatto
    utterance.onboundary = (event) => {
      if (event.name === "word") {
        const spokenChar = event.charIndex;
        // Troviamo quale parola corrisponde al punto letto
        let subIndex = 0;
        let charAcc = 0;
        const remainingWords = words.slice(safeIdx);

        for (let i = 0; i < remainingWords.length; i++) {
          if (charAcc >= spokenChar) {
            subIndex = i;
            break;
          }
          charAcc += remainingWords[i].word.length + 1; // +1 per lo spazio
        }

        const currentGlobalIdx = safeIdx + subIndex;
        activeWordIdxRef.current = currentGlobalIdx;
        setWordProgressRatio(Math.min(1, currentGlobalIdx / words.length));
      }
    };

    utterance.onend = () => {
      setPlayMode(false);
      isPlayingRef.current = false;
      activeWordIdxRef.current = 0;
      setWordProgressRatio(1); // Barra al 100% all'ultima sillaba
      currentUtteranceRef.current = null;
    };

    utterance.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      handleStopAudio();
    };

    const voices = window.speechSynthesis.getVoices();
    const itVoice = voices.find(v => v.lang.startsWith("it"));
    if (itVoice) utterance.voice = itVoice;

    window.speechSynthesis.speak(utterance);
  };

  const speakText = (textToRead) => {
    if (!textToRead) {
      handleStopAudio();
      return;
    }
    const words = prepareWords(textToRead);
    wordsListRef.current = words;
    activeWordIdxRef.current = 0;
    setWordProgressRatio(0);
    playFromWordIndex(0);
  };

  const handlePauseAudio = () => {
    window.speechSynthesis.cancel();
    setPlayMode(false);
    isPlayingRef.current = false;
    // La posizione rimane bloccata all'inizio della parola corrente!
    const words = wordsListRef.current;
    if (words.length > 0) {
      setWordProgressRatio(activeWordIdxRef.current / words.length);
    }
  };

  const handleResumeAudio = () => {
    playFromWordIndex(activeWordIdxRef.current);
  };

  const handleStopAudio = () => {
    window.speechSynthesis.cancel();
    setPlayMode(false);
    isPlayingRef.current = false;
    activeWordIdxRef.current = 0;
    setWordProgressRatio(0);
    currentUtteranceRef.current = null;
  };

  // Seek +/- 5s stimato in numero di parole (~2.2 parole al secondo in italiano)
  const handleSeekAudio = (seconds) => {
    const words = wordsListRef.current;
    if (!words || words.length === 0) return;

    const wordsToShift = Math.round(2.2 * seconds);
    const targetIdx = Math.max(0, Math.min(words.length - 1, activeWordIdxRef.current + wordsToShift));
    
    activeWordIdxRef.current = targetIdx;
    setWordProgressRatio(targetIdx / words.length);

    if (isPlayingRef.current) {
      playFromWordIndex(targetIdx);
    }
  };

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
          <p className="text-xs text-slate-400">Seleziona un museo per visualizzare la mappa libera.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white">
        <Loader2 className="animate-spin text-amber-500 mb-3" size={36} />
        <p className="text-slate-400 text-sm">Caricamento mappa in corso...</p>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white p-6 text-center">
        <AlertCircle className="text-red-500 mb-3" size={36} />
        <h3 className="text-lg font-bold mb-1">Errore caricamento</h3>
        <p className="text-slate-400 text-xs">Impossibile recuperare i dati della mappa.</p>
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
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
            Nessuna mappa disponibile per questo museo.
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
          onPauseAudio={handlePauseAudio}
          onResumeAudio={handleResumeAudio}
          onStopAudio={handleStopAudio}
          onSeekAudio={handleSeekAudio}
          audioProgressRatio={wordProgressRatio}
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
