export default function RoomLayer({ area, onBack }) {
  return (
    <>
      {area.rooms.map(room => {
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

      {/* Bottone back */}
      <text x="10" y="20" onClick={onBack} style={{ cursor: "pointer" }}>
        ← Indietro
      </text>
    </>
  );
}
