export default function AreaLayer({ areas, onSelect }) {
  if(!areas) return null;
  
  return (
    <>
      {areas.map(area => {
        if (area.shape.type === "polygon") {
          return (
            <polygon
              key={area.id}
              points={area.shape.points}
              fill={area.color}
              stroke="#000"
              strokeWidth="6"
              onClick={() => onSelect(area)}
              style={{ cursor: "pointer" }}
            />
          );
        }

        return null;
      })}
    </>
  );
}
