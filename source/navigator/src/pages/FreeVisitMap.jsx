import React, { useState, useEffect } from "react";
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

  // Dettagli opera cliccata
  const [detailsWork, setDetailsWork] = useState(null);
  const [playMode, setPlayMode] = useState(false);
  const [expertiseLevel, setExpertiseLevel] = useState("medium");
  const [currentLength, setCurrentLength] = useState("medium");

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

  // 2. Quando una sezione viene selezionata, scarichiamo le sue opere tramite l'endpoint dedicato!
  const handleSelectSection = async (section) => {
    setSelectedSection(section);

    if (!section || !section._id) return;

    try {
      const res = await fetch(`${API_BASE_URL}/sections/${section._id}/works`, { credentials: "include" });
      if (res.ok) {
        const worksData = await res.json();
        const loadedWorks = Array.isArray(worksData) ? worksData : [];

        // Normalizziamo _id per garantire il match
        const normalized = loadedWorks.map(w => ({
          ...w,
          _id: w._id?.toString() || w._id
        }));

        // Aggiorniamo lo stato allWorks aggregando le opere della sezione
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

  const speakText = (textToRead) => {
    window.speechSynthesis.cancel();
    if (!textToRead) {
      setPlayMode(false);
      return;
    }
    setPlayMode(true);
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = "it-IT";
    utterance.rate = parseFloat(localStorage.getItem("audioSpeed")) || 1.0;
    utterance.onend = () => setPlayMode(false);
    window.speechSynthesis.speak(utterance);
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
              setSelectedSection(null);
              setDetailsWork(null);
            }}
            works={allWorks}
            activeWorkId={detailsWork?._id}
            onWorkClick={(work) => setDetailsWork(work)}
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
          onClose={() => setDetailsWork(null)}
          onSpeak={speakText}
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