import { useState, useEffect } from "react";

export default function RoomLayer({ onBack, section, visitedWorks = null }) {
  const [works, setWorks] = useState([]);
  const [filteredWorks, setFilteredWorks] = useState([]);

  useEffect(() => {
    fetch(`/api/sections/${section._id}/works`)
      .then((response) => response.json())
      .then((data) => {
        setWorks(data);

        // Se visitedWorks è fornito (visita guidata), filtriamo solo quelle della visita.
        // Se è null/undefined (visita libera), mostriamo TUTTE le opere presenti nella sezione!
        const worksToShow = Array.isArray(visitedWorks) && visitedWorks.length > 0
          ? data.filter(fetchedWork => visitedWorks.some(vw => (vw._id || vw) === fetchedWork._id))
          : data;

        // Associamo le opere con le coordinate definite in section.works
        const finalWorks = worksToShow.map(work => {
          const coords = section.works ? section.works.find(sw => sw.workId === work._id || sw.workId?._id === work._id) : null;
          
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
      {/* 1. DISEGNO LE STANZE */}
      {section.rooms && section.rooms.map((room) => {
        if (room.shape.type === "polygon") {
          return (
            <polygon
              key={room.id || room._id}
              points={room.shape.points}
              fill={section.color || "#475569"}
              stroke="#000"
              strokeWidth="6"
              onClick={() => alert(room.name)}
            />
          );
        } else if (room.shape.type === "polyline") {
          return (
            <polyline
              key={room.id || room._id}
              points={room.shape.points}
              fill={section.color || "#475569"}
              stroke="#000"
              strokeWidth="6"
              onClick={() => alert(room.name)}
            />
          );
        } else if (room.shape.type === "path") {
          return (
            <path
              key={room.id || room._id}
              d={room.shape.d}
              fill={section.color || "#475569"}
              stroke="#000"
              strokeWidth="6"
              onClick={() => alert(room.name)}
            />
          );
        }
        return null;
      })}

      {/* 2. DISEGNO TUTTE LE OPERE D'ARTE */}
      {filteredWorks.map((work) => (
        <foreignObject
          key={work._id}
          x={work.x}
          y={work.y}
          width="120"
          height="220"
          style={{ overflow: "visible" }}
        >
          <div
            style={{
              width: "100%", 
              height: "fit-content",
              backgroundColor: "white",
              border: "1px solid #ccc",
              borderRadius: "6px",
              padding: "0px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              fontFamily: "sans-serif",
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              cursor: "pointer"
            }}
            onClick={() => alert(`${work.name || work.title}\nAutore: ${work.author || 'N/A'}`)}
          >
            <img
              src={work.image || "/placeholder.jpg"}
              alt={work.name || work.title}
              style={{
                width: "100%",
                height: "100px",
                objectFit: "cover",
              }}
            />

            <div style={{ padding: "6px", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <strong style={{ fontSize: "11px", textAlign: "center", lineHeight: "1.2", color: "#0f172a" }}>
                {work.name || work.title}
              </strong>
              <span style={{ fontSize: "10px", color: "#64748b", marginTop: "2px", textAlign: "center" }}>
                {work.author || "Autore sconosciuto"}
              </span>
            </div>
          </div>
        </foreignObject>
      ))}

      {/* 3. PULSANTE BACK */}
      <text
        x="20"
        y="60"
        onClick={onBack}
        fill="#f59e0b"
        style={{ cursor: "pointer", fontSize: "40px", fontWeight: "bold", userSelect: "none" }}
      >
        ← Sezioni
      </text>
    </>
  );
}