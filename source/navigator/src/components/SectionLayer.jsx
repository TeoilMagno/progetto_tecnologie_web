export default function SectionLayer({ sections, onSelect }) {
  if(!sections) return null;
  
  return (
    <>
      {sections.map(section => {
        if (section.shape.type === "polygon") {
          return (
            <polygon
              key={section.id}
              points={section.shape.points}
              fill={section.color}
              stroke="#000"
              strokeWidth="6"
              onClick={() => onSelect(section)}
              style={{ cursor: "pointer" }}
            />
          );
        }

        return null;
      })}
    </>
  );
}
