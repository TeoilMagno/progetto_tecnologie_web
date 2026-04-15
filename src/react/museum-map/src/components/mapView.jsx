import { useState } from "react";
import AreaLayer from "./areaLayer";
import RoomLayer from "./roomLayer";

export default function MapView() {
  const [selectedArea, setSelectedArea] = useState(null);

  return (
    <svg viewBox="0 0 1000 1000">
      {!selectedArea && (
        <AreaLayer onSelect={setSelectedArea} />
      )}

      {selectedArea && (
        <RoomLayer
          area={selectedArea}
          onBack={() => setSelectedArea(null)}
        />
      )}
    </svg>
  );
}
