import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, GraduationCap, Presentation, Users, Loader2, AlertCircle, RefreshCw, Sparkles, ArrowLeft, Send } from 'lucide-react';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../config';
import LoginModal from '../components/loginModal';

// Inizializziamo il socket fuori dal componente così la connessione è unica
const socket = io(SOCKET_URL);

export default function JoinSession() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [studentName, setStudentName] = useState(
    localStorage.getItem('student_name') || currentUser?.name || ''
  );
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState('none'); // 'student' | 'teacher' | 'none'
  const [roomCode, setRoomCode] = useState('');
  const [isScanning, setIsScanning] = useState(true);
  const [teacherRoomCode, setTeacherRoomCode] = useState('');
  const [connectedStudents, setConnectedStudents] = useState([]);
  const [isRoomCreated, setIsRoomCreated] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [availableVisits, setAvailableVisits] = useState([]);
  const [selectedVisitId, setSelectedVisitId] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  
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
  }, []);

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

  const handleJoinRoom = () => {
    if(roomCode.length === 6) {
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
  };

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
      <div className="absolute inset-0 z-0 h-96">
         <img src="/img1.jpg" alt="Background" className="w-full h-full object-cover opacity-15" />
         <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(to bottom, transparent 0%, rgba(14, 22, 42, 1) 90%, rgba(14, 22, 42, 1) 100%)'}}></div>
      </div>

      <div className="relative z-10 flex flex-col items-center pt-8 px-4 md:px-6 w-full max-w-lg mx-auto">
        
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
            {/* Card Studente */}
            <div onClick={() => handleSelectType('student')} className="group relative flex items-center p-5 bg-[#1e293b]/60 backdrop-blur-md border border-slate-700/50 hover:border-amber-500/50 rounded-2xl transition-all active:scale-[0.98] cursor-pointer">
              <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl flex items-center justify-center text-3xl mr-4 flex-shrink-0 group-hover:scale-105 transition-transform">
                <GraduationCap size={28} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-white font-bold text-lg mb-0.5 group-hover:text-amber-400 transition-colors">Studente / Visitatore</h3>
                <p className="text-slate-400 text-xs leading-normal">Inquadra il QR Code o digita il codice fornito dall'insegnante per unirti.</p>
              </div>
            </div>

            {/* Card Insegnante */}
            <div onClick={() => handleSelectType('teacher')} className="group relative flex items-center p-5 bg-[#1e293b]/60 backdrop-blur-md border border-slate-700/50 hover:border-purple-500/50 rounded-2xl transition-all active:scale-[0.98] cursor-pointer">
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
              <button onClick={handleResetType} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors">
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
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              />
            </div>

            {/* Campo Codice Stanza */}
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
                  className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 text-slate-950 font-extrabold rounded-xl px-5 transition-all shadow-lg"
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
              <button onClick={handleResetType} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors">
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
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-purple-500/10"
                >
                  Crea Nuova Stanza
                </button>
              </div>
            ) : (
              <div className="w-full space-y-5 animate-fadeIn">
                <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col items-center text-center">
                  <span className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase mb-1">CODICE STANZA</span>
                  <h2 className="text-4xl font-black text-amber-500 tracking-widest uppercase font-mono mb-4">{teacherRoomCode}</h2>
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
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all"
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
            
            // Ricarichiamo i dati dell'utente in tempo reale senza perdere la pagina
            fetch(`${API_BASE_URL}/current-user`, { credentials: 'include' })
              .then((res) => res.json())
              .then((data) => {
                if (data) {
                  setCurrentUser(data);
                  setUserType('teacher'); // Imposta direttamente il ruolo insegnante!
                }
              })
              .catch((err) => console.error("Errore aggiornamento utente post-login:", err));
          }}
        />
      </div>
    </div>
  );
}