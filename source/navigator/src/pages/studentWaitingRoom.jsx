import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Users, Compass, CheckCircle2 } from 'lucide-react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';

const socket = io(SOCKET_URL);

export default function StudentWaitingRoom() {
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get('roomCode');
  const studentName = searchParams.get('studentName') || 'Studente';
  const navigate = useNavigate();

  useEffect(() => {
    // Ci assicuriamo di essere nella stanza socket
    socket.emit('rejoin_room', { roomCode }); // opzionale se già uniti, oppure ascoltiamo l'avvio della visita

    // Ascoltiamo quando l'insegnante avvia ufficialmente la visita condivisa
    socket.on('session_started', ({ visitId }) => {
      navigate(`/map?visitId=${visitId}&roomCode=${roomCode}&role=student`);
    });

    // Oppure, se vuoi che parta non appena il docente cambia la prima opera:
    socket.on('artwork_changed', ({ artworkId, visitId }) => {
      navigate(`/map?visitId=${visitId || ''}&roomCode=${roomCode}&role=student`);
    });

    return () => {
      socket.off('session_started');
      socket.off('artwork_changed');
    };
  }, [roomCode, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6 text-center relative overflow-hidden">
      {/* Sfondo sfocato coordinato */}
      <div className="absolute inset-0 z-0">
        <img src="/img1.jpg" alt="Background" className="w-full h-full object-cover opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/80 to-slate-950"></div>
      </div>

      <div className="relative z-10 max-w-md w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center animate-fadeIn">
        
        {/* Icona animata di attesa */}
        <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-amber-500/5 relative">
          <Compass size={40} className="animate-spin-slow" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-slate-900 flex items-center justify-center">
            <CheckCircle2 size={12} className="text-slate-950 font-bold" />
          </div>
        </div>

        <span className="text-[11px] font-extrabold tracking-widest text-amber-500 uppercase px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full mb-3">
          Stanza: {roomCode}
        </span>

        <h2 className="text-2xl font-bold text-white mb-2">Benvenuto, {studentName}!</h2>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          Sei connesso correttamente alla sessione di gruppo. L'insegnante avvierà la visita a breve. Resta in attesa...
        </p>

        {/* Loader visivo */}
        <div className="flex items-center gap-3 px-5 py-3 bg-slate-800/60 border border-slate-700/50 rounded-2xl text-xs text-slate-300">
          <Loader2 className="animate-spin text-amber-500" size={18} />
          <span>In attesa del segnale dell'insegnante...</span>
        </div>

      </div>
    </div>
  );
}