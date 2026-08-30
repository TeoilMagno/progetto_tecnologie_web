import React, { useState } from 'react';
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
  // STATO PER LE ANIMAZIONI DI TRANSIZIONE
  const [animationStyle, setAnimationStyle] = useState({
    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: 1,
    transform: 'scale(1)',
    filter: 'blur(0px)'
  });
  
  const zoomViewBox = activeSection?.viewBox 
    ? `${activeSection.viewBox.x} ${activeSection.viewBox.y} ${activeSection.viewBox.width} ${activeSection.viewBox.height}`
    : "0 0 2000 1200";

  const modifiedSvgString = svgString.replace(
    /viewBox="[^"]*"/, 
    `viewBox="${zoomViewBox}"`
  );

  // GESTIONE DEL CLICK CON ANIMAZIONE TIPO "HOLLOW KNIGHT"
  const handleMapClick = (e) => {
    if (activeSection) return; 

    const clickedGroup = e.target.closest('g[id^="section-"]');
    if (clickedGroup) {
      const sectionGroupId = clickedGroup.getAttribute('id');
      const targetSection = sections.find(s => s.svgGroupId === sectionGroupId);
      
      if (targetSection) {
        // 1. Calcoliamo il punto esatto del click per centrare lì lo zoom!
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        // 2. FASE 1: "Tuffo" dentro la mappa (Zoom In rapido, Fade e Blur)
        setAnimationStyle({
          transformOrigin: `${x}% ${y}%`,
          transform: 'scale(3)', // Ingrandisce tantissimo verso il punto cliccato
          opacity: 0,
          filter: 'blur(8px)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
        });

        // 3. FASE 2: Dopo 400ms cambiamo i dati sottostanti mentre la mappa è invisibile
        setTimeout(() => {
          onSelectSection(targetSection);

          // Resettiamo i parametri (senza transizione) pronti per l'entrata della nuova mappa
          setAnimationStyle({
            transformOrigin: 'center',
            transform: 'scale(0.8)', // Parte leggermente rimpicciolita
            opacity: 0,
            filter: 'blur(4px)',
            transition: 'none'
          });

          // 4. FASE 3: Anima l'entrata della vista dettaglio morbida
          setTimeout(() => {
            setAnimationStyle({
              transformOrigin: 'center',
              transform: 'scale(1)',
              opacity: 1,
              filter: 'blur(0px)',
              transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
            });
          }, 50);
        }, 400);
      }
    }
  };

  // ANIMAZIONE QUANDO SI TORNA ALLA VISTA GLOBALE
  const handleBackClick = (e) => {
    e.stopPropagation();

    // 1. Allontanamento (Scala indietro e svanisce)
    setAnimationStyle({
      transformOrigin: 'center',
      transform: 'scale(0.8)',
      opacity: 0,
      filter: 'blur(5px)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    });

    setTimeout(() => {
      onBack();

      // 2. Prepara la vista globale (parte ingrandita)
      setAnimationStyle({
        transformOrigin: 'center',
        transform: 'scale(1.2)',
        opacity: 0,
        filter: 'blur(5px)',
        transition: 'none'
      });

      // 3. Caduta morbida della vista globale
      setTimeout(() => {
        setAnimationStyle({
          transformOrigin: 'center',
          transform: 'scale(1)',
          opacity: 1,
          filter: 'blur(0px)',
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
        });
      }, 50);
    }, 300);
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-900">
      
      {/* TASTO INDIETRO MODIFICATO */}
      {activeSection && (
        <button 
          onClick={handleBackClick}
          className="absolute top-4 left-4 z-50 px-4 py-2 bg-slate-800/80 backdrop-blur border border-white/20 rounded-full text-white text-sm font-semibold shadow-lg hover:bg-slate-700 cursor-pointer"
        >
          ← Torna alla panoramica
        </button>
      )}

      {/* MAGIA CSS PER LA GESTIONE LIVELLI (Con supporto per typo "visita") */}
      <style>
        {`
          g[id="vista-globale"] { display: block; }
          g[id="vista-dettaglio"], g[id="visita-dettaglio"] { display: none; }
        `}

        {activeSection && `
          g[id="vista-globale"] { display: none !important; }
          
          g[id="vista-dettaglio"], g[id="visita-dettaglio"] { display: block !important; }
          
          g[id="vista-dettaglio"] > g, g[id="visita-dettaglio"] > g { display: none; }
          
          g[id="dettaglio-${activeSection.svgGroupId}"] { display: block !important; }
        `}
      </style>

      {/* WRAPPER ZOOM E ANIMAZIONE */}
      <TransformWrapper 
        initialScale={1} 
        minScale={0.5} 
        maxScale={4} 
        centerOnInit={true}
      >
        <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%" }}>
          
          {/* APPLICHIAMO L'ANIMAZIONE DIRETTAMENTE A QUESTO DIV */}
          <div 
            className="relative w-full h-full" 
            onClick={handleMapClick} 
            style={animationStyle}
          >
            
            {/* Livello 1: Mappa SVG */}
            <div 
              className="absolute inset-0 [&>svg]:w-full [&>svg]:h-full"
              dangerouslySetInnerHTML={{ __html: modifiedSvgString }} 
            />

            {/* Livello 2: Opere d'arte */}
            {activeSection && (
              <svg viewBox={zoomViewBox} className="absolute inset-0 w-full h-full pointer-events-none">
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
