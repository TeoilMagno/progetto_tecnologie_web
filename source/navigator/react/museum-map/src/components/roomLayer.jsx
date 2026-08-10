import { useState, useEffect } from "react";

export default function RoomLayer({ onBack, section, visitedWorks, activeWorkId }) {
  const [works, setWorks] = useState([]);
  const [filteredWorks, setFilteredWorks] = useState([]);

  useEffect(() => {
    console.log(section);
    fetch(`/api/sections/${section._id}/works`)
      .then((response) => response.json())
      .then((data) => {
        setWorks(data); // Salviamo tutte le opere della sezione (per sicurezza/cache)
        
        // --- CONFRONTO E FILTRAGGIO ---
        // Controlliamo quali opere della sezione sono presenti nella visita
        console.log("sectionWork ",data, "visitedWorks ", visitedWorks);
        const worksToShow = data.filter(fetchedWork => {
          return visitedWorks.some(vw => vw._id === fetchedWork._id);
        });

        //associamo i lavori filtrati con le loro coordinate contenute in section.works
        const finalWorks = worksToShow.map(work => {
          const coords = section.works.find(sw => sw.workId === work._id);
          
          return {
            ...work,
            x: coords ? coords.x : 0,
            y: coords ? coords.y : 0
          };
        });
        
        setFilteredWorks(finalWorks);
      })
      .catch((error) => console.error("Errore nel caricamento delle opere:", error));
      
  }, [section._id, visitedWorks, section.works]);

  return (
    <>
      {/* 1. DISEGNO LE STANZE (il tuo codice originale) */}
      {section.rooms.map((room) => {
        if (room.shape.type === "polygon") {
          return (
            <polygon
              key={room._id || room.id}
              points={room.shape.points}
              fill={section.color}
              stroke="#000"
              strokeWidth="6"
              onClick={() => alert(room.name)}
              style={{ cursor: "pointer" }}
            />
          );
        } else if (room.shape.type === "polyline") {
          return (
            <polyline
              key={room._id || room.id}
              points={room.shape.points}
              fill={section.color}
              stroke="#000"
              strokeWidth="6"
              onClick={() => alert(room.name)}
              style={{ cursor: "pointer" }}
            />
          );
        } else if (room.shape.type === "path") {
          return (
            <path
              key={room._id || room.id}
              d={room.shape.d}
              fill={section.color}
              stroke="#000"
              strokeWidth="6"
              onClick={() => alert(room.name)}
              style={{ cursor: "pointer" }}
            />
          );
        }
        return null;
      })}

      {/* 2. DISEGNO I WORK / OPERE D'ARTE (La novità!) */}
      {/* Controllo se ci sono work nell'area, e li stampo */}
      {filteredWorks.map((work) => {
        const isActive = activeWorkId === work._id;
        return (
          <foreignObject
            key={work._id}
            x={work.x}
            y={work.y}
            width="120"
            height="220" /* Rendiamolo bello grande, tanto il resto sarà trasparente! */
            style={{ overflow: "visible" }}
          >
            <div
              style={{
                width: "100%", 
                height: "fit-content", /* LA MAGIA: il div si adatta al contenuto reale */
                backgroundColor: isActive ? "rgba(126, 20, 255, 0.1)" : "white",
                border: isActive ? "3px solid #7e14ff" : "1px solid #ccc", /* Bordo applicato al contenitore principale */
                borderRadius: "6px",
                padding: "0px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                fontFamily: "sans-serif",
                overflow: "hidden",
                boxShadow: isActive ? "0 0 20px rgba(126, 20, 255, 0.6)" : "0 2px 4px rgba(0,0,0,0.1)", /* Un'ombreggiatura per farla staccare meglio dalla mappa */
                transform: isActive ? "scale(1.1)" : "scale(1)",
                transition: "all 0.3s ease",
                zIndex: isActive ? 100 : 1
              }}
            >
              <img
                src={work.image}
                alt={work.name}
                style={{
                  width: "100%",
                  height: "100px", /* Visto che il div si adatta, diamo un'altezza fissa in pixel all'immagine */
                  objectFit: "cover",
                }}
              />

              {/* Contenitore per il testo */}
              <div style={{ padding: "6px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <strong style={{ fontSize: "11px", textAlign: "center", lineHeight: "1.2", color: isActive ? "#fff" : "#000" }}>
                  {work.name}
                </strong>
                <span style={{ fontSize: "10px", color: isActive ? "#ccc" : "#666", marginTop: "2px", textAlign: "center" }}>
                  {work.author}
                </span>
              </div>
            </div>
          </foreignObject>
        );
      })}

      {/* 3. BOTTONE BACK (il tuo codice originale) */}
      <text
        x="10"
        y="40" /* Ho abbassato un po' la Y per renderlo più cliccabile */
        onClick={onBack}
        style={{ cursor: "pointer", fontSize: "40px", fontWeight: "bold", fill: "#fff" }}
      >
        ← Indietro
      </text>
    </>
  );
}
