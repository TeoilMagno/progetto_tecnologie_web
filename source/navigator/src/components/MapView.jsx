import { useState, useEffect } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Landmark, LogOut, CheckCircle2, Sparkles, ArrowRight, Loader2, Compass, Image as ImageIcon, QrCode, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import { useSocket } from "../context/SocketContext";
import { Activity } from "react";
import HighlyOptimizedMapView from "./HighlyOptimizedMapView";
import GlobalMapView from "./GlobalMapView";
import WorkDetailsSheet from "./WorkDetailsSheet";
import NavigationControlBar from "./NavigationControlBar";
import RoomQRCode from "./RoomQRCode";
import TeacherDashboard from "./TeacherDashboard";

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
  // playMode: usato per la sintesi vocale
  const [playMode, setPlayMode] = useState(false); 
  const [showEndModal, setShowEndModal] = useState(false);
  const [suggestedWorks, setSuggestedWorks] = useState([]);
  const [visitQuiz, setVisitQuiz] = useState([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showTeacherDashboard, setShowTeacherDashboard] = useState(false);
  const [classStatus, setClassStatus] = useState({});
  const [interactionFeed, setInteractionFeed] = useState([]);

  // Livello di dettaglio della descrizione
  const [expertiseLevel, setExpertiseLevel] = useState("medium");
  const [currentLength, setCurrentLength] = useState("medium");

  //Domande per assistente vocale
  const [commandsMap, setCommandsMap] = useState(null);

  //variabili temporali per suggerire opere extra
  const [visitBeginTime, setVisitBeginTime] = useState(null);
  const [visitEndTime, setVisitEndTime] = useState(null);
  const [visitDurationTime, setVisitDurationTime] = useState(null);
  const [maxDurationTime, setMaxDurationTime] = useState(null);

  //usati per visualizzazione mappa
  const [svgMapString, setSvgMapString] = useState(null);
  const [activeSectionId, setActiveSectionId] = useState(null); // null = mappa intera

  const isSharedSession = Boolean(roomCode);

  const currentWork = currentWorkIndex >= 0 ? visitedWorks[currentWorkIndex] : null;
  
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
    const fetchMap = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/museum-map-svg`);
        const textData = await response.text();
        setSvgMapString(textData);
      } catch (error) {
        console.error("Errore caricamento mappa SVG:", error);
      }
    };
    fetchMap();
  }, []);

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

        setVisitQuiz(visitData.quiz || []);

        //salviamo i comandi vocali disponibili
        setCommandsMap(dictionary);

        //setta il livello di difficoltà della visita
        if(userData.preferences.expertiseLevel)
          setExpertiseLevel(userData.preferences.expertiseLevel || 'medium');

        //setta la lunghezza delle descrizioni delle opere
        if(visitData.preferredLength)
            setCurrentLength(visitData.preferredLength || "medium");
        
        if(visitData.maxDuration)
          setMaxDurationTime(visitData.maxDuration || null);

        // Controllo di sicurezza: ci assicuriamo che works sia un array
        const worksArray = Array.isArray(visitData.works) ? visitData.works : [];
        setVisitedWorks(worksArray);

        // Se stiamo entrando in una sessione già in corso, ci allineiamo subito all'opera del prof
        if (apiData.currentArtworkId && worksArray.length > 0) {
          const activeIndex = worksArray.findIndex(
            (w) => (w._id?.toString() || w.toString()) === apiData.currentArtworkId.toString()
          );
          if (activeIndex !== -1) {
            setCurrentWorkIndex(activeIndex);
          }
        }
        
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

            // const worksResponse = await fetch(`${API_BASE_URL}/museums/${museumId}/works`, { credentials: 'include' });
            // if (worksResponse.ok) {
            //   const worksData = await worksResponse.json();
            //   setAllMuseumWorks(Array.isArray(worksData) ? worksData : []);
            // }
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
      setPlayMode(false);
      return;
    }
    setPlayMode(true);
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = "it-IT";
    utterance.rate = parseFloat(localStorage.getItem('audioSpeed')) || 1.0;
    utterance.onend = () => setPlayMode(false);
    window.speechSynthesis.speak(utterance);
  };

  const selectSectionForWork = (work) => {
    if (!work || !hasMap) return null;
    const section = sections.find(s => 
      s.works && s.works.some(sw => (sw.workId?._id || sw.workId) === work._id)
    );
    if (section) {
      setSelectedSection(section);
      return { section };
    }
    return null;
  };

  // --- ASCOLTO EVENTI INSEGNANTE (DASHBOARD) ---
  useEffect(() => {
    if (isSharedSession && isTeacher && socket) {
      socket.on("teacher_dashboard_update", (payload) => {
        if (payload.type === 'interaction') {
          setInteractionFeed(prev => [payload.data, ...prev].slice(0, 50)); // Tieni in memoria le ultime 50 interazioni
        } else if (payload.type === 'status') {
          setClassStatus(prev => ({
            ...prev,
            [payload.data.socketId]: payload.data
          }));
        }
      });

      return () => {
        socket.off("teacher_dashboard_update");
      };
    }
  }, [isSharedSession, isTeacher, socket]);

  // Ascolto eventi studente
  useEffect(() => {
    if (isSharedSession && !isTeacher && socket) {
      socket.on("change_artwork", (data) => {
        if (!data || !data.artworkId) return;
        const index = visitedWorks.findIndex(w => w._id === data.artworkId);
        if (index != -1) {
          setCurrentWorkIndex(index);
          if (hasMap) selectSectionForWork(visitedWorks[index]);
        }
      });

      socket.on("quiz_started", (quizData) => {
        navigate(`/quiz?roomCode=${roomCode}&role=student`, { state: { quizData } });
      });

      socket.on("visit_ended", () => {
        setShowEndModal(true);
      });

      socket.on("room_closed", () => {
        alert("L'insegnante ha terminato definitivamente la sessione.");
        navigate("/my-visits"); 
      });

      const studentName = localStorage.getItem('student_name') || 'Studente';
      
      const sendStatus = (statusOverride) => {
        socket.emit('student_status_update', {
          roomCode,
          studentName,
          currentArtworkId: currentWork?._id,
          status: statusOverride || 'active'
        });
      };

      // 1. Invia stato attivo iniziale
      sendStatus('active');

      // 2. Gestori per la perdita di focus (cambio app, schermo spento, cambio tab)
      const handleVisibilityChange = () => {
        sendStatus(document.hidden ? 'away' : 'active');
      };

      const handleBlur = () => {
        sendStatus('away'); // Ha cliccato fuori dalla finestra o abbassato la tendina delle notifiche
      };

      const handleFocus = () => {
        sendStatus('active'); // È tornato sull'app
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("blur", handleBlur);
      window.addEventListener("focus", handleFocus);

      return () => {
        socket.off("change_artwork");
        socket.off("quiz_started");
        socket.off("visit_ended");
        socket.off("room_closed");
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("blur", handleBlur);
        window.removeEventListener("focus", handleFocus);
      };
    }
  }, [isSharedSession, isTeacher, visitedWorks, socket, navigate, roomCode, hasMap]);

  // --- SEGNALA USCITA DALLA MAPPA (Cambio pagina nel Navigator) ---
  useEffect(() => {
    if (isSharedSession && !isTeacher && socket && roomCode) {
      return () => {
        // Questa funzione di cleanup scatta solo quando lo studente esce definitivamente dalla MapView
        socket.emit('student_status_update', {
          roomCode,
          studentName: localStorage.getItem('student_name') || 'Studente',
          status: 'away' 
        });
      };
    }
  }, [isSharedSession, isTeacher, socket, roomCode]);

  // SINCRONIZZAZIONE AUTOMATICA TELECAMERA
  useEffect(() => {
    if (currentWorkIndex >= 0 && visitedWorks.length > 0 && hasMap) {
      const activeWork = visitedWorks[currentWorkIndex];
      
      // Troviamo la sezione che contiene quest'opera
      const targetSection = sections.find(sec => 
        sec.works && sec.works.some(sw => (sw.workId?._id || sw.workId) === activeWork._id)
      );

      // Se cambia sezione, effettuiamo lo zoom
      if (targetSection && targetSection._id !== selectedSection?._id) {
        setSelectedSection(targetSection);
      }
    }
  }, [currentWorkIndex, visitedWorks, sections, hasMap]);

  const handleNext = () => {
    if (currentWorkIndex < visitedWorks.length - 1) {
      const nextIndex = currentWorkIndex + 1;
      const previousWork = currentWorkIndex >= 0 ? visitedWorks[currentWorkIndex] : null;
      setCurrentWorkIndex(nextIndex);
      const activeWork = visitedWorks[nextIndex];
      
      if (hasMap) {
        const currentSection = selectedSection;
        const { section: nextSection, room: nextRoom } = selectSectionForWork(activeWork) || {};
        
        if (nextSection && nextRoom) {
          if (currentSection && nextSection._id === currentSection._id) {
            alert(`La prossima opera si trova in ${nextRoom.name}`);
          } else {
            alert(`La prossima opera si trova nella sezione ${nextSection.name}, sala ${nextRoom.name}`);
          }
        } else {
          alert("Attenzione: Impossibile determinare la posizione della prossima opera.");
        }
      }

      if (isSharedSession && isTeacher && socket) {
        socket.emit("change_artwork", { roomCode, artworkId: activeWork._id });
      }
    }
  };

  const handlePrev = () => {
    if (currentWorkIndex > 0) {
      const prevIndex = currentWorkIndex - 1;
      const previousWork = visitedWorks[currentWorkIndex];
      setCurrentWorkIndex(prevIndex);
      
      if (hasMap) {
        const currentSection = selectedSection;
        const activeWork = visitedWorks[prevIndex];
        const { section: prevSection, room: prevRoom } = selectSectionForWork(activeWork) || {};
        if (prevSection && prevRoom) {
          if (currentSection && prevSection._id === currentSection._id) {
            alert(`La prossima opera si trova in ${prevRoom.name}`);
          } else {
            alert(`La prossima opera si trova nella sezione ${prevSection.name}, sala ${prevRoom.name}`);
          }
        } else {
          alert("Attenzione: Impossibile determinare la posizione della prossima opera.");
        }
      }

      if (isSharedSession && isTeacher && socket) {
        socket.emit("change_artwork", { roomCode, artworkId: visitedWorks[prevIndex]._id });
      }
    } else if (currentWorkIndex === 0) {
      setCurrentWorkIndex(-1);
      setSelectedSection(null);
    }
  };

  const handleEndVisit = async () => {
    // 1. Calcolo del tempo
    const endTime = Date.now();
    setVisitEndTime(endTime);
    const elapsedMilliseconds = endTime - visitBeginTime;
    const elapsedMinutes = Math.floor(elapsedMilliseconds / 1000 / 60);

    // 2. Troviamo le opere rimanenti
    const remainingWorks = allMuseumWorks.filter(w => !visitedWorks.some(vw => vw._id === w._id));

    if (remainingWorks.length > 0) {
      const READING_TIMES = {
        short: 3 / 60,
        medium: 15 / 60,
        long: 1,
        exhaustive: 4
      };

      const payloadForAI = {
        seen: visitedWorks.map(w => ({ name: w.name, author: w.authorName, style: w.styleName })),
        available: remainingWorks.map(w => ({ id: w._id, name: w.name, author: w.authorName, style: w.styleName })),
        remaining_time: maxDurationTime - elapsedMinutes,
        duration: READING_TIMES[currentLength]
      };

      try {
        //Chiamata API ad AI per richiedere delle opere da visionare inerti alla visita volta
        const aiResponse = await fetch(`${API_BASE_URL}/ai/suggested-works`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payloadForAI: payloadForAI }) // Assicurati che backend legga req.body.payloadForAI
        });

        if (!aiResponse.ok) {
          throw new Error(suggestedWorksData.error || "Il server ha risposto con un errore");
        }
        
        const suggestedWorksData = await aiResponse.json();

        const recomendedIds = suggestedWorksData.works;

        const finalSuggestedWorks = remainingWorks.filter(work => 
          recomendedIds.includes(work._id.toString())
        );
        
        if(finalSuggestedWorks.length > 0) {
          console.log("Opere complete suggerite:", finalSuggestedWorks);
          //operazione di spread per aggiungere il lavori suggeriti a visitedWorks in modo da riutilizzare gli altri componenti
          setVisitedWorks(prevWorks => [...prevWorks, ...finalSuggestedWorks]);
          alert(`Dato che hai ancora ${maxDurationTime - elapsedMinutes} minuti prima della conclusione della visita, suggeriamo di visionare altre ${finalSuggestedWorks.length} opere inerenti alla visita eseguita. Premi "Prossima" per continuare!`);
        } else {
          alert('Siamo spiacenti, ma non abbiamo altre opere di cui consigliare la visione');
        }
      } catch (error) { //c'è stato qualche problema con la richiesta all'AI
        alert("Non ci sono altre opere da vedere inerenti alla visita fatta. " + error.message);
      }
    } else {
      // Se l'utente ha visto letteralmente tutto il museo
      alert("Complimenti! Hai visto tutte le opere del museo.");
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

      {isSharedSession && isTeacher && (
        <button 
          onClick={() => setShowTeacherDashboard(true)} 
          className="absolute top-4 left-4 z-[9999] flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 border border-purple-400/50 rounded-full text-white text-sm font-bold transition-colors shadow-lg cursor-pointer animate-pulse"
        >
          <Activity size={16} /> Radar Classe
        </button>
      )}

      {/* 3. Mappa o Fallback (Prende tutto lo spazio rimanente con flex-1) */}
      <div className="w-full h-full relative overflow-hidden flex-1">
        {hasMap && svgMapString ? (
          <HighlyOptimizedMapView 
            svgString={svgMapString}
            activeSection={selectedSection}
            sections={sections}
            onSelectSection={(section) => setSelectedSection(section)}
            onBack={() => setSelectedSection(null)}
            works={visitedWorks}
            activeWorkId={currentWork?._id}
            onWorkClick={(work) => setDetailsWork(work)}
          />
        ) : hasMap && !svgMapString ? (
          <div className="w-full h-full flex items-center justify-center text-white">
              <Loader2 className="animate-spin text-cyan-400 mr-2" size={24} /> Caricamento planimetria...
          </div>
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
        onEndVisit={handleEndVisit}
        onStartVisit={() => {
          setVisitBeginTime(Date.now());
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
        onSpeak={speakText}
        isSharedSession={isSharedSession}
        isTeacher={isTeacher}
        currentLength={currentLength}
        expertiseLevel={expertiseLevel}
        onShowJoinModal={() => setShowJoinModal(true)}
      />

      {/* Modali e Bottom Sheet */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/85 z-[10000] flex items-center justify-center p-4">
          <div className="w-full max-w-[560px] bg-[#121218] border border-white/10 rounded-2xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.8)] text-white text-center">
            
            <h3 className="flex items-center justify-center gap-2 text-cyan-400 text-xl font-extrabold mb-3">
              <CheckCircle2 className="text-green-500" size={24} /> Visita completata!
            </h3>
            
            {/* LOGICA INSEGNANTE: Sceglie cosa fare */}
            {isSharedSession && isTeacher ? (
              <>
                <p className="text-slate-400 text-sm mb-6">
                  Hai guidato i tuoi studenti attraverso tutte le opere. Vuoi avviare il quiz di verifica o terminare la sessione?
                </p>
                <div className="flex flex-col gap-3">
                  {visitQuiz && visitQuiz.length > 0 && (
                    <button 
                      onClick={() => {
                         socket.emit('start_quiz', { roomCode, quizData: visitQuiz });
                         navigate(`/quiz?roomCode=${roomCode}&role=teacher`, { state: { quizData: visitQuiz, visitId: visitId } });
                      }} 
                      className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-white font-bold transition-colors shadow-lg cursor-pointer"
                    >
                      Lancia quiz finale
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      // Chiude la stanza per tutti
                      socket.emit('close_room', { roomCode });
                      navigate("/my-visits");
                    }}
                    className="w-full px-6 py-3 border border-white/20 rounded-xl text-white hover:bg-white/10 transition-colors font-medium cursor-pointer"
                  >
                    Termina sessione definitivamente
                  </button>
                </div>
              </>
            ) : isSharedSession && !isTeacher ? (
              /* LOGICA STUDENTE: Attende il comando del prof */
              <>
                <p className="text-slate-400 text-sm mb-6">
                  Il percorso guidato è terminato. Resta in attesa, l'insegnante potrebbe avviare un quiz a breve!
                </p>
                <div className="flex justify-center">
                  <div className="flex items-center gap-2 text-amber-500 bg-amber-500/10 px-4 py-2 rounded-lg text-sm">
                    <Loader2 size={16} className="animate-spin" /> In attesa dell'insegnante...
                  </div>
                </div>
              </>
            ) : (
              /* LOGICA VISITATORE NORMALE (Navigazione Libera) */
              <>
                <p className="text-slate-400 text-sm mb-6">
                  Hai visitato tutte le opere d'arte presenti in questa visita. Cosa desideri fare ora?
                </p>
                <button 
                  onClick={() => navigate("/my-visits")} 
                  className="px-6 py-2.5 border border-white/20 rounded-full text-white hover:bg-white/10 transition-colors text-sm font-medium cursor-pointer"
                >
                  Termina visita
                </button>
              </>
            )}
            
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
          currentLength={currentLength}
          setCurrentLength={setCurrentLength}
          playMode={playMode}
        />
      )}

      {/* Modale Codice Stanza (Solo Insegnante) */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/85 z-[10000] flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-[#121218] border border-white/10 rounded-3xl p-6 shadow-2xl relative text-center">
            
            <button 
              onClick={() => setShowJoinModal(false)}
              className="absolute top-4 right-4 p-2 bg-slate-800 text-slate-400 rounded-full hover:bg-slate-700 hover:text-white cursor-pointer transition-colors"
            >
              <X size={20} />
            </button>

            <div className="w-16 h-16 bg-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-4 mt-2">
              <QrCode size={32} />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">Codice Stanza</h3>
            <p className="text-slate-400 text-sm mb-6">Fai inquadrare questo codice o comunicalo agli utenti in ritardo.</p>
            
            {/* Il nostro nuovo componente riutilizzabile! */}
            <div className="mb-6">
              <RoomQRCode roomCode={roomCode} />
            </div>
            
            <div className="bg-slate-900 border border-slate-700 py-4 rounded-2xl mb-2">
              <span className="text-4xl font-mono font-bold text-cyan-400 tracking-widest">{roomCode}</span>
            </div>
            
          </div>
        </div>
      )}

      <TeacherDashboard 
        isOpen={showTeacherDashboard} 
        onClose={() => setShowTeacherDashboard(false)} 
        roomCode={roomCode} 
        classStatus={classStatus} 
        interactionFeed={interactionFeed}
        totalWorks={visitedWorks.length}
      />
    </div>
  );
}
