import { useState, useEffect } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { io } from "socket.io-client";
import SectionLayer from "./sectionLayer";
import RoomLayer from "./roomLayer";
import WorkDetailsSheet from "./workDetailsSheet";
import NavigationControlBar from "./navigationControlBar";
import { SOCKET_URL, API_BASE_URL } from "../../../../src/config";

export default function MapView({ visitId, roomCode, isTeacher }) {
  const [socket, setSocket] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);

  const [sections, setSections] = useState([]);
  const [visitedWorks, setVisitedWorks] = useState([]);
  const [allMuseumWorks, setAllMuseumWorks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Navigator state
  const [currentWorkIndex, setCurrentWorkIndex] = useState(-1);
  const [detailsWork, setDetailsWork] = useState(null);
  const [playMode, setPlayMode] = useState("read"); 
  const [inputMode, setInputMode] = useState("write"); 
  const [showEndModal, setShowEndModal] = useState(false);
  const [suggestedWorks, setSuggestedWorks] = useState([]);

  const isSharedSession = Boolean(roomCode);

  // Connessione Socket pulita
  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'] // Forza una connessione stabile
    });
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    const fetchVisitData = async () => {
      try {
        const visitResponse = await fetch(`${API_BASE_URL}/visits/${visitId}/museum`);
        const visitData = await visitResponse.json();

        setVisitedWorks(visitData.works);
        const museumId = visitData.museumId?._id || visitData.museumId;

        const sectionsResponse = await fetch(`${API_BASE_URL}/museums/${museumId}/sections`);
        const sectionsData = await sectionsResponse.json();
        setSections(sectionsData);

        const getRoomName = (roomId) => {
          if (!roomId) return "Stanza sconosciuta";
          for (const section of sectionsData) {
            const room = section.rooms?.find(r => r._id === roomId);
            if (room) return room.name;
          }
          return "Stanza sconosciuta";
        };

        const enrichedVisitedWorks = visitData.works.map(work => ({
          ...work,
          roomName: getRoomName(work.roomId)
        }));
        setVisitedWorks(enrichedVisitedWorks);

        const worksResponse = await fetch(`${API_BASE_URL}/museums/${museumId}/works`);
        const worksData = await worksResponse.json();

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
    };

    if (visitId) {
      fetchVisitData();
    }
  }, [visitId]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Sintesi vocale
  const speakText = (textToRead) => {
    window.speechSynthesis.cancel();
    if (!textToRead) {
      setPlayMode("read");
      return;
    }
    setPlayMode("listen");
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = "it-IT";
    utterance.onend = () => {
      setPlayMode("read");
    };
    window.speechSynthesis.speak(utterance);
  };

  // Seleziona automaticamente la sezione della mappa contenente l'opera d'arte corrente
  const selectSectionForWork = (work) => {
    if (!work || !work.roomId) return null;
    const section = sections.find(s => 
      s.rooms && s.rooms.some(r => r._id === work.roomId)
    );
    if (section) {
      setSelectedSection(section);
      return section;
    }
    return null;
  };

  // Gestione socket per sincronizzazione studenti
  useEffect(() => {
    if (isSharedSession && !isTeacher && socket) {
      socket.on("artwork_changed", ({ artworkId }) => {
        const index = visitedWorks.findIndex(w => w._id === artworkId);
        if (index !== -1) {
          setCurrentWorkIndex(index);
          selectSectionForWork(visitedWorks[index]);
          window.showToast?.("Il docente è passato a una nuova opera", "info");
        }
      });

      return () => {
        socket.off("artwork_changed");
      };
    }
  }, [isSharedSession, isTeacher, visitedWorks, socket]);

  const handleNext = () => {
    if (currentWorkIndex < visitedWorks.length - 1) {
      const nextIndex = currentWorkIndex + 1;
      setCurrentWorkIndex(nextIndex);
      const activeWork = visitedWorks[nextIndex];
      const currentSection = selectedSection;
      const nextSection = selectSectionForWork(activeWork);

      if (nextSection && currentSection && nextSection._id === currentSection._id) {
        alert(`La prossima opera si trova nella ${activeWork.roomName}`);
      } else if (nextSection) {
        alert(`La prossima opera si trova nella sezione ${nextSection.name}, sala ${activeWork.roomName}`);
      }

      if (isSharedSession && isTeacher && socket) {
        socket.emit("change_artwork", {
          roomCode: roomCode,
          artworkId: activeWork._id
        });
      }
    } else {
      const remainingWorks = allMuseumWorks.filter(w => !visitedWorks.some(vw => vw._id === w._id));
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

      if (isSharedSession && isTeacher && socket) {
        socket.emit("change_artwork", {
          roomCode: roomCode,
          artworkId: activeWork._id
        });
      }
    } else if (currentWorkIndex === 0) {
      setCurrentWorkIndex(-1);
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
      <header className="d-flex justify-content-between align-items-center px-4" style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", background: "rgba(9, 9, 11, 0.85)", backdropFilter: "blur(10px)", height: "65px" }}>
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-bank me-2 text-info fs-4"></i>
          <span style={{ fontWeight: 800, fontSize: "1.25rem", background: "linear-gradient(90deg, #00ccff 0%, #7a1dd0 50%, #ec4899 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ArtAround Navigator</span>
        </div>
        <button onClick={() => window.location.href = "/my-visits"} className="btn btn-sm btn-outline-secondary rounded-pill px-3">
          <i className="bi bi-box-arrow-left me-1"></i> Esci
        </button>
      </header>

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
              style={{ width: "2000px", height: "2000px" }}
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

      <NavigationControlBar
        currentWorkIndex={currentWorkIndex}
        visitedWorks={visitedWorks}
        onPrev={handlePrev}
        onNext={handleNext}
        onStartVisit={() => {
          if (visitedWorks.length > 0) {
            setCurrentWorkIndex(0);
            selectSectionForWork(visitedWorks[0]);
            if (isSharedSession && isTeacher && socket) {
              socket.emit("change_artwork", { roomCode, artworkId: visitedWorks[0]._id });
            }
          }
        }}
        playMode={playMode}
        setPlayMode={setPlayMode}
        inputMode={inputMode}
        setInputMode={setInputMode}
        onSpeak={speakText}
        isSharedSession={isSharedSession}
        isTeacher={isTeacher}
      />

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

      <WorkDetailsSheet
        work={detailsWork}
        onClose={() => setDetailsWork(null)} 
        onSpeak={speakText}
      />
    </div>
  );
}