import { useState, useEffect } from "react";

export default function RoomLayer({ area, onBack }) {
  const [works, setWorks] = useState([]);

  useEffect(() => {
    // Usiamo l'ID della sezione (area) per fare la chiamata alla tua seconda API
    fetch(`http://localhost:8000/api/sections/${area._id}/works`)
      .then((response) => response.json())
      .then((data) => {
        setWorks(data);
      })
      .catch((error) => console.error("Errore nel caricamento delle opere:", error));
      
  }, [area._id]); // Esegui la chiamata ogni volta che cambia l'ID dell'area

  return (
    <>
      {/* 1. DISEGNO LE STANZE (il tuo codice originale) */}
      {area.rooms.map((room) => {
        if (room.shape.type === "polygon") {
          return (
            <polygon
              key={room.id}
              points={room.shape.points}
              fill={room.color}
              stroke="#000"
              strokeWidth="6"
              onClick={() => alert(room.name)}
            />
          );
        } else if (room.shape.type === "polyline") {
          return (
            <polyline
              key={room.id}
              points={room.shape.points}
              fill={room.color}
              stroke="#000"
              strokeWidth="6"
              onClick={() => alert(room.name)}
            />
          );
        } else if (room.shape.type === "path") {
          return (
            <path
              key={room.id}
              d={room.shape.d}
              fill={room.color}
              stroke="#000"
              strokeWidth="6"
              onClick={() => alert(room.name)}
            />
          );
        }
        return null;
      })}

      {/* 2. DISEGNO I WORK / OPERE D'ARTE (La novità!) */}
      {/* Controllo se ci sono work nell'area, e li stampo */}
      {works.map((work) => (
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
            backgroundColor: "white",
            border: "1px solid #ccc", /* Bordo applicato al contenitore principale */
            borderRadius: "6px",
            padding: "0px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontFamily: "sans-serif",
            overflow: "hidden",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)", /* Un'ombreggiatura per farla staccare meglio dalla mappa */
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
        <strong style={{ fontSize: "11px", textAlign: "center", lineHeight: "1.2" }}>
        {work.name}
        </strong>
        <span style={{ fontSize: "10px", color: "#666", marginTop: "2px", textAlign: "center" }}>
        {work.author}
        </span>
        </div>
        </div>
        </foreignObject>
      ))}

      {/* 3. BOTTONE BACK (il tuo codice originale) */}
      <text
        x="10"
        y="40" /* Ho abbassato un po' la Y per renderlo più cliccabile */
        onClick={onBack}
        style={{ cursor: "pointer", fontSize: "40px", fontWeight: "bold" }}
      >
        ← Indietro
      </text>
    </>
  );
}
