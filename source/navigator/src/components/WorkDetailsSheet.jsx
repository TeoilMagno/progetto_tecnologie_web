import { useState } from "react";
import WorkDetailsContent from "./WorkDetailsContent";

export default function WorkDetailsSheet({ 
  work, 
  onClose, 
  guide,
  onPrev, 
  onNext, 
  hasPrev, 
  hasNext, 
  socket, 
  roomCode, 
  isSharedSession, 
  isTeacher
}) {
  const [dragStartY, setDragStartY] = useState(null);
  const [dragCurrentY, setDragCurrentY] = useState(0);

  const handlePointerDown = (e) => {
    if (window.innerWidth >= 768) return;
    setDragStartY(e.clientY);
    e.target.setPointerCapture(e.pointerId); 
  };

  const handlePointerMove = (e) => {
    if (!dragStartY) return;
    const delta = e.clientY - dragStartY;
    if (delta > 0) setDragCurrentY(delta); 
  };
  
  const handlePointerUp = (e) => {
    if (!dragStartY) return;
    if (dragCurrentY > 100) {
      guide.handleStopAudio();
      onClose();
    }
    setDragStartY(null);
    setDragCurrentY(0);
    e.target.releasePointerCapture(e.pointerId);
  };

  return (
    <>
      {work && (
        <div 
          onClick={() => {
            guide.handleStopAudio();
            onClose();
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10001] transition-opacity duration-300"
        />
      )}

      <div 
        className="fixed bottom-0 left-0 right-0 md:inset-x-0 md:mx-auto md:bottom-6 md:max-w-3xl lg:max-w-4xl w-full bg-[#121218] rounded-t-3xl md:rounded-3xl p-0 z-[10002] shadow-[0_-4px_30px_rgba(0,0,0,0.7)] md:shadow-[0_20px_60px_rgba(0,0,0,0.9)] md:border md:border-slate-800/80 text-white flex flex-col max-h-[88vh] md:max-h-[82vh] overflow-hidden"
        style={{
          transform: work ? `translateY(${dragCurrentY}px)` : "translateY(100%)",
          transition: dragStartY ? "none" : "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        }}
      >
        {work && (
          <WorkDetailsContent 
            work={work} 
            guide={guide} 
            onPrev={onPrev} 
            onNext={onNext} 
            hasPrev={hasPrev}
            hasNext={hasNext}
            onClose={onClose}
            onDragPointerDown={handlePointerDown}
            onDragPointerMove={handlePointerMove}
            onDragPointerUp={handlePointerUp}
          />
        )}
      </div>
    </>
  );
}