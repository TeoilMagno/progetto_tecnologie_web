import React, { useState, useEffect } from 'react';
import { QrCode, GraduationCap, Presentation, Users, Loader2, AlertCircle, RefreshCw, Sparkles, ArrowLeft, Send } from 'lucide-react';

export default function JoinSession() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState('none'); // 'student' | 'teacher' | 'none'
  const [roomCode, setRoomCode] = useState('');
  const [isScanning, setIsScanning] = useState(true);
  const [teacherRoomCode, setTeacherRoomCode] = useState('');
  const [connectedStudents, setConnectedStudents] = useState([]);
  const [isRoomCreated, setIsRoomCreated] = useState(false);

  useEffect(() => {
    fetch('http://localhost:8000/api/current-user')
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setCurrentUser(data);
          setUserType(data.type || 'none');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching user:', err);
        setLoading(false);
      });
  }, []);

  const handleSelectType = (type) => {
    setUserType(type);
    if (currentUser) {
      // Se l'utente è loggato, salviamo la scelta anche nel database
      fetch('http://localhost:8000/api/current-user/type', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log('User type updated in DB:', data);
        })
        .catch((err) => console.error('Error saving user type:', err));
    }
  };

  const handleCreateRoom = () => {
    // Genera un codice alfanumerico casuale di 6 caratteri
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTeacherRoomCode(code);
    setIsRoomCreated(true);
    setConnectedStudents([]);

    // Simula studenti che si connettono dopo qualche secondo per dare un senso "vivo"
    setTimeout(() => {
      setConnectedStudents(prev => [...prev, { id: 1, name: 'Alessandro T.' }]);
    }, 2000);
    setTimeout(() => {
      setConnectedStudents(prev => [...prev, { id: 2, name: 'Elena V.' }]);
    }, 4500);
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
      {/* BACKGROUND IMAGE FISSA SFUMATA */}
      <div className="absolute inset-0 z-0 h-96">
         <img 
            src="/img1.jpg" 
            alt="Background" 
            className="w-full h-full object-cover opacity-15"
         />
         <div 
           className="absolute inset-0"
           style={{ 
             backgroundImage: 'linear-gradient(to bottom, transparent 0%, rgba(14, 22, 42, 1) 90%, rgba(14, 22, 42, 1) 100%)'
           }}
         ></div>
      </div>

      <div className="relative z-10 flex flex-col items-center pt-8 px-4 md:px-6 w-full max-w-lg mx-auto">
        
        {/* INTESTAZIONE PAGINA */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
            <Users size={14} /> Sessione Di Gruppo
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-white">
            Join a Session
          </h1>
          <p className="text-slate-400 text-xs md:text-sm">
            Partecipa a una spiegazione sincronizzata o gestisci una classe
          </p>
        </div>

        {/* 1. SELEZIONE RUOLO (STUDENT / TEACHER) */}
        {userType === 'none' && (
          <div className="w-full space-y-4 mt-4 animate-fadeIn">
            <p className="text-slate-400 text-sm text-center mb-6">
              Scegli il tuo ruolo per questa sessione. Questa impostazione verrà salvata nel tuo profilo utente.
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
                <h3 className="text-white font-bold text-lg mb-0.5 group-hover:text-amber-400 transition-colors">
                  Studente / Visitatore
                </h3>
                <p className="text-slate-400 text-xs leading-normal">
                  Inquadra il QR Code o digita il codice fornito dall'insegnante per unirti alla visita guidata di gruppo.
                </p>
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
                <h3 className="text-white font-bold text-lg mb-0.5 group-hover:text-purple-400 transition-colors">
                  Insegnante / Guida
                </h3>
                <p className="text-slate-400 text-xs leading-normal">
                  Crea una stanza virtuale, genera un codice e guida i tuoi studenti sincronizzando i loro dispositivi sulla mappa.
                </p>
              </div>
            </div>
            
            {!currentUser && (
              <p className="text-center text-slate-500 text-[10px] mt-6 bg-slate-900/40 py-2 rounded-lg border border-slate-800/60">
                ⚠️ Nota: Stai navigando come Ospite. Le modifiche al ruolo saranno solo temporanee per questa sessione.
              </p>
            )}
          </div>
        )}

        {/* 2. INTERFACCIA STUDENTE (SCANNER QR / CODICE STANZA) */}
        {userType === 'student' && (
          <div className="w-full space-y-6 animate-fadeIn">
            {/* BADGE DI STATO & BACK BUTTON */}
            <div className="flex items-center justify-between w-full">
              <button 
                onClick={handleResetType}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors"
              >
                <ArrowLeft size={14} /> Cambia Ruolo
              </button>
              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-500 px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                <GraduationCap size={12} /> STUDENTE
              </span>
            </div>

            {/* FINTO EMULATORE SCANNER QR */}
            <div className="w-full bg-[#0f172a]/80 border border-slate-800 rounded-3xl p-5 flex flex-col items-center">
              <div className="text-left w-full mb-3 flex items-center justify-between">
                <h3 className="text-slate-300 font-bold text-sm">Scansione QR Code</h3>
                <span className="flex items-center gap-1 text-[10px] text-green-400 bg-green-400/10 px-2 py-0.5 rounded-md">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></span> CAMERA PRONTA
                </span>
              </div>

              {/* AREA FOCALE SCANNER */}
              <div className="relative w-full aspect-square max-w-[240px] border border-slate-800 bg-slate-950 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
                {/* Mirino Angoli */}
                <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-amber-500"></div>
                <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-amber-500"></div>
                <div className="absolute bottom-4 left-4 w-5 h-5 border-b-2 border-l-2 border-amber-500"></div>
                <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-amber-500"></div>

                {/* Linea Laser Animata */}
                {isScanning && (
                  <div className="absolute left-0 right-0 h-[2px] bg-amber-500 shadow-[0_0_10px_#f59e0b] top-0 animate-scanner"></div>
                )}

                {/* Sfondino grafico astratto */}
                <div className="flex flex-col items-center text-center p-6 text-slate-700 select-none">
                  <QrCode size={64} className="opacity-10 mb-2 animate-pulse" />
                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-20">Inquadra il codice</span>
                </div>
              </div>

              <p className="text-slate-500 text-[10px] text-center mt-3 max-w-xs">
                Inquadra il QR Code generato dall'insegnante sulla sua cattedra o sullo schermo per connetterti automaticamente.
              </p>
            </div>

            {/* SEPARATORE "OPPURE" */}
            <div className="flex items-center justify-center w-full gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest my-2">
              <span className="h-[1px] bg-slate-800 flex-1"></span>
              <span>Oppure</span>
              <span className="h-[1px] bg-slate-800 flex-1"></span>
            </div>

            {/* CAMPO INSERIMENTO CODICE A MANO */}
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
                  className="flex-1 bg-slate-800 border border-slate-700 hover:border-slate-600 text-white rounded-xl px-4 py-3 text-center text-base font-extrabold tracking-widest uppercase focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-600"
                />
                <button 
                  disabled={roomCode.length !== 6}
                  className="bg-amber-500 hover:bg-amber-600 active:scale-[0.98] disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-extrabold rounded-xl px-5 transition-all flex items-center justify-center shadow-lg shadow-amber-500/5"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. INTERFACCIA INSEGNANTE (CREAZIONE STANZA & STUDENTI CONNESSI) */}
        {userType === 'teacher' && (
          <div className="w-full space-y-6 animate-fadeIn">
            {/* BADGE DI STATO & BACK BUTTON */}
            <div className="flex items-center justify-between w-full">
              <button 
                onClick={handleResetType}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors"
              >
                <ArrowLeft size={14} /> Cambia Ruolo
              </button>
              <span className="flex items-center gap-1 text-[11px] font-bold text-purple-400 px-2.5 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-full">
                <Presentation size={12} /> INSEGNANTE
              </span>
            </div>

            {/* CARD CREAZIONE STANZA */}
            {!isRoomCreated ? (
              <div className="w-full bg-[#1e293b]/40 backdrop-blur-md border border-slate-800 rounded-3xl p-6 text-center flex flex-col items-center">
                <div className="w-14 h-14 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center mb-4">
                  <Sparkles size={24} className="animate-pulse" />
                </div>
                <h3 className="text-white font-bold text-lg mb-1">Crea Stanza Spiegazione</h3>
                <p className="text-slate-400 text-xs leading-relaxed max-w-xs mb-6">
                  Avvia una spiegazione condivisa. Gli studenti potranno connettersi scansionando il tuo codice o digitando la stanza.
                </p>
                <button
                  onClick={handleCreateRoom}
                  className="w-full bg-purple-600 hover:bg-purple-500 active:scale-[0.98] text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-purple-500/10"
                >
                  Crea Nuova Stanza
                </button>
              </div>
            ) : (
              <div className="w-full space-y-5 animate-fadeIn">
                {/* DETTAGLI STANZA GENERATA */}
                <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col items-center text-center">
                  <span className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase mb-1">STANZA CREATA CON SUCCESSO</span>
                  
                  {/* CODICE STANZA */}
                  <h2 className="text-4xl font-black text-amber-500 tracking-widest uppercase font-mono mb-4">{teacherRoomCode}</h2>
                  
                  {/* GENERATORE CODICE QR (SIMULATO) */}
                  <div className="relative w-44 h-44 bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-center shadow-lg shadow-white/5 mb-4 group overflow-hidden">
                    {/* Un disegno astratto che somiglia a un QR Code reale in stile pixel-grid */}
                    <div className="grid grid-cols-5 gap-1.5 w-full h-full p-2 opacity-90">
                      <div className="bg-slate-950 rounded-[3px]"></div>
                      <div className="bg-slate-950 rounded-[3px]"></div>
                      <div className="border border-slate-400 rounded-[3px]"></div>
                      <div className="bg-slate-950 rounded-[3px]"></div>
                      <div className="bg-slate-950 rounded-[3px]"></div>
                      
                      <div className="bg-slate-950 rounded-[3px]"></div>
                      <div className="border border-slate-400 rounded-[3px]"></div>
                      <div className="bg-slate-950 rounded-[3px]"></div>
                      <div className="border border-slate-400 rounded-[3px]"></div>
                      <div className="bg-slate-950 rounded-[3px]"></div>
                      
                      <div className="border border-slate-400 rounded-[3px]"></div>
                      <div className="bg-slate-950 rounded-[3px]"></div>
                      <div className="bg-slate-950 rounded-[3px]"></div>
                      <div className="border border-slate-400 rounded-[3px]"></div>
                      <div className="border border-slate-400 rounded-[3px]"></div>
                      
                      <div className="bg-slate-950 rounded-[3px]"></div>
                      <div className="border border-slate-400 rounded-[3px]"></div>
                      <div className="border border-slate-400 rounded-[3px]"></div>
                      <div className="bg-slate-950 rounded-[3px]"></div>
                      <div className="bg-slate-950 rounded-[3px]"></div>
                      
                      <div className="bg-slate-950 rounded-[3px]"></div>
                      <div className="bg-slate-950 rounded-[3px]"></div>
                      <div className="border border-slate-400 rounded-[3px]"></div>
                      <div className="bg-slate-950 rounded-[3px]"></div>
                      <div className="bg-slate-950 rounded-[3px]"></div>
                    </div>
                    {/* Badge centrale ArtAround */}
                    <div className="absolute inset-0 m-auto w-10 h-10 bg-slate-950 border-2 border-white rounded-lg flex items-center justify-center text-xs font-black text-amber-500">
                      AA
                    </div>
                  </div>

                  <p className="text-slate-400 text-xs max-w-xs leading-relaxed">
                    Mostra questo codice o proietta il QR code per permettere ai tuoi studenti di accedere.
                  </p>
                </div>

                {/* UTENTI / STUDENTI CONNESSI IN DIRETTA */}
                <div className="w-full bg-[#1e293b]/40 backdrop-blur-md border border-slate-800 rounded-3xl p-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                    <h3 className="text-slate-300 font-bold text-sm flex items-center gap-2">
                      <Users size={16} className="text-purple-400" /> 
                      Studenti Connessi ({connectedStudents.length})
                    </h3>
                    <span className="flex items-center gap-1 text-[10px] text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-md">
                      <RefreshCw size={10} className="animate-spin" /> LIVE
                    </span>
                  </div>

                  {connectedStudents.length === 0 ? (
                    <div className="py-6 text-center flex flex-col items-center">
                      <Loader2 className="animate-spin text-slate-600 mb-2" size={20} />
                      <span className="text-slate-500 text-[11px]">In attesa del collegamento degli studenti...</span>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {connectedStudents.map(student => (
                        <li 
                          key={student.id}
                          className="flex items-center justify-between px-3 py-2 bg-slate-900/60 border border-slate-800/80 rounded-xl animate-fadeIn"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-xs font-semibold text-slate-200">{student.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Collegato</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* BOTTONE AVVIA SPIEGAZIONE */}
                <button
                  disabled={connectedStudents.length === 0}
                  className="w-full bg-purple-600 hover:bg-purple-500 active:scale-[0.98] disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-purple-500/10 flex items-center justify-center gap-2"
                >
                  Avvia Spiegazione Condivisa
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
