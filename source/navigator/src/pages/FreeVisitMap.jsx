import React, { useState, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { API_BASE_URL } from "../config";
import { useWorkGuide } from "../hooks/useWorkGuide";
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
        alert("Errore durante il caricamento dei dati per la visita lbera");
        if (isMounted) setApiError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMapAndSections();

    return () => {
      isMounted = false;
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
      alert("Errore durante ilc aricamento delle opere di questa sezione sezione");
    }
  };

  const currentSectionWorks = selectedSection?.works
    ? allWorks.filter(w => selectedSection.works.some(sw => (sw.workId?._id || sw.workId)?.toString() === w._id?.toString()))
    : allWorks;

  // Logica di lettura/comandi centralizzata nell'hook, stessa identica base
  // usata da MapView: niente più motore audio duplicato qui dentro.
  const workGuide = useWorkGuide({
    work: detailsWork,
    initialExpertise: "medium",
    initialLength: "medium",
    commandsMap: null, // Visita libera: nessun dizionario legato a una visita specifica
    socket: null,
    roomCode: null,
    isSharedSession: false,
    isTeacher: false
  });

  const handleNextWork = () => {
    if (currentWorkIndex < currentSectionWorks.length - 1) {
      workGuide.handleStopAudio();
      const nextIdx = currentWorkIndex + 1;
      setCurrentWorkIndex(nextIdx);
      setDetailsWork(currentSectionWorks[nextIdx]);
    }
  };

  const handlePrevWork = () => {
    if (currentWorkIndex > 0) {
      workGuide.handleStopAudio();
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
              workGuide.handleStopAudio();
              setSelectedSection(null);
              setDetailsWork(null);
              setCurrentWorkIndex(-1);
            }}
            works={allWorks}
            activeWorkId={detailsWork?._id}
            onWorkClick={(work) => {
              workGuide.handleStopAudio();
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
          guide={workGuide}
          onClose={() => {
            workGuide.handleStopAudio();
            setDetailsWork(null);
            setCurrentWorkIndex(-1);
          }}
          onPrev={handlePrevWork}
          onNext={handleNextWork}
          hasPrev={currentWorkIndex > 0}
          hasNext={currentWorkIndex < currentSectionWorks.length - 1}
          socket={null}
          roomCode={null}
          isSharedSession={false}
          isTeacher={false}
        />
      )}
    </div>
  );
}
