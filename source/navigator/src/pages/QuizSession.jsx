import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { Trophy, CheckCircle2, XCircle, ArrowRight, Users, Loader2 } from 'lucide-react';

export default function QuizSession() {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const roomCode = searchParams.get('roomCode');
  const role = searchParams.get('role'); // 'teacher' o 'student'
  const quizData = location.state?.quizData || [];
  const visitId = location.state?.visitId;

  // Stato Studente
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // Stato Insegnante
  const [studentResults, setStudentResults] = useState({});

  // Controllo di sicurezza
  useEffect(() => {
    if (!roomCode || quizData.length === 0) {
      navigate('/my-visits');
    }
  }, [roomCode, quizData, navigate]);

  // Ascolto risposte studenti (Solo Insegnante)
  useEffect(() => {
    if (role === 'teacher' && socket) {
      socket.on('student_answered', ({ studentId, studentName, answer }) => {
        setStudentResults(prev => {
          const current = prev[studentId] || { name: studentName, score: 0, answers: 0, history: [] };
          return {
            ...prev,
            [studentId]: {
              name: studentName,
              score: current.score + (answer.isCorrect ? 1 : 0),
              answers: current.answers + 1,
              history: [...current.history, answer]
            }
          };
        });
      });

      return () => socket.off('student_answered');
    }
  }, [role, socket]);

  const handleOptionSelect = (optIndex) => {
    if (isAnswered) return;
    setSelectedOption(optIndex);
  };

  const submitAnswer = () => {
    if (selectedOption === null || isAnswered) return;
    
    const currentQ = quizData[currentQuestionIndex];
    const isCorrect = selectedOption === currentQ.correctAnswerIndex;
    
    if (isCorrect) setScore(prev => prev + 1);
    setIsAnswered(true);

    // Invia il risultato al prof
    if (socket) {
      socket.emit('submit_answer', { 
        roomCode, 
        answer: { 
          qIndex: currentQuestionIndex, 
          selectedOption: selectedOption,
          isCorrect 
        } 
      });
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < quizData.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setQuizFinished(true);
    }
  };

  // --- RENDER INSEGNANTE (DASHBOARD) ---
  if (role === 'teacher') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-purple-900/20 to-slate-950"></div>
        <div className="relative z-10 w-full max-w-2xl mt-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-purple-400 mb-2">Risultati in Diretta</h1>
            <p className="text-slate-400">Stanza: <span className="font-mono text-white bg-slate-800 px-2 py-1 rounded">{roomCode}</span></p>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-slate-300 font-bold mb-4 flex items-center gap-2">
              <Trophy size={18} className="text-amber-500" /> Classifica e Progressi
            </h3>
            
            {Object.keys(studentResults).length === 0 ? (
              <div className="text-center py-8 text-slate-500 flex flex-col items-center">
                <Loader2 className="animate-spin mb-2" size={24} />
                In attesa delle risposte degli studenti...
              </div>
            ) : (
              <ul className="space-y-3">
                {Object.entries(studentResults)
                  .sort(([,a], [,b]) => b.score - a.score)
                  .map(([sId, data], index) => (
                    <li key={sId} className="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </span>
                        <span className="font-medium text-slate-200">{data.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-amber-400 font-bold">{data.score} <span className="text-xs text-slate-500 font-normal">pt</span></div>
                        <div className="text-[10px] text-slate-400">{data.answers} / {quizData.length} completate</div>
                      </div>
                    </li>
                ))}
              </ul>
            )}
          </div>

          <button 
            onClick={async () => {
              try {
                // 1. Qui prepariamo il payload da mandare al backend
                const reportPayload = {
                  roomCode,
                  date: new Date(),
                  results: studentResults
                };
                
                const response = await fetch(`${API_BASE_URL}/quiz-results`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include', // Fondamentale per far riconoscere l'utente al backend
                  body: JSON.stringify(reportPayload)
                });
                
                if (response.ok) {
                  alert("Risultati salvati con successo!");
                  navigate('/my-visits');
                } else {
                  alert("Si è verificato un errore nel salvataggio.");
                }
              } catch (error) {
                console.error(error);
                alert("Errore di connessione.");
              }
            }} 
            className="w-full mt-8 bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl transition-colors cursor-pointer"
          >
            Termina e Salva Risultati
          </button>
        </div>
      </div>
    );
  }

  // --- RENDER STUDENTE (QUIZ) ---
  if (quizFinished) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <Trophy size={64} className="text-amber-500 mb-4 animate-bounce" />
        <h1 className="text-3xl font-extrabold mb-2">Quiz Terminato!</h1>
        <p className="text-slate-400 mb-8">Hai completato il percorso didattico.</p>
        
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 mb-8 w-full max-w-sm shadow-2xl">
          <p className="text-sm text-slate-500 uppercase tracking-widest font-bold mb-1">Punteggio Finale</p>
          <p className="text-5xl font-black text-white">{score} <span className="text-2xl text-slate-600">/ {quizData.length}</span></p>
        </div>

        <button onClick={() => navigate('/')} className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl cursor-pointer">
          Torna alla Home
        </button>
      </div>
    );
  }

  const currentQ = quizData[currentQuestionIndex];

  return (
    // min-h-screen permette al contenitore di allungarsi e scrollare in modo naturale se il contenuto è tanto
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center p-4 relative">
      <div className="relative z-10 w-full max-w-lg mx-auto flex flex-col">
        
        {/* HEADER EXTRA COMPATTO */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">
            Dom. {currentQuestionIndex + 1}/{quizData.length}
          </span>
          <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded">
            Score: {score}
          </span>
        </div>

        {/* DOMANDA PIÙ PICCOLA */}
        <h2 className="text-lg font-bold mb-5 leading-tight">{currentQ.question}</h2>

        {/* OPZIONI COMPATTE (senza overflow forzato, assecondano il flusso della pagina) */}
        <div className="flex flex-col gap-2 mb-6">
          {currentQ.options.map((opt, idx) => {
            let btnClass = "bg-slate-900 border-slate-700 text-slate-200 hover:border-cyan-500";
            
            if (isAnswered) {
              if (idx === currentQ.correctAnswerIndex) {
                btnClass = "bg-green-500/20 border-green-500 text-green-400"; 
              } else if (idx === selectedOption) {
                btnClass = "bg-red-500/20 border-red-500 text-red-400"; 
              } else {
                btnClass = "bg-slate-900 border-slate-800 text-slate-600 opacity-50"; 
              }
            } else if (selectedOption === idx) {
              btnClass = "bg-cyan-500/20 border-cyan-500 text-cyan-400"; 
            }

            return (
              <button
                key={idx}
                onClick={() => handleOptionSelect(idx)}
                disabled={isAnswered}
                // p-3 e text-sm riducono l'ingombro di ogni bottone
                className={`w-full p-3 border-2 rounded-xl text-left text-sm transition-all ${btnClass} cursor-pointer`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {/* BOTTONE IN CODA (Scorre giù insieme alle opzioni) */}
        <div className="mt-2">
          {!isAnswered ? (
            <button
              onClick={submitAnswer}
              disabled={selectedOption === null}
              className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold py-3 rounded-xl transition-colors cursor-pointer text-sm"
            >
              Conferma Risposta
            </button>
          ) : (
            <div className="animate-fadeIn">
              <div className={`p-3 rounded-xl mb-3 flex items-center gap-2 text-sm ${selectedOption === currentQ.correctAnswerIndex ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {selectedOption === currentQ.correctAnswerIndex ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                <span className="font-bold">
                  {selectedOption === currentQ.correctAnswerIndex ? 'Esatta!' : 'Sbagliata!'}
                </span>
              </div>
              <button
                onClick={nextQuestion}
                className="w-full bg-slate-100 hover:bg-white text-slate-900 font-bold py-3 rounded-xl transition-colors flex justify-center items-center gap-2 cursor-pointer text-sm"
              >
                Prossima <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}