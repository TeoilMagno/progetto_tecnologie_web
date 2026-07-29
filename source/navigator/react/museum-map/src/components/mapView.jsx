import { useState, useEffect } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import AreaLayer from "./areaLayer";
import RoomLayer from "./roomLayer";

export default function MapView() {
  const [selectedArea, setSelectedArea] = useState(null);

  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      // Sostituisci "ID_DEL_TUO_MUSEO" con l'ID reale (o passalo come prop)
      fetch("http://localhost:8000/api/museums/ID_DEL_TUO_MUSEO/sections")
        .then((response) => response.json())
        .then((data) => {
          setAreas(data); // Salviamo le sezioni nello stato
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
          {!selectedArea && (
            <g>
              <AreaLayer areas={areas} onSelect={setSelectedArea} />
            </g>
          )}

          {selectedArea && (
            <g>
              <RoomLayer area={selectedArea} onBack={() => setSelectedArea(null)} />
            </g>
          )}
        </svg>

      </TransformComponent>
    </TransformWrapper>
  );
}
