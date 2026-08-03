import { useState, useEffect } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import SectionLayer from "./sectionLayer";
import RoomLayer from "./roomLayer";

export default function MapView({ museumId }) {
  const [selectedSection, setSelectedSection] = useState(null);

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      // Sostituisci "ID_DEL_TUO_MUSEO" con l'ID reale (o passalo come prop)
      fetch(`/api/museums/${museumId}/sections`)
        .then((response) => response.json())
        .then((data) => {
          setSections(data); // Salviamo le sezioni nello stato
          setLoading(false); // Fine caricamento
        })
        .catch((error) => {
          console.error("Errore nel caricamento delle sezioni:", error);
          setLoading(false);
        });
    }, []); // L'array vuoto [] significa "esegui solo all'avvio"

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
              <RoomLayer section={selectedSection} onBack={() => setSelectedSection(null)} />
            </g>
          )}
        </svg>

      </TransformComponent>
    </TransformWrapper>
  );
}
