import { mapData } from "../data/mapData";

export default function AreaLayer({ onSelect }) {
  return (
    <>
      {mapData.areas.map(area => {
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
