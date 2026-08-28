import React from 'react';
import { X, Users, MessageSquare, Activity, AlertCircle } from 'lucide-react';

export default function TeacherDashboard({ isOpen, onClose, roomCode, classStatus, interactionFeed, totalWorks }) {
  if (!isOpen) return null;

  const studentsArray = Object.values(classStatus);
  const activeStudents = studentsArray.filter(s => s.status === 'active').length;

  return (
    <div className="absolute inset-y-0 right-0 w-full md:w-96 bg-slate-900/95 backdrop-blur-xl border-l border-slate-700 shadow-2xl z-[10001] flex flex-col animate-slideInRight">
      
      {/* HEADER */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="text-purple-400" size={20} /> Radar Classe
          </h2>
          <p className="text-xs text-slate-400 font-mono tracking-wider">STANZA: {roomCode}</p>
        </div>
        <button onClick={onClose} className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-6">
        
        {/* STATISTICHE RAPIDE */}
        <div className="flex gap-2">
          <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
            <Users className="text-cyan-400 mx-auto mb-1" size={20} />
            <div className="text-xl font-bold text-white">{activeStudents} <span className="text-xs text-slate-500 font-normal">/ {studentsArray.length}</span></div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Attivi</div>
          </div>
          <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
            <MessageSquare className="text-amber-400 mx-auto mb-1" size={20} />
            <div className="text-xl font-bold text-white">{interactionFeed.length}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Domande</div>
          </div>
        </div>

        {/* GRIGLIA STUDENTI */}
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Users size={14} /> Stato Studenti
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {studentsArray.length === 0 ? (
              <p className="text-xs text-slate-500 col-span-2">Nessuno studente rilevato.</p>
            ) : (
              studentsArray.map((student) => {
                const isLagging = student.status !== 'active';
                return (
                  <div key={student.socketId} className={`p-3 rounded-xl border ${isLagging ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-800 border-slate-700'} flex flex-col`}>
                    <span className="font-bold text-sm text-slate-200 truncate">{student.studentName}</span>
                    <span className={`text-[10px] font-medium mt-1 flex items-center gap-1 ${isLagging ? 'text-red-400' : 'text-green-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isLagging ? 'bg-red-400' : 'bg-green-400'}`}></span>
                      {isLagging ? 'Inattivo' : 'Online'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* FEED DOMANDE */}
        <div className="flex-1 flex flex-col">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <MessageSquare size={14} /> Feed Interazioni
          </h3>
          <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 p-3 space-y-3 overflow-y-auto min-h-[200px]">
            {interactionFeed.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600">
                <AlertCircle size={24} className="mb-2 opacity-50" />
                <p className="text-xs">Nessuna interazione recente</p>
              </div>
            ) : (
              interactionFeed.map((item) => (
                <div key={item.id} className="bg-slate-800/80 rounded-lg p-3 text-sm animate-fadeIn">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-purple-400 text-xs">{item.studentName}</span>
                    <span className="text-[10px] text-slate-500">{item.timestamp}</span>
                  </div>
                  <p className="text-slate-300 italic text-xs border-l-2 border-purple-500 pl-2 mt-1">"{item.query}"</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}