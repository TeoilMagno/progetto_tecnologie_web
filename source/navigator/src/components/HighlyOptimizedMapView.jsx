import React from 'react';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

export default function HighlyOptimizedMapView({ 
  svgString, 
  activeSection, 
  sections, 
  onSelectSection, 
  onBack,
  works,
  activeWorkId,
  onWorkClick
}) {
  
  // 1. Calcoliamo il viewBox.
  const zoomViewBox = activeSection?.viewBox 
    ? `${activeSection.viewBox.x} ${activeSection.viewBox.y} ${activeSection.viewBox.width} ${activeSection.viewBox.height}`
    : "0 0 2000 2000";

  // 2. Aggiorniamo la stringa SVG
  const modifiedSvgString = svgString.replace(
    /viewBox="[^"]*"/, 
    `viewBox="${zoomViewBox}"`
  );

  // 3. Gestiamo i click sulle aree colorate
  const handleMapClick = (e) => {
    if (activeSection) return; 

    const clickedGroup = e.target.closest('g[id^="section-"]');
    if (clickedGroup) {
      const sectionGroupId = clickedGroup.getAttribute('id');
      const targetSection = sections.find(s => s.svgGroupId === sectionGroupId);
      if (targetSection) onSelectSection(targetSection);
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-900">
      
      {/* TASTO INDIETRO */}
      {activeSection && (
        <button 
          onClick={(e) => { e.stopPropagation(); onBack(); }}
          className="absolute top-4 left-4 z-50 px-4 py-2 bg-slate-800/80 backdrop-blur border border-white/20 rounded-full text-white text-sm font-semibold shadow-lg hover:bg-slate-700 cursor-pointer"
        >
          ← Torna alla panoramica
        </button>
      )}

      {/* MAGIA CSS */}
      <style>
        {`
          /* COMPORTAMENTO DI BASE (Quando guardi tutto il museo) */
          /* Mostriamo la mappa approssimata e nascondiamo i dettagli */
          g[id="vista-globale"] { display: block; }
          g[id="vista-dettaglio"] { display: none; }
        `}

        {activeSection && `
          /* QUANDO ENTRI IN UNA SEZIONE (Zoom) */
          /* 1. Nascondiamo i blocchettoni approssimati */
          g[id="vista-globale"] { display: none !important; }
          
          /* 2. Accendiamo il livello dei dettagli */
          g[id="vista-dettaglio"] { display: block !important; }
          
          /* 3. Nascondiamo TUTTE le sezioni dettagliate... */
          g[id="vista-dettaglio"] g[id^="section-"] { display: none; }
          
          /* 4. ...tranne quella attiva! */
          g[id="${activeSection.svgGroupId}"] { display: block !important; }
        `}
      </style>

      {/* IL WRAPPER PER LO ZOOM */}
      <TransformWrapper 
        initialScale={1} 
        minScale={0.5} 
        maxScale={4} 
        centerOnInit={true}
      >
        <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%" }}>
          
          <div className="relative w-full h-full" onClick={handleMapClick}>
            
            {/* Livello 1: Mappa SVG (L'unico che deve esserci!) */}
            <div 
              className="absolute inset-0 [&>svg]:w-full [&>svg]:h-full transition-all duration-700 ease-in-out"
              dangerouslySetInnerHTML={{ __html: modifiedSvgString }} 
            />

            {/* Livello 2: Opere d'arte */}
            {activeSection && (
              <svg viewBox={zoomViewBox} className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-700 ease-in-out">
                {works.map((work) => {
                  const isActive = activeWorkId === work._id;
                  const coords = activeSection.works?.find(sw => (sw.workId?._id || sw.workId) === work._id);
                  if (!coords) return null;

                  return (
                    <foreignObject key={work._id} x={coords.x} y={coords.y} width="120" height="220" style={{ overflow: "visible", pointerEvents: "auto" }}>
                      <div
                        onClick={() => onWorkClick(work)}
                        style={{
                          cursor: "pointer", width: "100%", height: "fit-content",
                          backgroundColor: isActive ? "rgba(126, 20, 255, 0.1)" : "white",
                          border: isActive ? "3px solid #7e14ff" : "1px solid #ccc",
                          borderRadius: "6px", display: "flex", flexDirection: "column", alignItems: "center",
                          boxShadow: isActive ? "0 0 20px rgba(126, 20, 255, 0.6)" : "0 2px 4px rgba(0,0,0,0.1)",
                          transform: isActive ? "scale(1.1)" : "scale(1)", transition: "all 0.3s ease",
                          zIndex: isActive ? 100 : 1
                        }}
                      >
                        <img src={work.image} alt={work.name} loading="lazy" style={{ width: "100%", height: "100px", objectFit: "cover" }} />
                        <div style={{ padding: "6px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <strong style={{ fontSize: "11px", textAlign: "center", lineHeight: "1.2", color: isActive ? "#fff" : "#000" }}>{work.name}</strong>
                        </div>
                      </div>
                    </foreignObject>
                  );
                })}
              </svg>
            )}
          </div>
          
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
