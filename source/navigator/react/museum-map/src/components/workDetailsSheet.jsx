import { useState, useEffect } from "react";

export default function WorkDetailsSheet({ work, onClose, onSpeak }) {
  // --- LOGICA TRASCINAMENTO BOTTOM SHEET ---
  const [dragStartY, setDragStartY] = useState(null);
  const [dragCurrentY, setDragCurrentY] = useState(0);
  const [currentDescIndex, setCurrentDescIndex] = useState(0);

  const handlePointerDown = (e) => {
    setDragStartY(e.clientY);
    e.target.setPointerCapture(e.pointerId); 
  };

  const handlePointerMove = (e) => {
    if (!dragStartY) return;
    const delta = e.clientY - dragStartY;
    if (delta > 0) setDragCurrentY(delta); 
  };
  
  const handlePointerUp = (e) => {
    if (!dragStartY) return;

    // Se ha trascinato in basso per più di 100px, chiudiamo
    if (dragCurrentY > 100) {
      onClose();
    }
    setDragStartY(null);
    setDragCurrentY(0);
    e.target.releasePointerCapture(e.pointerId);
  };

  const handleMoreDesc = () => {
    if (work?.description && currentDescIndex < work.description.length - 1) {
      const nextIndex = currentDescIndex + 1;
      setCurrentDescIndex(nextIndex);
      onSpeak(work.description[nextIndex].description)
    }
  }

  const handleLessDesc = () => {
    if (work?.description && currentDescIndex > 0) {
      const nextIndex = currentDescIndex - 1;
      setCurrentDescIndex(nextIndex);
      onSpeak(work.description[nextIndex].description)
    }
  }

  // Resettiamo la posizione del menu se l'utente lo chiude con la X
  useEffect(() => {
    if (!work) {
      setDragCurrentY(0);
    }
    setCurrentDescIndex(0);
  }, [work]);

  return (
    <>
      {/* Sfondo scuro semitrasparente che appare dietro al menu */}
      {work && (
        <div 
          onClick={onClose} // Cliccando fuori si chiude
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 10001, backdropFilter: "blur(4px)", transition: "opacity 0.3s ease" }}
        />
      )}

      <div 
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#121218",
          borderTopLeftRadius: "24px",
          borderTopRightRadius: "24px",
          padding: "0", // Togliamo il padding globale per gestire meglio le sezioni interne
          zIndex: 10002,
          boxShadow: "0 -4px 20px rgba(0,0,0,0.5)",
          color: "#fff",
          transform: work ? `translateY(${dragCurrentY}px)` : "translateY(100%)",
          transition: dragStartY ? "none" : "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column" // Utile per far scorrere solo il testo
        }}
      >
        {work && (
          <>
            {/* ─── ZONA DI TRASCINAMENTO (Solo la parte alta) ─── */}
            <div 
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp} // Se il trascinamento viene interrotto (es. notifica)
              style={{
                padding: "24px 24px 10px 24px",
                cursor: "grab", // Fa apparire la manina aperta su PC
                touchAction: "none", // LA MAGIA CSS: Disabilita il "Pull to refresh" del telefono in quest'area!
                position: "relative"
              }}
            >
              {/* Maniglia grigia */}
              <div style={{ width: "40px", height: "5px", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: "10px", margin: "0 auto 20px auto" }} />
              
              {/* Pulsante X in alto a destra */}
              <button 
                onClick={onClose}
                className="btn btn-sm btn-outline-secondary rounded-circle"
                style={{ position: "absolute", top: "16px", right: "20px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <i className="bi bi-x-lg"></i>
              </button>

              <h3 style={{ fontWeight: 800, marginBottom: "4px" }}>{work.name}</h3>
              <p className="text-info mb-0" style={{ fontWeight: 600 }}>{work.author} • {work.year}</p>
            </div>

            {/* ─── ZONA DI LETTURA (Scorrevole, NON trascinabile per chiudere) ─── */}
            <div style={{ padding: "0 24px 24px 24px", overflowY: "auto" }}>
              <img 
                src={work.image} 
                alt={work.name} 
                style={{ width: "100%", maxHeight: "250px", objectFit: "cover", borderRadius: "12px", marginBottom: "20px", marginTop: "10px" }} 
              />

              <h6 className="text-white-50 uppercase tracking-wider mb-2" style={{ fontSize: "0.8rem", fontWeight: 700 }}>Descrizione</h6>
              <p style={{ lineHeight: "1.6", color: "#ccc", fontSize: "0.95rem", marginBottom: "30px" }}>
                {work.description?.[0]?.description || "Nessuna descrizione disponibile per quest'opera."}
              </p>

              {/* Tasti */}
              <div className="d-flex gap-2">
                <button
                  onClick={handleLessDesc}
                  className="btn btn-outline-light flex-grow-1 rounded-pill" style={{ borderColor: "rgba(255,255,255,0.2)" }}
                >
                  <i className="bi bi-volume-up me-2"></i> Dimmi di meno
                </button>
                <button 
                  onClick={() => onSpeak(work.description?.[currentDescIndex]?.description)}
                  className="btn btn-info flex-grow-1 rounded-pill" 
                  style={{ fontWeight: 600 }}
                >
                  <i className="bi bi-volume-up me-2"></i> Ascolta
                </button>
                <button
                  onClick={handleMoreDesc}
                  className="btn btn-outline-light flex-grow-1 rounded-pill" style={{ borderColor: "rgba(255,255,255,0.2)" }}
                >
                  <i className="bi bi-volume-up me-2"></i> Dimmi di più
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
