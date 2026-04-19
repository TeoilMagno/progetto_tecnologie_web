import { useState } from "react";
import AreaLayer from "./areaLayer";
import RoomLayer from "./roomLayer";

export default function MapView() {
  const [selectedArea, setSelectedArea] = useState(null);

  return (
    <svg viewBox="0 0 1000 1000">
      {!selectedArea && (
        <g transform="scale(0.5)">
          <AreaLayer onSelect={setSelectedArea} />
        </g>
      )}

      {selectedArea && (
        <g transform="scale(0.5)">
          <RoomLayer area={selectedArea} onBack={() => setSelectedArea(null)} />
        </g>
      )}
    </svg>
  );
}
