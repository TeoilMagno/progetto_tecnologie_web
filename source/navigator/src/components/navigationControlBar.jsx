import React from 'react';

export default function NavigationControlBar({
  currentWorkIndex,
  visitedWorks,
  onPrev,
  onNext,
  onStartVisit,
  playMode,
  setPlayMode,
  inputMode,
  setInputMode,
  onSpeak,
  isSharedSession, // true se siamo in una sessione di gruppo
  isTeacher        // true se l'utente corrente è l'insegnante
}) {
  const currentWork = currentWorkIndex >= 0 ? visitedWorks[currentWorkIndex] : null;

  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "120px", background: "rgba(18, 18, 24, 0.95)", borderTop: "1px solid rgba(255, 255, 255, 0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 30px", zIndex: 999, backdropFilter: "blur(15px)" }}>
      
      {/* Sinistra: Dettagli Opera Corrente */}
      <div style={{ width: "320px" }}>
        {currentWorkIndex >= 0 ? (
          <div>
            <span className="badge bg-info mb-1" style={{ fontSize: "0.65rem", letterSpacing: "0.5px" }}>
              OPERA {currentWorkIndex + 1} DI {visitedWorks.length}
              {isSharedSession && !isTeacher && " (Sincronizzato con il docente)"}
            </span>
            <h5 className="mb-0 text-truncate text-white" style={{ fontSize: "0.95rem", fontWeight: 700 }}>{currentWork?.name}</h5>
            <p className="mb-0 small text-secondary text-truncate" style={{ fontSize: "0.8rem" }}>{currentWork?.author}</p>
          </div>
        ) : (
          <div>
            <span className="badge bg-secondary mb-1" style={{ fontSize: "0.65rem", letterSpacing: "0.5px" }}>PANORAMICA</span>
            <h5 className="mb-0 text-white" style={{ fontSize: "0.95rem", fontWeight: 700 }}>Navigazione Libera</h5>
            <p className="mb-0 small text-secondary" style={{ fontSize: "0.8rem" }}>Seleziona un'opera per iniziare</p>
          </div>
        )}
      </div>

      {/* Centro: Pulsanti Avanti/Indietro o Blocchi per studenti */}
      <div className="d-flex align-items-center gap-2">
        {/* Se è una sessione condivisa e NON sei il docente, i tasti di movimento manuale sono disabilitati come da specifiche */}
        {isSharedSession && !isTeacher ? (
          <div className="text-center px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-pill text-xs text-amber-400 font-semibold">
            <i className="bi bi-lock-fill me-1"></i> Navigazione controllata dal docente
          </div>
        ) : (
          <>
            <button 
              onClick={onPrev} 
              className="btn btn-sm btn-outline-light rounded-pill px-3"
              style={{ minWidth: "110px", borderColor: "rgba(255,255,255,0.2)" }}
              disabled={currentWorkIndex < 0}
            >
              <i className="bi bi-chevron-left me-1"></i> Precedente
            </button>
            
            {currentWorkIndex === -1 ? (
              <button 
                onClick={onStartVisit}
                className="btn btn-sm text-white rounded-pill px-4"
                style={{ background: "linear-gradient(90deg, #00ccff, #7a1dd0)", border: "none", minWidth: "140px", fontWeight: 600, padding: "8px 20px" }}
                disabled={visitedWorks.length === 0}
              >
                Inizia Visita <i className="bi bi-play-fill ms-1"></i>
              </button>
            ) : (
              <button 
                onClick={onNext} 
                className="btn btn-sm text-white rounded-pill px-4"
                style={{ background: "linear-gradient(90deg, #00ccff, #7a1dd0)", border: "none", minWidth: "140px", fontWeight: 600, padding: "8px 20px" }}
              >
                {currentWorkIndex === visitedWorks.length - 1 ? "Fine Visita" : "Prossima"} <i className="bi bi-chevron-right ms-1"></i>
              </button>
            )}
          </>
        )}
      </div>

      {/* Destra: Toggles Audio/Testo, Scrittura/Parla */}
      <div className="d-flex align-items-center gap-3">
        {/* Read vs Listen */}
        <div className="btn-group" role="group" style={{ border: "1px solid rgba(255,255,255,0.15)", borderRadius: "20px", overflow: "hidden" }}>
          <button 
            type="button" 
            className={`btn btn-sm py-2 px-3 border-0 rounded-0 ${playMode === 'read' ? 'btn-info text-dark' : 'text-secondary'}`}
            style={{ background: playMode === 'read' ? '#00ccff' : 'transparent', fontSize: "0.75rem", fontWeight: 600 }}
            onClick={() => setPlayMode('read')}
          >
            <i className="bi bi-book me-1"></i> Leggi
          </button>
          <button 
            type="button" 
            className={`btn btn-sm py-2 px-3 border-0 rounded-0 ${playMode === 'listen' ? 'btn-info text-dark' : 'text-secondary'}`}
            style={{ background: playMode === 'listen' ? '#00ccff' : 'transparent', fontSize: "0.75rem", fontWeight: 600 }}
            onClick={() => onSpeak(`Descrizione opera: ${currentWork?.description?.[0]?.description}`)}
          >
            <i className="bi bi-volume-up me-1"></i> Ascolta
          </button>
        </div>

        {/* Write vs Speak */}
        <div className="btn-group" role="group" style={{ border: "1px solid rgba(255,255,255,0.15)", borderRadius: "20px", overflow: "hidden" }}>
          <button 
            type="button" 
            className={`btn btn-sm py-2 px-3 border-0 rounded-0 ${inputMode === 'write' ? 'btn-info text-dark' : 'text-secondary'}`}
            style={{ background: inputMode === 'write' ? '#00ccff' : 'transparent', fontSize: "0.75rem", fontWeight: 600 }}
            onClick={() => setInputMode('write')}
          >
            <i className="bi bi-keyboard me-1"></i> Scrivi
          </button>
          <button 
            type="button" 
            className={`btn btn-sm py-2 px-3 border-0 rounded-0 ${inputMode === 'speak' ? 'btn-info text-dark' : 'text-secondary'}`}
            style={{ background: inputMode === 'speak' ? '#00ccff' : 'transparent', fontSize: "0.75rem", fontWeight: 600 }}
            onClick={() => setInputMode('speak')}
          >
            <i className="bi bi-mic me-1"></i> Parla
          </button>
        </div>
      </div>

    </div>
  );
}