import { useState, useEffect } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { io } from "socket.io-client";
import { Landmark, LogOut, CheckCircle2, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import SectionLayer from "./sectionLayer";
import RoomLayer from "./roomLayer";
import WorkDetailsSheet from "./workDetailsSheet";
import NavigationControlBar from "./navigationControlBar";
import { SOCKET_URL, API_BASE_URL } from "../config";

export default function MapView({ visitId, roomCode, isTeacher }) {
  const [socket, setSocket] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);

  const [sections, setSections] = useState([]);
  const [visitedWorks, setVisitedWorks] = useState([]);
  const [allMuseumWorks, setAllMuseumWorks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentWorkIndex, setCurrentWorkIndex] = useState(-1);
  const [detailsWork, setDetailsWork] = useState(null);
  const [playMode, setPlayMode] = useState("read"); 
  const [inputMode, setInputMode] = useState("write"); 
  const [showEndModal, setShowEndModal] = useState(false);
  const [suggestedWorks, setSuggestedWorks] = useState([]);

  const isSharedSession = Boolean(roomCode);

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'] 
    });
    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, []);

  useEffect(() => {
    const fetchVisitData = async () => {
      try {
        const visitResponse = await fetch(`${API_BASE_URL}/visits/${visitId}/museum`, { credentials: 'include' });
        const visitData = await visitResponse.json();
        setVisitedWorks(visitData.works);
        
        const museumId = visitData.museumId?._id || visitData.museumId;
        const sectionsResponse = await fetch(`${API_BASE_URL}/museums/${museumId}/sections`, { credentials: 'include' });
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

        const worksResponse = await fetch(`${API_BASE_URL}/museums/${museumId}/works`, { credentials: 'include' });
        const worksData = await worksResponse.json();
        const enrichedAllWorks = worksData.map(work => ({
          ...work,
          roomName: getRoomName(work.roomId)
        }));
        setAllMuseumWorks(enrichedAllWorks);

        setLoading(false);
      } catch (error) {
        console.error("Errore nel caricamento:", error);
        setLoading(false);
      }
    };

    if (visitId) {
      fetchVisitData();
    }
  }, [visitId]);

  useEffect(() => {
    return () => window.speechSynthesis.cancel();
  }, []);

  const speakText = (textToRead) => {
    window.speechSynthesis.cancel();
    if (!textToRead) {
      setPlayMode("read");
      return;
    }
    setPlayMode("listen");
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = "it-IT";
    utterance.onend = () => setPlayMode("read");
    window.speechSynthesis.speak(utterance);
  };

  const selectSectionForWork = (work) => {
    if (!work || !work.roomId) return null;
    const section = sections.find(s => s.rooms && s.rooms.some(r => r._id === work.roomId));
    if (section) {
      setSelectedSection(section);
      return section;
    }
    return null;
  };

  useEffect(() => {
    if (isSharedSession && !isTeacher && socket) {
      socket.on("artwork_changed", ({ artworkId }) => {
        const index = visitedWorks.findIndex(w => w._id === artworkId);
        if (index !== -1) {
          setCurrentWorkIndex(index);
          selectSectionForWork(visitedWorks[index]);
        }
      });
      return () => socket.off("artwork_changed");
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
        socket.emit("change_artwork", { roomCode, artworkId: activeWork._id });
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
        socket.emit("change_artwork", { roomCode, artworkId: activeWork._id });
      }
    } else if (currentWorkIndex === 0) {
      setCurrentWorkIndex(-1);
      setSelectedSection(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center w-screen h-screen bg-[#09090b] text-white">
        <Loader2 className="animate-spin text-cyan-400 mb-4" size={40} />
        <p className="text-slate-400">Caricamento mappa e visita...</p>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen bg-[#09090b] text-white overflow-hidden">
      <header className="flex justify-between items-center px-6 h-[65px] border-b border-white/10 bg-[#09090b]/85 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Landmark className="text-cyan-400" size={24} />
          <span className="font-extrabold text-xl bg-clip-text text-transparent bg-gradient-to-r from-[#00ccff] via-[#7a1dd0] to-[#ec4899]">
            ArtAround Navigator
          </span>
        </div>
        <button 
          onClick={() => window.location.href = "/my-visits"} 
          className="flex items-center gap-2 px-4 py-1.5 border border-slate-700 rounded-full text-slate-300 hover:bg-slate-800 text-sm transition-colors"
        >
          <LogOut size={16} /> Esci
        </button>
      </header>

      <div className="h-[calc(100vh-185px)] overflow-hidden">
        <TransformWrapper initialScale={0.8} minScale={0.4} maxScale={2.5} centerOnInit={true} panning={{ velocityDisabled: true }}>
          <TransformComponent wrapperStyle={{ width: "100vw", height: "100%" }}>
            <svg viewBox="0 0 2000 2000" style={{ width: "2000px", height: "2000px" }}>
              {!selectedSection && <g><SectionLayer sections={sections} onSelect={setSelectedSection} /></g>}
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
        <div className="fixed inset-0 bg-black/85 z-[10000] flex items-center justify-center p-4">
          <div className="w-full max-w-[560px] bg-[#121218] border border-white/10 rounded-2xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.8)] text-white">
            <h3 className="flex items-center justify-center gap-2 text-cyan-400 text-xl font-extrabold mb-3">
              <CheckCircle2 className="text-green-500" size={24} /> Visita Completata!
            </h3>
            <p className="text-slate-400 text-center text-sm mb-6">
              Hai visitato tutte le opere d'arte presenti in questa visita. Cosa desideri fare ora?
            </p>
            
            {suggestedWorks.length > 0 ? (
              <div className="mb-6">
                <h6 className="flex items-center gap-2 text-white/50 text-xs font-bold uppercase tracking-wider mb-3">
                  <Sparkles className="text-amber-400" size={14} /> Consigliate per te in questo museo:
                </h6>
                <div className="grid grid-cols-3 gap-3">
                  {suggestedWorks.map(work => (
                    <div key={work._id} className="flex flex-col h-full p-1.5 border border-white/5 bg-white/5 rounded-lg">
                      <img src={work.image} className="h-[70px] w-full object-cover rounded shadow-sm mb-2" alt={work.name} />
                      <div className="text-center px-1">
                        <div className="text-xs font-bold truncate text-white mb-0.5">{work.name}</div>
                        <span className="text-[10px] text-slate-400 truncate block">{work.author}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-center text-sm mb-6">Hai già visitato tutte le opere d'arte di questo museo!</p>
            )}

            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => window.location.href = "/my-visits"} 
                className="px-6 py-2.5 border border-white/20 rounded-full text-white hover:bg-white/10 transition-colors text-sm font-medium"
              >
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
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full text-white text-sm font-semibold border-none"
                  style={{ background: "linear-gradient(90deg, #00ccff, #7a1dd0)" }}
                >
                  Continua la visita <ArrowRight size={16} />
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