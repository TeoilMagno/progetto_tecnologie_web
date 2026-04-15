import { mapData } from "../data/mapData";

export default function AreaLayer({ onSelect }) {
  return mapData.areas.map(area => (
    <path
      key={area.id}
      d={area.path}
      fill={area.color}
      onClick={() => onSelect(area)}
      style={{ cursor: "pointer" }}
    />
  ));
}
