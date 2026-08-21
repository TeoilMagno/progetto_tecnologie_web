import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, GraduationCap, Presentation, Users, Loader2, AlertCircle, RefreshCw, Sparkles, ArrowLeft, ArrowRight, Play, Send, Camera, CameraOff, CheckCircle2 } from 'lucide-react';
import QRCode from 'react-qr-code';
import QrScanner from 'qr-scanner';
// Vite: importa l'URL del worker già bundlato dalla libreria (necessario per farlo funzionare col bundler)
import QrScannerWorkerPath from 'qr-scanner/qr-scanner-worker.min.js?url';
import { API_BASE_URL } from '../config';
import { useSocket } from '../context/SocketContext';
import LoginModal from '../components/loginModal';

QrScanner.WORKER_PATH = QrScannerWorkerPath;

export default function JoinSession() {
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [studentName, setStudentName] = useState(
    localStorage.getItem('student_name') || currentUser?.name || ''
  );
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState('none'); // 'student' | 'teacher' | 'none'
  const [roomCode, setRoomCode] = useState('');
  const [teacherRoomCode, setTeacherRoomCode] = useState('');
  const [connectedStudents, setConnectedStudents] = useState([]);
  const [isRoomCreated, setIsRoomCreated] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [availableVisits, setAvailableVisits] = useState([]);
  const [selectedVisitId, setSelectedVisitId] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [savedSession, setSavedSession] = useState(null);

  // --- Stato per lo scanner QR reale (lato studente) ---
  const [cameraStatus, setCameraStatus] = useState('idle'); // 'idle' | 'starting' | 'active' | 'error' | 'scanned'
  const [cameraErrorMsg, setCameraErrorMsg] = useState('');
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const hasScannedRef = useRef(false);
  
  // All'avvio, controlliamo se c'è una sessione "in sospeso"
  useEffect(() => {
    const sessionStr = localStorage.getItem('savedSession');
    if (sessionStr) {
      try {
        setSavedSession(JSON.parse(sessionStr));
      } catch (e) {
        console.error("Errore nel leggere la sessione salvata");
      }
    }
  }, []);

  useEffect(() => {
    // Quando uno studente si unisce alla stanza, aggiorniamo la lista del professore
    socket.on('student_joined', (student) => {
      setConnectedStudents((prev) => [...prev, student]);
    });

    socket.on('room_joined', (data) => {
      if (data.success) {
        // Reindirizziamo alla sala d'attesa dello studente anziché direttamente alla mappa
        navigate(`/waiting-room?roomCode=${data.roomCode}&studentName=${encodeURIComponent(studentName)}`);
      }
    });

    socket.on('error', (msg) => {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 3000);
    });

    // Pulizia dei listener quando il componente si smonta
    return () => {
      socket.off('student_joined');
      socket.off('room_joined');
      socket.off('error');
    };
  }, [socket]);

  // 1. Fetch utente unico all'avvio
  useEffect(() => {
    let isMounted = true;
    fetch(`${API_BASE_URL}/current-user`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error("Non autenticato");
        return res.json();
      })
      .then((data) => {
        if (isMounted && data) {
          setCurrentUser(data);
          // Non forziamo userType a 'none' se l'utente ha già scelto, 
          // lasciamo che sia lui a scegliere o usiamo il suo default
        }
        if (isMounted) setLoading(false);
      })
      .catch((err) => {
        if (isMounted) {
          setCurrentUser({ name: 'Ospite' });
          setLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, []);

  // 2. Salvataggio nome locale sicuro
  useEffect(() => {
    if (studentName) {
      localStorage.setItem('student_name', studentName);
    }
  }, [studentName]);

  // 3. Fetch visite insegnante protetto (usa l'ID utente come dipendenza fissa)
  useEffect(() => {
    if (userType === 'teacher' && currentUser?._id) {
      // Usiamo /my-visits per recuperare le visite personali/private del docente loggato
      fetch(`${API_BASE_URL}/my-visits`, { credentials: 'include' })
        .then((res) => {
          if (!res.ok) throw new Error("Errore nel recupero delle visite personali");
          return res.json();
        })
        .then((data) => {
          const currentMuseumId = localStorage.getItem('selected_museum_id');

          // Se vuoi filtrare escludendo le bozze (supponendo che ci sia un campo isDraft o simile)
          // altrimenti puoi usare direttamente 'data'
          const activeVisits = data.filter(visit => {
            if (visit.isDraft) return false;

            // Gestione sicura del confronto del museo (può essere stringa o oggetto)
            if (!currentMuseumId) return true; // Se per qualche motivo non c'è il museo salvato, le mostra tutte
            
            const visitMuseumId = visit.museumId?._id ? visit.museumId._id.toString() : visit.museumId?.toString();
            return visitMuseumId === currentMuseumId;
          });

          setAvailableVisits(activeVisits);
          if (activeVisits.length > 0 && !selectedVisitId) {
            setSelectedVisitId(activeVisits[0]._id);
          }
        })
        .catch((err) => console.error("Errore caricamento visite insegnante:", err));
    }
  }, [userType, currentUser?._id]);

  const handleSelectType = (type) => {
    if (type === 'teacher') {
      // Controlliamo se l'utente è loggato
      if (!currentUser || !currentUser._id || currentUser.name === 'Ospite') {
        // Invece di reindirizzare, apriamo il modale in stile Navigator!
        setShowLoginModal(true);
        return;
      }
    }

    setUserType(type);
    if (currentUser && currentUser._id) {
      fetch(`${API_BASE_URL}/current-user/type`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type }),
      }).catch((err) => console.error('Error saving user type:', err));
    }
  };

  // 3. Quando crea la stanza, passiamo al server o salviamo anche la visita scelta
  const handleCreateRoom = () => {
    if (!selectedVisitId) {
      alert("Seleziona una visita da sincronizzare prima di avviare la stanza.");
      return;
    }

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTeacherRoomCode(code);
    setIsRoomCreated(true);
    setConnectedStudents([]);

    // Inviamo al server il codice e l'ID della visita associata
    socket.emit('create_room', { roomCode: code, visitId: selectedVisitId });
  };

  const handleRejoin = () => {
    if (savedSession) {
      navigate(`/map?visitId=${savedSession.visitId}&roomCode=${savedSession.roomCode}&role=${savedSession.role}`);
    }
  };

  const handleJoinRoom = () => {
    if (savedSession) {
      // Naviga direttamente usando i dati salvati!
      navigate(`/map?visitId=${savedSession.visitId}&roomCode=${savedSession.roomCode}&role=${savedSession.role}`);
    } else if (roomCode.length === 6) {
      const nameToUse = studentName.trim() || 'Ospite';
      // Socket emit corretto
      socket.emit('join_room', { roomCode, studentName: nameToUse });
    }
  };

  const handleStartSharedSession = () => {
    if (!selectedVisitId || !teacherRoomCode) return;
    
    // Avvisiamo tutti i socket della stanza che la sessione è partita
    socket.emit('start_shared_session', { roomCode: teacherRoomCode, visitId: selectedVisitId });

    // Spostiamo anche il docente sulla mappa
    navigate(`/map?visitId=${selectedVisitId}&roomCode=${teacherRoomCode}&role=teacher`);
  };

  const handleResetType = () => {
    handleSelectType('none');
    setIsRoomCreated(false);
    setTeacherRoomCode('');
    setConnectedStudents([]);
    stopScanner();
  };

  // --- SCANNER QR REALE ---

  // Il QR può contenere sia un link diretto (?roomCode=XXXXXX) sia il solo
  // codice a 6 caratteri: gestiamo entrambi i casi.
  const extractRoomCode = (rawText) => {
    if (!rawText) return null;

    try {
      const url = new URL(rawText);
      const codeFromUrl = url.searchParams.get('roomCode');
      if (codeFromUrl) return codeFromUrl.trim().toUpperCase();
    } catch (e) {
      // Non è un URL valido: proviamo a trattarlo come codice diretto
    }

    const trimmed = rawText.trim().toUpperCase();
    if (/^[A-Z0-9]{6}$/.test(trimmed)) return trimmed;
    return null;
  };

  const stopScanner = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setCameraStatus('idle');
  };

  const startScanner = async () => {
    if (!videoRef.current) return;
    hasScannedRef.current = false;
    setCameraErrorMsg('');
    setCameraStatus('starting');

    try {
      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        setCameraStatus('error');
        setCameraErrorMsg('Nessuna fotocamera trovata su questo dispositivo.');
        return;
      }

      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          if (hasScannedRef.current) return;
          const code = extractRoomCode(result.data);
          if (!code) {
            // QR letto ma non riconosciuto: continuiamo a scansionare
            return;
          }
          hasScannedRef.current = true;
          setRoomCode(code);
          setCameraStatus('scanned');
          scanner.stop();
        },
        {
          highlightScanRegion: false,
          highlightCodeOutline: false,
          maxScansPerSecond: 5,
          preferredCamera: 'environment', // fotocamera posteriore su mobile
        }
      );

      qrScannerRef.current = scanner;
      await scanner.start();
      // Rete di sicurezza: su alcuni browser mobile l'autoplay interno
      // di qr-scanner non basta, forziamo esplicitamente il play.
      try {
        await videoRef.current.play();
      } catch (playErr) {
        console.warn('video.play() esplicito fallito (potrebbe non servire):', playErr);
      }
      setCameraStatus('active');
    } catch (err) {
      console.error('Errore avvio fotocamera:', err);
      setCameraStatus('error');
      if (err?.name === 'NotAllowedError') {
        setCameraErrorMsg('Permesso fotocamera negato. Abilitalo dalle impostazioni del browser.');
      } else if (!window.isSecureContext) {
        setCameraErrorMsg('La fotocamera richiede una connessione sicura (HTTPS).');
      } else {
        setCameraErrorMsg('Impossibile accedere alla fotocamera.');
      }
    }
  };

  // Ferma sempre la fotocamera quando si esce dalla schermata studente o si smonta il componente
  useEffect(() => {
    if (userType !== 'student') {
      stopScanner();
    }
    return () => stopScanner();
  }, [userType]);

  // Se si arriva da un link diretto generato scansionando il QR con l'app
  // fotocamera nativa (fuori dal nostro scanner in-app), precompiliamo il codice
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('roomCode');
    if (codeFromUrl && /^[A-Z0-9]{6}$/i.test(codeFromUrl)) {
      setUserType('student');
      setRoomCode(codeFromUrl.toUpperCase());
    }
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-screen bg-slate-950 text-white">
        <Loader2 className="animate-spin text-amber-500 mb-2" size={36} />
        <span className="text-slate-400 text-sm">Verifica profilo in corso...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative bg-slate-950 text-white pb-24">
      
      {/* BACKGROUND IMAGE FISSA SFUMATA */}
      <div className="absolute inset-0 z-0 h-96">
         <img src="/img1.jpg" alt="Background" className="w-full h-full object-cover opacity-15" />
         <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(to bottom, transparent 0%, rgba(14, 22, 42, 1) 90%, rgba(14, 22, 42, 1) 100%)'}}></div>
      </div>

      <div className="relative z-10 flex flex-col items-center pt-8 px-4 md:px-6 w-full max-w-lg mx-auto">
        
        {/* --- BANNER SESSIONE SOSPESA --- */}
        {savedSession && (
          <div className="w-full max-w-sm mb-8 bg-slate-800/80 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-5 shadow-[0_0_25px_rgba(0,204,255,0.15)] relative z-20">
            <div className="flex items-center gap-3 mb-3 text-cyan-400">
              <Play size={20} className="fill-cyan-400" />
              <h3 className="font-bold text-sm uppercase tracking-wider">Sessione in corso</h3>
            </div>
            <p className="text-slate-300 text-sm mb-4">
              Risulti già connesso alla stanza <strong className="text-white bg-slate-900 px-2 py-1 rounded">{savedSession.roomCode}</strong>.
            </p>
            <div className="flex gap-2">
              <button 
                onClick={handleRejoin}
                className="flex-1 flex justify-center items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2.5 rounded-xl transition-colors text-sm cursor-pointer"
              >
                Rientra subito <ArrowRight size={16} />
              </button>
              <button 
                onClick={() => {
                  localStorage.removeItem('savedSession');
                  setSavedSession(null);
                }}
                className="px-4 py-2.5 border border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-white rounded-xl transition-colors text-sm cursor-pointer"
              >
                Ignora
              </button>
            </div>
          </div>
        )}

        {/* INTESTAZIONE PAGINA */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
            <Users size={14} /> Sessione Di Gruppo
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-white">Join a Session</h1>
          <p className="text-slate-400 text-xs md:text-sm">Partecipa a una spiegazione sincronizzata o gestisci una classe</p>
        </div>

        {/* FEEDBACK ERRORI */}
        {errorMsg && (
          <div className="w-full bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg flex items-center justify-center gap-2 mb-4 animate-fadeIn">
            <AlertCircle size={18} /> <span className="text-sm font-bold">{errorMsg}</span>
          </div>
        )}

        {/* 1. SELEZIONE RUOLO */}
        {userType === 'none' && (
          <div className="w-full space-y-4 mt-4 animate-fadeIn">
            <p className="text-slate-400 text-sm text-center mb-6">
              Scegli il tuo ruolo per questa sessione.
            </p>

            {/* CARD STUDENTE */}
            <div 
              onClick={() => handleSelectType('student')}
              className="group relative flex items-center p-5 bg-[#1e293b]/60 backdrop-blur-md border border-slate-700/50 hover:border-amber-500/50 rounded-2xl transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl flex items-center justify-center text-3xl mr-4 flex-shrink-0 group-hover:scale-105 transition-transform">
                <GraduationCap size={28} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-white font-bold text-lg mb-0.5 group-hover:text-amber-400 transition-colors">Studente / Visitatore</h3>
                <p className="text-slate-400 text-xs leading-normal">Inquadra il QR Code o digita il codice fornito dall'insegnante per unirti.</p>
              </div>
            </div>

            {/* CARD INSEGNANTE */}
            <div 
              onClick={() => handleSelectType('teacher')}
              className="group relative flex items-center p-5 bg-[#1e293b]/60 backdrop-blur-md border border-slate-700/50 hover:border-purple-500/50 rounded-2xl transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="w-14 h-14 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center text-3xl mr-4 flex-shrink-0 group-hover:scale-105 transition-transform">
                <Presentation size={28} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-white font-bold text-lg mb-0.5 group-hover:text-purple-400 transition-colors">Insegnante / Guida</h3>
                <p className="text-slate-400 text-xs leading-normal">Crea una stanza virtuale, genera un codice e guida i tuoi studenti.</p>
              </div>
            </div>
          </div>
        )}

        {/* 2. INTERFACCIA STUDENTE */}
        {userType === 'student' && (
          <div className="w-full space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between w-full">
              <button onClick={handleResetType} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors cursor-pointer">
                <ArrowLeft size={14} /> Cambia Ruolo
              </button>
              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-500 px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                <GraduationCap size={12} /> STUDENTE
              </span>
            </div>

            {/* Input Nome Studente */}
            <div className="w-full bg-[#1e293b]/40 backdrop-blur-md border border-slate-800 rounded-2xl p-5 mb-4">
              <label className="block text-left text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Come ti chiami?
              </label>
              <input
                type="text"
                placeholder="Il tuo nome"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-all"
              />
            </div>

            {/* SCANNER QR REALE */}
            <div className="w-full bg-[#0f172a]/80 border border-slate-800 rounded-3xl p-5 flex flex-col items-center">
              <div className="text-left w-full mb-3 flex items-center justify-between">
                <h3 className="text-slate-300 font-bold text-sm">Scansione QR Code</h3>

                {cameraStatus === 'active' && (
                  <span className="flex items-center gap-1 text-[10px] text-green-400 bg-green-400/10 px-2 py-0.5 rounded-md">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></span> IN ASCOLTO
                  </span>
                )}
                {cameraStatus === 'starting' && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md">
                    <Loader2 size={10} className="animate-spin" /> AVVIO...
                  </span>
                )}
                {cameraStatus === 'scanned' && (
                  <span className="flex items-center gap-1 text-[10px] text-green-400 bg-green-400/10 px-2 py-0.5 rounded-md">
                    <CheckCircle2 size={10} /> CODICE LETTO
                  </span>
                )}
                {cameraStatus === 'error' && (
                  <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-400/10 px-2 py-0.5 rounded-md">
                    <CameraOff size={10} /> NON DISPONIBILE
                  </span>
                )}
                {cameraStatus === 'idle' && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-500/10 px-2 py-0.5 rounded-md">
                    <Camera size={10} /> IN ATTESA
                  </span>
                )}
              </div>

              <div className="relative w-full aspect-square max-w-[240px] border border-slate-800 bg-slate-950 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
                {/* Il video resta SEMPRE montato e visibile: su molti browser mobile,
                    un <video> con display:none al momento in cui riceve lo stream
                    non renderizza mai un frame valido, anche se poi lo si mostra */}
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover z-0"
                  autoPlay
                  muted
                  playsInline
                />

                <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-amber-500 z-10"></div>
                <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-amber-500 z-10"></div>
                <div className="absolute bottom-4 left-4 w-5 h-5 border-b-2 border-l-2 border-amber-500 z-10"></div>
                <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-amber-500 z-10"></div>

                {cameraStatus === 'active' && (
                  <div className="absolute left-0 right-0 h-[2px] bg-amber-500 shadow-[0_0_10px_#f59e0b] top-0 animate-scanner z-10"></div>
                )}

                {/* Overlay che COPRE il video (non lo nasconde) finché non è attivo */}
                {(cameraStatus === 'idle' || cameraStatus === 'starting' || cameraStatus === 'error') && (
                  <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-center p-6 text-slate-700 select-none z-20">
                    <QrCode size={64} className="opacity-10 mb-2 animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-20">
                      {cameraStatus === 'error' ? 'Fotocamera non disponibile' : 'In attesa di avvio'}
                    </span>
                  </div>
                )}

                {cameraStatus === 'scanned' && (
                  <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center z-20">
                    <CheckCircle2 size={40} className="text-green-400 mb-2" />
                    <span className="text-white font-bold text-sm">Codice rilevato!</span>
                  </div>
                )}
              </div>

              {cameraStatus === 'error' && cameraErrorMsg && (
                <p className="text-red-400 text-[11px] text-center mt-3 max-w-xs">{cameraErrorMsg}</p>
              )}

              {/* Bottone per avviare/fermare esplicitamente la fotocamera */}
              {cameraStatus === 'idle' && (
                <button
                  onClick={startScanner}
                  className="mt-4 w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-xl transition-all text-sm cursor-pointer"
                >
                  <Camera size={16} /> Attiva Fotocamera
                </button>
              )}
              {(cameraStatus === 'active' || cameraStatus === 'starting') && (
                <button
                  onClick={stopScanner}
                  className="mt-4 w-full flex items-center justify-center gap-2 border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold py-2.5 rounded-xl transition-all text-sm cursor-pointer"
                >
                  <CameraOff size={16} /> Ferma Scansione
                </button>
              )}
              {cameraStatus === 'error' && (
                <button
                  onClick={startScanner}
                  className="mt-4 w-full flex items-center justify-center gap-2 border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold py-2.5 rounded-xl transition-all text-sm cursor-pointer"
                >
                  <RefreshCw size={16} /> Riprova
                </button>
              )}
              {cameraStatus === 'scanned' && (
                <button
                  onClick={startScanner}
                  className="mt-4 w-full flex items-center justify-center gap-2 border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold py-2.5 rounded-xl transition-all text-sm cursor-pointer"
                >
                  <RefreshCw size={16} /> Scansiona di nuovo
                </button>
              )}

              <p className="text-slate-500 text-[10px] text-center mt-3 max-w-xs">
                Inquadra il QR Code generato dall'insegnante per connetterti automaticamente.
              </p>
            </div>

            <div className="flex items-center justify-center w-full gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest my-2">
              <span className="h-[1px] bg-slate-800 flex-1"></span>
              <span>Oppure</span>
              <span className="h-[1px] bg-slate-800 flex-1"></span>
            </div>

            {/* CAMPO CODICE STANZA */}
            <div className="w-full bg-[#1e293b]/40 backdrop-blur-md border border-slate-800 rounded-2xl p-5">
              <label className="block text-left text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Inserisci Codice Stanza
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Esempio: ART452"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-center text-base font-extrabold tracking-widest uppercase focus:outline-none focus:border-amber-500 transition-all"
                />
                <button 
                  onClick={handleJoinRoom}
                  disabled={roomCode.length !== 6}
                  className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 text-slate-950 font-extrabold rounded-xl px-5 transition-all shadow-lg cursor-pointer"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. INTERFACCIA INSEGNANTE */}
        {userType === 'teacher' && (
          <div className="w-full space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between w-full">
              <button onClick={handleResetType} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors cursor-pointer">
                <ArrowLeft size={14} /> Cambia Ruolo
              </button>
              <span className="flex items-center gap-1 text-[11px] font-bold text-purple-400 px-2.5 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-full">
                <Presentation size={12} /> INSEGNANTE
              </span>
            </div>

            {!isRoomCreated ? (
              <div className="w-full bg-[#1e293b]/40 backdrop-blur-md border border-slate-800 rounded-3xl p-6 flex flex-col items-center">
                <div className="w-full mb-4 text-left">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                    Seleziona Percorso da Sincronizzare
                  </label>
                  <select
                    value={selectedVisitId}
                    onChange={(e) => setSelectedVisitId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500"
                  >
                    {availableVisits.map((visit) => (
                      <option key={visit._id} value={visit._id} className="bg-slate-900 text-white">
                        {visit.title} ({visit.works?.length || 0} opere)
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleCreateRoom}
                  disabled={!selectedVisitId}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-purple-500/10 cursor-pointer"
                >
                  Crea Nuova Stanza
                </button>
              </div>
            ) : (
              <div className="w-full space-y-5 animate-fadeIn">
                <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col items-center text-center">
                  <span className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase mb-1">CODICE STANZA</span>
                  <h2 className="text-4xl font-black text-amber-500 tracking-widest uppercase font-mono mb-4">{teacherRoomCode}</h2>
                  
                  {/* GENERATORE QR CODE REALE */}
                  <div className="relative w-44 h-44 bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-center shadow-lg shadow-white/5 mb-4 overflow-hidden">
                    <QRCode
                      value={`${window.location.origin}/navigator/join?roomCode=${teacherRoomCode}`}
                      size={256}
                      style={{ width: '100%', height: '100%' }}
                      fgColor="#020617"
                      bgColor="#ffffff"
                      viewBox="0 0 256 256"
                      level="H"
                    />
                    <div className="absolute inset-0 m-auto w-10 h-10 bg-slate-950 border-2 border-white rounded-lg flex items-center justify-center text-xs font-black text-amber-500">
                      AA
                    </div>
                  </div>
                  <p className="text-slate-400 text-xs max-w-xs leading-relaxed">
                    Mostra questo codice o proietta il QR code per permettere ai tuoi studenti di accedere.
                  </p>
                </div>

                <div className="w-full bg-[#1e293b]/40 backdrop-blur-md border border-slate-800 rounded-3xl p-5">
                  <h3 className="text-slate-300 font-bold text-sm flex items-center gap-2 mb-4">
                    <Users size={16} className="text-purple-400" /> Studenti Connessi ({connectedStudents.length})
                  </h3>

                  {connectedStudents.length === 0 ? (
                    <p className="text-slate-500 text-xs text-center py-4">In attesa degli studenti...</p>
                  ) : (
                    <ul className="space-y-2">
                      {connectedStudents.map(student => (
                        <li key={student.id} className="flex items-center justify-between px-3 py-2 bg-slate-900/60 border border-slate-800/80 rounded-xl animate-fadeIn">
                          <span className="text-xs font-semibold text-slate-200">{student.name}</span>
                          <span className="text-[10px] text-green-400 uppercase tracking-wider animate-pulse">Online</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <button
                  onClick={handleStartSharedSession}
                  disabled={connectedStudents.length === 0}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all cursor-pointer"
                >
                  Avvia Spiegazione Condivisa
                </button>
              </div>
            )}
          </div>
        )}

        {/* MODALE DI LOGIN INTEGRATO */}
        <LoginModal 
          isOpen={showLoginModal} 
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={() => {
            setShowLoginModal(false);
            fetch(`${API_BASE_URL}/current-user`, { credentials: 'include' })
              .then((res) => res.json())
              .then((data) => {
                if (data) {
                  setCurrentUser(data);
                  setUserType('teacher');
                }
              })
              .catch((err) => console.error("Errore aggiornamento utente post-login:", err));
          }}
        />
      </div>
    </div>
  );
}