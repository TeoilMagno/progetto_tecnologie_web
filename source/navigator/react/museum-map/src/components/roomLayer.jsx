export default function RoomLayer({ area, onBack }) {
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
      {area.works && area.works.map((work) => (
        <foreignObject
          key={work.id}
          x={work.x} // coordinata X presa dai dati
          y={work.y} // coordinata Y presa dai dati
          width="160" // larghezza della finestrella HTML
          height="120" // altezza della finestrella HTML
        >
          {/* Da qui in poi usiamo HTML normale per disegnare la card */}
          <div
            style={{
              backgroundColor: "white",
              border: "2px solid #333",
              borderRadius: "8px",
              padding: "10px",
              display: "flex",
              flexDirection: "column",
              alignworks: "center",
              justifyContent: "center",
              fontFamily: "sans-serif",
            }}
          >
            <img src={work.image}/>
            <strong style={{ fontSize: "14px", textAlign: "center" }}>
              {work.name}
            </strong>
            <button
              onClick={() => alert(`Apro i dettagli di: ${work.name}`)}
              style={{
                marginTop: "8px",
                padding: "4px 8px",
                cursor: "pointer",
                backgroundColor: "#007BFF",
                color: "white",
                border: "none",
                borderRadius: "4px"
              }}
            >
              Vedi
            </button>
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
