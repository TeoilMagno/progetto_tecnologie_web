import React from 'react';
import { X, CheckCircle2, XCircle } from 'lucide-react';

export default function QuizReviewModal({ isOpen, onClose, studentName, score, history, quizData }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 text-white flex flex-col p-4 overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-lg mx-auto flex flex-col relative pb-8">
        
        {/* Header Fissato in alto */}
        <div className="sticky top-0 bg-slate-950/90 backdrop-blur-md pt-4 pb-4 border-b border-slate-800 mb-6 flex justify-between items-center z-10">
          <div>
            <h2 className="text-lg font-bold text-cyan-400">{studentName}</h2>
            <p className="text-xs text-slate-400">Punteggio: {score} / {quizData.length}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-800 text-slate-300 rounded-full hover:bg-slate-700 cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Lista Domande e Correzioni */}
        <div className="space-y-6">
          {quizData.map((q, idx) => {
            const studentAnswer = history.find(h => h.qIndex === idx);
            const isCorrect = studentAnswer?.isCorrect;
            const answeredOpt = studentAnswer?.selectedOption;

            return (
              <div key={idx} className={`p-4 rounded-2xl border ${isCorrect ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="mt-1 shrink-0">
                    {isCorrect ? <CheckCircle2 size={20} className="text-green-500" /> : <XCircle size={20} className="text-red-500" />}
                  </div>
                  <h3 className="font-bold text-sm leading-snug">{idx + 1}. {q.question}</h3>
                </div>

                <div className="pl-8 space-y-2">
                  {/* Mostra l'errore barrato se ha sbagliato */}
                  {!isCorrect && answeredOpt !== undefined && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-300 opacity-70">
                      <span className="text-[10px] uppercase font-bold tracking-wider block mb-1">Scelta errata:</span>
                      <span className="line-through">{q.options[answeredOpt]}</span>
                    </div>
                  )}
                  
                  {/* Mostra sempre la soluzione corretta */}
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-sm text-green-400">
                     <span className="text-[10px] uppercase font-bold tracking-wider block mb-1">Risposta corretta:</span>
                     {q.options[q.correctAnswerIndex]}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}