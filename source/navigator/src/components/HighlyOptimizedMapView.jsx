import React, { useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";

const HighlyOptimizedMapView = forwardRef(({ 
  svgString, 
  activeSection, 
  sections, 
  onSelectSection, 
  onBack,
  works,
  activeWorkId,
  onWorkClick,
  disablePanZoom
}, ref) => {
  // STATO PER LE ANIMAZIONI DI TRANSIZIONE
  const [animationStyle, setAnimationStyle] = useState({
    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: 1,
    transform: 'scale(1)',
    filter: 'blur(0px)'
  });
  
  const zoomViewBox = activeSection?.viewBox 
    ? `${activeSection.viewBox.x + (activeSection.viewBox.width * 0.1)} ${activeSection.viewBox.y + (activeSection.viewBox.height * 0.1)} ${activeSection.viewBox.width * 0.8} ${activeSection.viewBox.height * 0.8}`
    : "0 0 2000 1200";

  const modifiedSvgString = useMemo(
    () => svgString.replace(/viewBox="[^"]*"/, `viewBox="${zoomViewBox}"`),
    [svgString, zoomViewBox]
  );

  // ESPOSIZIONE ANIMAZIONI AL COMPONENTE PADRE
  useImperativeHandle(ref, () => ({
    flyToSection: (targetSection) => {
      // Se siamo già nella vista globale, entra direttamente
      if (!activeSection) {
        setAnimationStyle({
          transformOrigin: 'center', transform: 'scale(1.5)', opacity: 0,
          filter: 'blur(5px)', transition: 'none'
        });
        setTimeout(() => {
          onSelectSection(targetSection);
          setAnimationStyle({
            transformOrigin: 'center', transform: 'scale(1)', opacity: 1,
            filter: 'blur(0px)', transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
          });
        }, 50);
        return;
      }

      // Zoom out (esce dalla sezione attuale)
      setAnimationStyle({
        transformOrigin: 'center',
        transform: 'scale(0.8)',
        opacity: 0,
        filter: 'blur(5px)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      });

      setTimeout(() => {
        onBack(); // Torna alla mappa globale
        
        // Prepara l'ingresso "dall'alto"
        setAnimationStyle({
          transformOrigin: 'center',
          transform: 'scale(1.5)',
          opacity: 0,
          filter: 'blur(5px)',
          transition: 'none'
        });

        setTimeout(() => {
          onSelectSection(targetSection); // Passa alla nuova sezione
          
          // Zoom in (entra nella nuova sezione)
          setAnimationStyle({
            transformOrigin: 'center',
            transform: 'scale(1)',
            opacity: 1,
            filter: 'blur(0px)',
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
          });
        }, 50);
      }, 350);
    }
  }));

  // GESTIONE DEL CLICK MANUALE CON ANIMAZIONE
  const handleMapClick = (e) => {
    if (activeSection) return; 

    const clickedGroup = e.target.closest('g[id^="section-"]');
    if (clickedGroup) {
      const sectionGroupId = clickedGroup.getAttribute('id');
      const targetSection = sections.find(s => s.svgGroupId === sectionGroupId);
      
      if (targetSection) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setAnimationStyle({
          transformOrigin: `${x}% ${y}%`,
          transform: 'scale(3)',
          opacity: 0,
          filter: 'blur(8px)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
        });

        setTimeout(() => {
          onSelectSection(targetSection);

          setAnimationStyle({
            transformOrigin: 'center',
            transform: 'scale(0.8)',
            opacity: 0,
            filter: 'blur(4px)',
            transition: 'none'
          });

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

  // ANIMAZIONE QUANDO SI TORNA ALLA VISTA GLOBALE MANUALMENTE
  const handleBackClick = (e) => {
    e.stopPropagation();

    setAnimationStyle({
      transformOrigin: 'center',
      transform: 'scale(0.8)',
      opacity: 0,
      filter: 'blur(5px)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    });

    setTimeout(() => {
      onBack();

      setAnimationStyle({
        transformOrigin: 'center',
        transform: 'scale(1.2)',
        opacity: 0,
        filter: 'blur(5px)',
        transition: 'none'
      });

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
      
      {/* TASTO INDIETRO */}
      {activeSection && (
        <button 
          onClick={handleBackClick}
          className="absolute top-4 left-4 z-50 px-4 py-2 bg-slate-800/80 backdrop-blur border border-white/20 rounded-full text-white text-sm font-semibold shadow-lg hover:bg-slate-700 cursor-pointer"
        >
          ← Torna alla panoramica
        </button>
      )}

      {/* GESTIONE LIVELLI CSS */}
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

      {/* WRAPPER ZOOM CON CONTROLLI FLUTTUANTI */}
      <TransformWrapper 
        initialScale={1} 
        minScale={0.5} 
        maxScale={4} 
        centerOnInit={true}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%" }}>
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
                      const coords = activeSection.works?.find(sw => {
                        const swId = (sw.workId?._id || sw.workId)?.toString();
                        return swId && swId === work._id?.toString();
                      });
                      if (!coords) return null;

                      // Dimensioni dinamiche: più grandi per l'opera attiva, piccole per le altre
                      // Dimensioni ingrandite per le inattive (48px) e strutturate per l'attiva
                      const objWidth = isActive ? 130 : 48;
                      const objHeight = isActive ? 150 : 56; // 48px immagine + 8px per la micro-punta del pin

                      return (
                        <foreignObject 
                          key={work._id} 
                          x={coords.x - (objWidth / 2)} 
                          y={coords.y - objHeight} 
                          width={objWidth} 
                          height={objHeight} 
                          style={{ overflow: "visible", pointerEvents: "auto" }}
                        >
                          <div
                            onClick={() => onWorkClick(work)}
                            style={{
                              cursor: "pointer", width: "100%", height: "100%",
                              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
                              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                              zIndex: isActive ? 100 : 1,
                              opacity: isActive ? 1 : 0.85
                            }}
                          >
                            {isActive ? (
                              // CARD OPERA ATTIVA (Invariata nella struttura, grande e con nome)
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
                                <div style={{
                                  backgroundColor: "white",
                                  border: "3px solid #7e14ff",
                                  borderRadius: "8px",
                                  display: "flex", flexDirection: "column", alignItems: "center",
                                  boxShadow: "0 0 20px rgba(126, 20, 255, 0.6)",
                                  width: "100%",
                                  overflow: "hidden"
                                }}>
                                  <img src={work.image} alt={work.name} loading="lazy" style={{ width: "100%", height: "85px", objectFit: "cover" }} />
                                  <div style={{ padding: "8px 6px", width: "100%", backgroundColor: "white" }}>
                                    <strong style={{ fontSize: "11px", textAlign: "center", lineHeight: "1.2", color: "#000", display: "block" }}>
                                      {work.name}
                                    </strong>
                                  </div>
                                </div>
                                {/* Puntina verso il basso */}
                                <div style={{
                                  width: 0, height: 0,
                                  borderLeft: "8px solid transparent",
                                  borderRight: "8px solid transparent",
                                  borderTop: "10px solid #7e14ff",
                                  marginTop: "-1px"
                                }} />
                              </div>
                            ) : (
                              // MARKER INATTIVO MODERNO (A forma di pin squadrato con micro-punta)
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
                                <div style={{
                                  width: "48px", height: "48px",
                                  borderRadius: "12px", // Angoli smussati in stile app moderna
                                  border: "2.5px solid white",
                                  overflow: "hidden",
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                                  backgroundColor: "#1e293b",
                                  transition: "transform 0.2s ease",
                                }}>
                                  <img src={work.image} alt={work.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                </div>
                                {/* Piccola punta del pin */}
                                <div style={{
                                  width: 0, height: 0,
                                  borderLeft: "5px solid transparent",
                                  borderRight: "5px solid transparent",
                                  borderTop: "6px solid white",
                                  marginTop: "-1px"
                                }} />
                              </div>
                            )}
                          </div>
                        </foreignObject>
                      );
                    })}
                  </svg>
                )}
              </div>
            </TransformComponent>

            {/* PULSANTI ZOOM (+), ZOOM (-) E RESET ADATTAMENTO SCHERMO */}
            <div className="absolute bottom-6 right-6 z-40 flex flex-col gap-2.5">
              <button 
                type="button"
                onClick={() => zoomIn(0.3)}
                className="w-11 h-11 bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700/80 rounded-2xl flex items-center justify-center shadow-xl backdrop-blur-md active:scale-95 transition-all cursor-pointer"
                title="Ingrandisci"
              >
                <ZoomIn size={20} />
              </button>
              <button 
                type="button"
                onClick={() => zoomOut(0.3)}
                className="w-11 h-11 bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700/80 rounded-2xl flex items-center justify-center shadow-xl backdrop-blur-md active:scale-95 transition-all cursor-pointer"
                title="Rimpicciolisci"
              >
                <ZoomOut size={20} />
              </button>
              <button 
                type="button"
                onClick={() => resetTransform()}
                className="w-11 h-11 bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700/80 rounded-2xl flex items-center justify-center shadow-xl backdrop-blur-md active:scale-95 transition-all cursor-pointer"
                title="Ripristina visualizzazione a schermo intero"
              >
                <Maximize size={20} />
              </button>
            </div>
          </>
        )}
      </TransformWrapper>
    </div>
  );
});

export default HighlyOptimizedMapView;