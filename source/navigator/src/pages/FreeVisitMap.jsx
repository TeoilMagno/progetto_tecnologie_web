import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize, MapPin, AlertCircle } from 'lucide-react';
import mappaCompleta from '../assets/mappa-completa.svg';

export default function FreeVisitMap({ selectedMuseum }) {
  // Stati per la mappa (Zoom & Pan)
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef(null);
  const mapRef = useRef(null);

  // Gestione Zoom con pulsanti
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Gestione Zoom con la rotella del mouse
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = 0.1;
    let newScale = scale + (e.deltaY < 0 ? zoomFactor : -zoomFactor);
    newScale = Math.max(0.5, Math.min(4, newScale));
    setScale(newScale);
  };

  // Drag (Mouse)
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch (Smartphone)
  const touchDistanceRef = useRef(0);

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistanceRef.current = dist;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      });
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = dist - touchDistanceRef.current;
      if (Math.abs(delta) > 5) {
        const factor = delta > 0 ? 0.05 : -0.05;
        let newScale = scale + factor;
        newScale = Math.max(0.5, Math.min(4, newScale));
        setScale(newScale);
        touchDistanceRef.current = dist;
      }
    }
  };

  const handleTouchEnd = () => setIsDragging(false);

  // Preveniamo lo scroll nativo nell'area della mappa
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventDefault = (e) => e.preventDefault();
    container.addEventListener('wheel', preventDefault, { passive: false });
    container.addEventListener('touchmove', preventDefault, { passive: false });

    return () => {
      container.removeEventListener('wheel', preventDefault);
      container.removeEventListener('touchmove', preventDefault);
    };
  }, []);

  // --- SEZIONE COERENZA MUSEO: PLACEHOLDER SE NON MET ---
  if (!selectedMuseum || selectedMuseum.name !== 'MET') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-950 p-6 text-center">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl mb-4 max-w-sm flex flex-col items-center shadow-lg shadow-amber-500/5">
          <div className="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mb-4">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Mappa non disponibile</h3>
          <p className="text-sm text-slate-400 mb-6">
            La mappa interattiva vettoriale in questa fase del prototipo è disponibile esclusivamente per il museo **MET (Metropolitan Museum of Art)**.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="btn bg-amber-500 text-slate-950 hover:bg-amber-400 px-6 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-amber-500/10 active:scale-95 transition-all"
          >
            Seleziona il museo MET
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden flex flex-col">
      
      {/* ─── BANNER INTERNO MAPPA ─── */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-3 rounded-xl shadow-lg max-w-[240px]">
        <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
          <MapPin size={16} className="text-amber-500 shrink-0" />
          Mappa del Museo MET
        </h3>
        <p className="text-[10px] text-slate-400">Pizzica lo schermo o usa la rotella per lo zoom. Trascina per spostarti.</p>
      </div>

      {/* ─── CANVASS VISUALIZZAZIONE MAPPA ─── */}
      <div 
        ref={containerRef}
        className={`flex-1 w-full h-full relative flex items-center justify-center select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleReset}
        onWheel={handleWheel}
      >
        <div 
          ref={mapRef}
          className="transition-transform duration-75 ease-out select-none relative"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            width: '85%',
            height: '85%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* File Vettoriale di Base */}
          <img 
            src={mappaCompleta} 
            alt="Mappa del museo MET" 
            className="w-full h-auto max-h-full object-contain pointer-events-none select-none"
          />
        </div>
      </div>

      {/* ─── PULSANTIERA DI CONTROLLO ZOOM ─── */}
      <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2">
        <button 
          onClick={handleZoomIn}
          className="w-10 h-10 bg-slate-900/95 hover:bg-slate-800 text-white border border-slate-800 rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
          title="Ingrandisci"
        >
          <ZoomIn size={18} />
        </button>
        <button 
          onClick={handleZoomOut}
          className="w-10 h-10 bg-slate-900/95 hover:bg-slate-800 text-white border border-slate-800 rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
          title="Rimpicciolisci"
        >
          <ZoomOut size={18} />
        </button>
        <button 
          onClick={handleReset}
          className="w-10 h-10 bg-slate-900/95 hover:bg-slate-800 text-white border border-slate-800 rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
          title="Centra Mappa"
        >
          <Maximize size={18} />
        </button>
      </div>
    </div>
  );
}
