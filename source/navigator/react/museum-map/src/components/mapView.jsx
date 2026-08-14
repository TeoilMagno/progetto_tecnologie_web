import { useState, useEffect } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import SectionLayer from "./sectionLayer";
import RoomLayer from "./roomLayer";
import WorkDetailsSheet from "./workDetailsSheet";

export default function MapView({ visitId }) {
  const [selectedSection, setSelectedSection] = useState(null);

  const [sections, setSections] = useState([]);
  const [visitedWorks, setVisitedWorks] = useState([]);
  const [allMuseumWorks, setAllMuseumWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  //const API_BASE_URL = window.location.origin + "/api";

  // Navigator state
  const [currentWorkIndex, setCurrentWorkIndex] = useState(-1);
  const [detailsWork, setDetailsWork] = useState(null);
  const [playMode, setPlayMode] = useState("read"); // 'read' or 'listen'
  const [inputMode, setInputMode] = useState("write"); // 'write' or 'speak'
  const [showEndModal, setShowEndModal] = useState(false);
  const [suggestedWorks, setSuggestedWorks] = useState([]);

  useEffect(() => {
    const fetchVisitData = async () => {
      try {
        // 1. Scarichiamo i dati della visita
        const visitResponse = await fetch(`${API_BASE_URL}/visits/${visitId}/museum`);
        const visitData = await visitResponse.json();

        // Salviamo le opere della visita nello stato
        setVisitedWorks(visitData.works);

        const museumId = visitData.museumId?._id || visitData.museumId;

        // 2. Usiamo il museumId appena recuperato per scaricare le sezioni
        const sectionsResponse = await fetch(`${API_BASE_URL}/museums/${museumId}/sections`);
        const sectionsData = await sectionsResponse.json();
        setSections(sectionsData);

        const getRoomName = (roomId) => {
          if (!roomId) return "Stanza sconosciuta";
          
          // Scorriamo TUTTE le sezioni appena scaricate (usando sectionsData)
          for (const section of sectionsData) {
            const room = section.rooms?.find(r => r._id === roomId);
            if (room) return room.name; // Trovata!
          }
          return "Stanza sconosciuta";
        };

        // --- ARRICCHIAMO LE OPERE DELLA VISITA ---
        const enrichedVisitedWorks = visitData.works.map(work => ({
          ...work,
          roomName: getRoomName(work.roomId)
        }));
        // Salviamo le opere arricchite nello stato!
        setVisitedWorks(enrichedVisitedWorks);

        // 3. Scarichiamo tutte le opere del museo per le raccomandazioni
        const worksResponse = await fetch(`${API_BASE_URL}/museums/${museumId}/works`);
        const worksData = await worksResponse.json();

        // --- ARRICCHIAMO TUTTE LE OPERE DEL MUSEO ---
        const enrichedAllWorks = worksData.map(work => ({
          ...work,
          roomName: getRoomName(work.roomId)
        }));
        setAllMuseumWorks(enrichedAllWorks);

        setLoading(false);
      } catch (error) {
        console.error("Errore nel caricamento dei dati della visita o delle sezioni:", error);
        setLoading(false);
      }
    }

    fetchVisitData();
  }, [visitId]);

  // garantisce che la sintesi vocale venga fermata prima di far partire un altro pezzo di sintesi
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Funzione riutilizzabile per la sintesi vocale
  const speakText = (textToRead) => {
    // Zittiamo subito qualsiasi voce stia già parlando
    window.speechSynthesis.cancel();

    // Se non c'è testo, usciamo
    if (!textToRead) {
      setPlayMode("read");
      return;
    }

    // Impostiamo lo stato UI su "ascolto"
    setPlayMode("listen");

    // Configuriamo e avviamo il lettore vocale
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = "it-IT"; // Lingua italiana

    // Quando finisce, resettiamo la UI
    utterance.onend = () => {
      setPlayMode("read");
    };

    // riproduci il testo passato
    window.speechSynthesis.speak(utterance);
  };

  // Seleziona automaticamente la sezione della mappa contenente l'opera d'arte corrente
  const selectSectionForWork = (work) => {
    if (!work || !work.roomId) return;
    const section = sections.find(s => 
      s.rooms && s.rooms.some(r => r._id === work.roomId)
    );
    if (section) {
      setSelectedSection(section);
      return section;
    }
    
    return null;
  };

  const handleNext = () => {
    if (currentWorkIndex < visitedWorks.length - 1) {
      const nextIndex = currentWorkIndex + 1;
      setCurrentWorkIndex(nextIndex);
      const activeWork = visitedWorks[nextIndex];
      const currentSection = selectedSection;
      const nextSection = selectSectionForWork(activeWork);
      if(nextSection._id === currentSection._id) {
        alert(`la prossima opera si trova nella ${activeWork.roomName}`)
      } else {
        alert(`la prossima opera si trova nella sezione ${nextSection.name}, sala ${activeWork.roomName}`);
      }
    } else {
      // Fine della visita, genera raccomandazioni
      const remainingWorks = allMuseumWorks.filter(w => !visitedWorks.some(vw => vw._id === w._id));
      // Mischia e prendi 3 suggerimenti
      const shuffled = [...remainingWorks].sort(() => 0.5 - Math.random());
      setSuggestedWorks(shuffled.slice(0, 3));
      setShowEndModal(true);
    }
  };

  const handlePrev = () => {
    if (currentWorkIndex > 0) {
      const prevIndex = currentWorkIndex - 1;
      setCurrentWorkIndex(prevIndex);
      const activeWork = visitedWorks[prevIndex];
      selectSectionForWork(activeWork);
    } else if (currentWorkIndex === 0) {
      setCurrentWorkIndex(-1); // Ritorna alla panoramica
      setSelectedSection(null);
    }
  };

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center" style={{ width: "100vw", height: "100vh", backgroundColor: "#09090b", color: "#fff" }}>
        <div className="spinner-border text-info" role="status"></div>
        <p className="mt-3 text-secondary">Caricamento mappa e visita...</p>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", backgroundColor: "#09090b", color: "#fff", overflow: "hidden" }}>
      {/* Header */}
      <header className="d-flex justify-content-between align-items-center px-4" style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", background: "rgba(9, 9, 11, 0.85)", backdropFilter: "blur(10px)", height: "65px" }}>
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-bank me-2 text-info fs-4"></i>
          <span style={{ fontWeight: 800, fontSize: "1.25rem", background: "linear-gradient(90deg, #00ccff 0%, #7a1dd0 50%, #ec4899 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ArtAround Navigator</span>
        </div>
        <button onClick={() => window.location.href = "/my-visits"} className="btn btn-sm btn-outline-secondary rounded-pill px-3">
          <i className="bi bi-box-arrow-left me-1"></i> Esci
        </button>
      </header>

      {/* Mappa zoomabile */}
      <div style={{ height: "calc(100vh - 185px)", overflow: "hidden" }}>
        <TransformWrapper
          initialScale={0.8}
          minScale={0.4}
          maxScale={2.5}
          centerOnInit={true}
          panning={{ velocityDisabled: true }}
        >
          <TransformComponent wrapperStyle={{ width: "100vw", height: "100%" }}>
            <svg 
              viewBox="0 0 2000 2000" 
              style={{ width: "2000px", height: "2000px", willChange: "transform" }}
            >
              {!selectedSection && (
                <g>
                  <SectionLayer sections={sections} onSelect={setSelectedSection} />
                </g>
              )}

              {selectedSection && (
                <g>
                  <RoomLayer 
                    onBack={() => setSelectedSection(null)} 
                    section={selectedSection} 
                    visitedWorks={visitedWorks}
                    activeWorkId={currentWorkIndex >= 0 ? visitedWorks[currentWorkIndex]?._id : null}
                    onWorkClick={(work) => setDetailsWork(work)}
                  />
                </g>
              )}
            </svg>
          </TransformComponent>
        </TransformWrapper>
      </div>

      {/* Barra comandi fissa in basso */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "120px", background: "rgba(18, 18, 24, 0.95)", borderTop: "1px solid rgba(255, 255, 255, 0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 30px", zIndex: 999, backdropFilter: "blur(15px)" }}>
        
        {/* Sinistra: Dettagli Opera Corrente */}
        <div style={{ width: "320px" }}>
          {currentWorkIndex >= 0 ? (
            <div>
              <span className="badge bg-info mb-1" style={{ fontSize: "0.65rem", letterSpacing: "0.5px" }}>OPERA {currentWorkIndex + 1} DI {visitedWorks.length}</span>
              <h5 className="mb-0 text-truncate text-white" style={{ fontSize: "0.95rem", fontWeight: 700 }}>{visitedWorks[currentWorkIndex]?.name}</h5>
              <p className="mb-0 small text-secondary text-truncate" style={{ fontSize: "0.8rem" }}>{visitedWorks[currentWorkIndex]?.author}</p>
            </div>
          ) : (
            <div>
              <span className="badge bg-secondary mb-1" style={{ fontSize: "0.65rem", letterSpacing: "0.5px" }}>PANORAMICA</span>
              <h5 className="mb-0 text-white" style={{ fontSize: "0.95rem", fontWeight: 700 }}>Navigazione Libera</h5>
              <p className="mb-0 small text-secondary" style={{ fontSize: "0.8rem" }}>Seleziona un'opera per iniziare</p>
            </div>
          )}
        </div>

        {/* Centro: Pulsanti Avanti/Indietro */}
        <div className="d-flex align-items-center gap-2">
          <button 
            onClick={handlePrev} 
            className="btn btn-sm btn-outline-light rounded-pill px-3"
            style={{ minWidth: "110px", borderColor: "rgba(255,255,255,0.2)" }}
            disabled={currentWorkIndex < 0}
          >
            <i className="bi bi-chevron-left me-1"></i> Precedente
          </button>
          
          {currentWorkIndex === -1 ? (
            <button 
              onClick={() => {
                setCurrentWorkIndex(0);
                const nextSection = selectSectionForWork(visitedWorks[0]);
                if (nextSection) {
                  alert(`la prossima opera si trova nella sezione ${nextSection.name}, ${visitedWorks[0].roomName}`);
                }
              }}
              className="btn btn-sm text-white rounded-pill px-4"
              style={{ background: "linear-gradient(90deg, #00ccff, #7a1dd0)", border: "none", minWidth: "140px", fontWeight: 600, padding: "8px 20px" }}
              disabled={visitedWorks.length === 0}
            >
              Inizia Visita <i className="bi bi-play-fill ms-1"></i>
            </button>
          ) : (
            <button 
              onClick={handleNext} 
              className="btn btn-sm text-white rounded-pill px-4"
              style={{ background: "linear-gradient(90deg, #00ccff, #7a1dd0)", border: "none", minWidth: "140px", fontWeight: 600, padding: "8px 20px" }}
            >
              {currentWorkIndex === visitedWorks.length - 1 ? "Fine Visita" : "Prossima"} <i className="bi bi-chevron-right ms-1"></i>
            </button>
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
              onClick={() => speakText(`Descrizione opera: ${visitedWorks[currentWorkIndex]?.description?.[0]?.description}`)}
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

      {/* Modal Fine Visita */}
      {showEndModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="p-4" style={{ maxWidth: "560px", width: "90%", background: "#121218", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "16px", boxShadow: "0 10px 40px rgba(0,0,0,0.8)", color: "#fff" }}>
            <h3 className="text-info mb-3 text-center" style={{ fontWeight: 800 }}><i className="bi bi-check2-circle me-2 text-success"></i>Visita Completata!</h3>
            <p className="text-secondary text-center mb-4" style={{ fontSize: "0.9rem" }}>Hai visitato tutte le opere d'arte presenti in questa visita. Cosa desideri fare ora?</p>
            
            {suggestedWorks.length > 0 ? (
              <div className="mb-4">
                <h6 className="text-white-50 small mb-2 uppercase tracking-wider" style={{ fontSize: "0.75rem", fontWeight: 700 }}><i className="bi bi-stars me-1 text-warning"></i>Consigliate per te in questo museo:</h6>
                <div className="row g-2">
                  {suggestedWorks.map(work => (
                    <div className="col-4" key={work._id}>
                      <div className="card h-100 p-1" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.05)" }}>
                        <img src={work.image} style={{ height: "60px", objectFit: "cover", borderRadius: "4px" }} alt={work.name} />
                        <div className="p-1 text-center">
                          <div className="small fw-bold text-truncate text-white" style={{ fontSize: "0.7rem" }}>{work.name}</div>
                          <span className="text-secondary text-truncate d-block" style={{ fontSize: "0.6rem" }}>{work.author}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-secondary text-center small mb-4">Hai già visitato tutte le opere d'arte di questo museo!</p>
            )}

            <div className="d-flex gap-3 justify-content-center">
              <button onClick={() => window.location.href = "/my-visits"} className="btn btn-sm btn-outline-light rounded-pill px-4 py-2" style={{ borderColor: "rgba(255,255,255,0.2)" }}>
                Termina Visita
              </button>
              {suggestedWorks.length > 0 && (
                <button 
                  onClick={() => {
                    setVisitedWorks([...visitedWorks, ...suggestedWorks]);
                    setShowEndModal(false);
                    setCurrentWorkIndex(visitedWorks.length);
                    selectSectionForWork(suggestedWorks[0]);
                  }} 
                  className="btn btn-sm text-white rounded-pill px-4 py-2"
                  style={{ background: "linear-gradient(90deg, #00ccff, #7a1dd0)", border: "none", fontWeight: 600 }}
                >
                  Continua la visita <i className="bi bi-arrow-right ms-1"></i>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── BOTTOM SHEET ESTRATTO IN COMPONENTE ─── */}
      <WorkDetailsSheet
        work={detailsWork}
        onClose={() => setDetailsWork(null)} 
        onSpeak={speakText}
      />
    </div>
  );
}
