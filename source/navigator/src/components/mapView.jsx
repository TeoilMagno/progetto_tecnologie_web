import { useState, useEffect } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Landmark, LogOut, CheckCircle2, Sparkles, ArrowRight, Loader2, Compass, Image as ImageIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import { useSocket } from "../context/SocketContext";
import SectionLayer from "./sectionLayer";
import RoomLayer from "./roomLayer";
import WorkDetailsSheet from "./workDetailsSheet";
import NavigationControlBar from "./navigationControlBar";

export default function MapView({ visitId, roomCode, isTeacher }) {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [selectedSection, setSelectedSection] = useState(null);

  const [sections, setSections] = useState([]);
  const [visitedWorks, setVisitedWorks] = useState([]);
  const [allMuseumWorks, setAllMuseumWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  const [currentWorkIndex, setCurrentWorkIndex] = useState(-1);
  const [detailsWork, setDetailsWork] = useState(null);
  const [playMode, setPlayMode] = useState("read"); 
  const [inputMode, setInputMode] = useState("write"); 
  const [showEndModal, setShowEndModal] = useState(false);
  const [suggestedWorks, setSuggestedWorks] = useState([]);

  // Livello di dettaglio della descrizione
  const [expertiseLevel, setExpertiseLevel] = useState("medium");

  //Domande per assistente vocale
  const [commandsMap, setCommandsMap] = useState(null);

  const isSharedSession = Boolean(roomCode);
  //lunghezza descrizione opera
  const currentLength = "medium";
  
  // Se non ci sono sezioni valide, attiviamo la modalità Fallback (Audioguida List Mode)
  const hasMap = sections && sections.length > 0;

  useEffect(() => {
    if (!roomCode || !socket) return;

    // La socket è condivisa e già connessa (creata una sola volta nel
    // SocketProvider): qui ci limitiamo a (ri)registrarci nella stanza,
    // così il server aggiorna anche il teacherSocketId se siamo l'insegnante
    // e ci allinea con l'opera corrente se stiamo rientrando in corsa.
    socket.emit('rejoin_room', {
      roomCode: roomCode.toUpperCase(),
      role: isTeacher ? 'teacher' : 'student'
    });
  }, [roomCode, isTeacher, socket]);

  useEffect(() => {
    const fetchVisitData = async () => {
      try {
        const queryParam = isSharedSession ? `?roomCode=${roomCode}` : ''
        
        const visitResponse = await fetch(`${API_BASE_URL}/visits/${visitId}${queryParam}`, { credentials: 'include' });
        if (!visitResponse.ok) throw new Error("Visita non trovata");
        const apiData = await visitResponse.json();
        const visitData = apiData.visit;
        const dictionary = apiData.commands_map;
        const userData = apiData.user;

        //salviamo i comandi vocali disponibili
        setCommandsMap(dictionary);

        //setta il livello di difficoltà della visita
        if(userData)
          setExpertiseLevel(userData.preferences.expertiseLevel || 'medium');
        
        // Controllo di sicurezza: ci assicuriamo che works sia un array
        const worksArray = Array.isArray(visitData.works) ? visitData.works : [];
        setVisitedWorks(worksArray);
        
        const museumId = visitData.museumId?._id || visitData.museumId;
        
        if (museumId) {
          // Gestiamo il potenziale fallimento dell'API delle sezioni senza far crashare tutto
          try {
            const sectionsResponse = await fetch(`${API_BASE_URL}/museums/${museumId}/sections`, { credentials: 'include' });
            if (sectionsResponse.ok) {
              const sectionsData = await sectionsResponse.json();
              setSections(Array.isArray(sectionsData) ? sectionsData : []);
            } else {
              setSections([]); // Attiverà il fallback
            }

            const worksResponse = await fetch(`${API_BASE_URL}/museums/${museumId}/works`, { credentials: 'include' });
            if (worksResponse.ok) {
              const worksData = await worksResponse.json();
              setAllMuseumWorks(Array.isArray(worksData) ? worksData : []);
            }
          } catch (e) {
            console.warn("Errore nel caricamento dei dati mappa/opere del museo. Fallback attivato.", e);
            setSections([]);
          }
        }
        setLoading(false);
      } catch (error) {
        console.error("Errore critico:", error);
        setApiError(true);
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
    if (!work || !work.roomId || !hasMap) return null;
    const section = sections.find(s => s.rooms && s.rooms.some(r => r._id === work.roomId));
    if (section) {
      setSelectedSection(section);
      const room = section.rooms.find(r => r._id === work.roomId);
      return { section, room };
    }
    return null;
  };

  // Mostra l'alert "la prossima opera è nella sala X" solo quando si cambia
  // effettivamente stanza rispetto a quella corrente (altrimenti spuntrebbe
  // anche restando nella stessa sala, tra un'opera e l'altra).
  // NB: solo lato insegnante/locale — non va mandato agli studenti tramite socket.
  const announceRoomChange = (previousWork, nextWork, result) => {
    if (!result?.room) return;
    if (previousWork?.roomId === nextWork?.roomId) return; // stessa sala, non serve avvisare
    alert(`La prossima opera si trova nella ${result.room.name}`);
  };

  useEffect(() => {
    if (isSharedSession && !isTeacher && socket) {
      socket.on("change_artwork", (data) => {
        const index = visitedWorks.findIndex(w => w._id === data.artworkId);
        if (index != -1) {
          setCurrentWorkIndex(index);
          if (hasMap) selectSectionForWork(visitedWorks[index]);
        }
      });
      return () => socket.off("change_artwork");
    }
  }, [isSharedSession, isTeacher, visitedWorks, socket]);

  const handleNext = () => {
    if (currentWorkIndex < visitedWorks.length - 1) {
      const nextIndex = currentWorkIndex + 1;
      const previousWork = currentWorkIndex >= 0 ? visitedWorks[currentWorkIndex] : null;
      setCurrentWorkIndex(nextIndex);
      const activeWork = visitedWorks[nextIndex];
      
      if (hasMap) {
        const result = selectSectionForWork(activeWork);
        announceRoomChange(previousWork, activeWork, result);
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
      const previousWork = visitedWorks[currentWorkIndex];
      setCurrentWorkIndex(prevIndex);
      
      if (hasMap) {
        const result = selectSectionForWork(visitedWorks[prevIndex]);
        announceRoomChange(previousWork, visitedWorks[prevIndex], result);
      }

      if (isSharedSession && isTeacher && socket) {
        socket.emit("change_artwork", { roomCode, artworkId: visitedWorks[prevIndex]._id });
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
        <p className="text-slate-400">Caricamento visita in corso...</p>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="flex flex-col items-center justify-center w-screen h-screen bg-[#09090b] text-white p-6 text-center">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 flex items-center justify-center rounded-2xl mb-4">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2">Errore di Caricamento</h2>
        <p className="text-slate-400 max-w-sm mb-6">Impossibile recuperare i dati di questa visita. Potrebbe essere stata cancellata o il server non risponde.</p>
      </div>
    );
  }

  const currentWork = currentWorkIndex >= 0 ? visitedWorks[currentWorkIndex] : null;

  return (
    // 1. fixed inset-0 blocca lo schermo ed evita lo scorrimento dell'intera pagina
    <div className="fixed inset-0 flex flex-col bg-[#09090b] text-white overflow-hidden">
      {/* TODO: magari deve rimandare al my-visit del navigator? */}
      {/* Tasto Esci Fluttuante */}
      <button 
        onClick={() => navigate("/my-visits")} 
        className="absolute top-4 right-4 z-[9999] flex items-center justify-center gap-2 px-4 py-2 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-full text-slate-300 hover:bg-slate-800 hover:text-white text-sm transition-colors shadow-[0_4px_20px_rgba(0,0,0,0.5)] cursor-pointer"
      >
        <LogOut size={16} /> Esci
      </button>

      {/* 3. Mappa o Fallback (Prende tutto lo spazio rimanente con flex-1) */}
      <div className="w-full h-full relative overflow-hidden">
        {hasMap ? (
          <TransformWrapper initialScale={0.8} minScale={0.4} maxScale={2.5} centerOnInit={true} panning={{ velocityDisabled: true }}>
            {/* Sostituito 100vw con 100% per eliminare la barra di scorrimento orizzontale! */}
            <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
              <svg viewBox="0 0 2000 2000" style={{ width: "2000px", height: "2000px" }}>
                {!selectedSection && <g><SectionLayer sections={sections} onSelect={setSelectedSection} /></g>}
                {selectedSection && (
                  <g>
                    <RoomLayer 
                      onBack={() => setSelectedSection(null)} 
                      section={selectedSection} 
                      visitedWorks={visitedWorks}
                      activeWorkId={currentWork?._id}
                      onWorkClick={(work) => setDetailsWork(work)}
                    />
                  </g>
                )}
              </svg>
            </TransformComponent>
          </TransformWrapper>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-slate-950">
            {currentWorkIndex < 0 ? (
              <div className="text-center animate-fadeIn">
                <div className="w-24 h-24 mx-auto bg-slate-900 rounded-full flex items-center justify-center border border-white/5 shadow-2xl mb-6">
                  <Compass size={40} className="text-cyan-400" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Visita Guidata</h2>
                <p className="text-slate-400 max-w-sm mx-auto text-sm leading-relaxed">
                  Non sono presenti planimetrie per questo museo. Nessun problema, ti guideremo attraverso le opere con la nostra modalità audioguida!
                </p>
                <div className="mt-8 flex justify-center animate-bounce">
                  <ArrowRight className="text-cyan-400 rotate-90" size={24} />
                </div>
              </div>
            ) : (
              <div className="w-full max-w-lg bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden flex flex-col max-h-full shadow-2xl animate-fadeIn">
                <div className="relative w-full h-56 shrink-0 bg-slate-800 flex items-center justify-center">
                  {currentWork?.image ? (
                    <img src={currentWork.image} alt={currentWork.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="text-slate-600" size={48} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                  <h3 className="font-extrabold text-2xl mb-1">{currentWork?.name}</h3>
                  <p className="text-cyan-400 font-semibold mb-6">
                    {currentWork?.authorName || 'Autore Sconosciuto'} • {currentWork?.year} {currentWork?.styleName ? `• ${currentWork.styleName}` : ''}
                  </p>
                  
                  <h6 className="text-white/50 uppercase tracking-wider mb-2 text-xs font-bold">Descrizione</h6>
                  <p className="leading-relaxed text-slate-300 text-sm pb-8">
                    {currentWork?.description?.[expertiseLevel]?.[currentLength] || "Nessuna descrizione disponibile per quest'opera."}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Barra Inferiore di controllo (ora non è più sovrapposta, ma impilata perfettamente) */}
      <NavigationControlBar
        currentWorkIndex={currentWorkIndex}
        visitedWorks={visitedWorks}
        onPrev={handlePrev}
        onNext={handleNext}
        onStartVisit={() => {
          if (visitedWorks.length > 0) {
            setCurrentWorkIndex(0);
            if (hasMap) {
              const result = selectSectionForWork(visitedWorks[0]);
              if (result?.room) {
                alert(`Si parte dalla ${result.room.name}`);
              }
            }
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
        currentLength={currentLength}
        expertiseLevel={expertiseLevel}
      />

      {/* Modali e Bottom Sheet */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/85 z-[10000] flex items-center justify-center p-4">
          <div className="w-full max-w-[560px] bg-[#121218] border border-white/10 rounded-2xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.8)] text-white">
            <h3 className="flex items-center justify-center gap-2 text-cyan-400 text-xl font-extrabold mb-3">
              <CheckCircle2 className="text-green-500" size={24} /> Visita Completata!
            </h3>
            <p className="text-slate-400 text-center text-sm mb-6">
              Hai visitato tutte le opere d'arte presenti in questa visita. Cosa desideri fare ora?
            </p>
            
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => window.location.href = "/my-visits"} 
                className="px-6 py-2.5 border border-white/20 rounded-full text-white hover:bg-white/10 transition-colors text-sm font-medium cursor-pointer"
              >
                Termina Visita
              </button>
            </div>
          </div>
        </div>
      )}

      {hasMap && (
        <WorkDetailsSheet
          work={detailsWork}
          onClose={() => setDetailsWork(null)}
          onSpeak={speakText}
          commandsMap={commandsMap}
          currentExpertise={expertiseLevel}
          setCurrentExpertise={setExpertiseLevel}
        />
      )}
    </div>
  );
}
