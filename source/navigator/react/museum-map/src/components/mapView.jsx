import { useState, useEffect } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import SectionLayer from "./sectionLayer";
import RoomLayer from "./roomLayer";

export default function MapView({ visitId }) {
  const [selectedSection, setSelectedSection] = useState(null);

  const [sections, setSections] = useState([]);
  const [visitedWorks, setVisitedWorks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVisitData = async () => {
      try {
        // 1. Scarichiamo i dati della visita
        const visitResponse = await fetch(`/api/visits/${visitId}/museum`);
        const visitData = await visitResponse.json();

        // Salviamo le opere della visita nello stato
        setVisitedWorks(visitData.works);

        // 2. Usiamo il museumId appena recuperato per scaricare le sezioni
        const sectionsResponse = await fetch(`/api/museums/${visitData.museumId._id}/sections`);
        const sectionsData = await sectionsResponse.json();

        // Salviamo le sezioni della museo nello stato
        setSections(sectionsData);
        setLoading(false);
      } catch (error) {
        console.error("Errore nel caricamento dei dati della visita o delle sezioni:", error);
        setLoading(false);
      }
    }

      fetchVisitData();
    }, [visitId]); // L'array vuoto [] significa "esegui solo all'avvio"

  if (loading) return <div>Caricamento mappa in corso...</div>;

  return (
    // TransformWrapper gestisce la logica di zoom e pan
    <TransformWrapper
      initialScale={1}       /* Lo scale a 1 che hai giustamente scelto */
      minScale={0.5}         /* Zoom out massimo consentito */
      maxScale={2}           /* Zoom in massimo consentito */
      centerOnInit={true}    /* Centra la mappa all'avvio */
    >
      {/* TransformComponent è il contenitore fisico che si sposta */}
      <TransformComponent wrapperStyle={{ width: "100%", height: "80vh" }}>
        
        {/* Il tuo SVG originale */}
        <svg 
          viewBox="0 0 2000 2000" 
          /* Aggiungiamo larghezza e altezza esplicite per far capire 
             alla libreria quanto è grande l'area da muovere */
          style={{ width: "2000px", height: "2000px" }}
        >
          {!selectedSection && (
            <g>
              <SectionLayer sections={sections} onSelect={setSelectedSection} />
            </g>
          )}

          {selectedSection && (
            <g>
              <RoomLayer onBack={() => setSelectedSection(null)} section={selectedSection} visitedWorks={visitedWorks} />
            </g>
          )}
        </svg>

      </TransformComponent>
    </TransformWrapper>
  );
}
