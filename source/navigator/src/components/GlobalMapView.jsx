export default function GlobalMapView({ sections, parsedMapData, onSelectSection }) {
  // Funzione che renderizza l'SVG e aggiunge l'onClick ai gruppi delle sezioni
  const renderMapElement = (element) => {
    if (element.type === 'g') {
      // Controlliamo se questo gruppo SVG corrisponde a una sezione nel nostro DB
      const matchedSection = sections.find(sec => sec.svgGroupId === element.props.id);
      
      return (
        <g
          key={element.props.id}
          {...element.props}
          onClick={matchedSection ? () => onSelectSection(matchedSection) : undefined}
          style={{ cursor: matchedSection ? 'pointer' : 'default', ...element.props.style }}
        >
          {element.children && element.children.map(renderMapElement)}
        </g>
      );
    }
    // ... gestisci rect, path, text ecc. (senza onClick)
    return <element.type key={element.props.id} {...element.props} />;
  };

  return (
    <div className="w-full h-full bg-slate-900">
      {/* Viewbox originale intero (es. 1800x1151) */}
      <svg viewBox="0 0 1800 1151" className="w-full h-full">
        {parsedMapData.map(renderMapElement)}
      </svg>
    </div>
  );
}
