export default function RoomLayer({ area, onBack }) {
  return (
    <>
      {area.rooms.map(room => (
        <path
          key={room.id}
          d={room.path}
          fill="#ccc"
          stroke="#333"
          onClick={() => alert(room.name)}
        />
      ))}

      {/* Bottone back */}
      <text x="10" y="20" onClick={onBack} style={{ cursor: "pointer" }}>
        ← Indietro
      </text>
    </>
  );
}
