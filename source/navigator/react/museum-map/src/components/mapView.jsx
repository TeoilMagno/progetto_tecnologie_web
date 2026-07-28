import { useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import AreaLayer from "./areaLayer";
import RoomLayer from "./roomLayer";

export default function MapView() {
  const [selectedArea, setSelectedArea] = useState(null);

  return (
    // TransformWrapper gestisce la logica di zoom e pan
    <TransformWrapper
      initialScale={1}       /* Lo scale a 1 che hai giustamente scelto */
      minScale={0.5}         /* Zoom out massimo consentito */
      maxScale={4}           /* Zoom in massimo consentito */
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
              <AreaLayer onSelect={setSelectedArea} />
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
