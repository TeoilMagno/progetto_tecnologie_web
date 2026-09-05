import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { Trophy, CheckCircle2, XCircle, ArrowRight, Users, Loader2 } from 'lucide-react';
import QuizReviewModal from '../components/QuizReviewModal';

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
  const [studentAnswers, setStudentAnswers] = useState({}); // Mappa { indice_domanda: indice_opzione_scelta }
  const [quizFinished, setQuizFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [studentHistory, setStudentHistory] = useState([]);
  const [showReview, setShowReview] = useState(false);

  // Stato Insegnante
  const [studentResults, setStudentResults] = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Controllo di sicurezza
  useEffect(() => {
    if (!roomCode || quizData.length === 0) {
      navigate('/my-visits');
    }
  }, [roomCode, quizData, navigate]);

  // Ascolto consegne quiz (Solo Insegnante)
  // Ascolto consegne quiz (Solo Insegnante)
  useEffect(() => {
    if (role === 'teacher' && socket) {
      socket.on('student_quiz_submitted', (payload) => {
        setStudentResults(prev => ({
          ...prev,
          [payload.studentId]: {
            name: payload.studentName,
            score: payload.score,
            answers: payload.history.length, 
            history: payload.history
          }
        }));
      });

      return () => socket.off('student_quiz_submitted');
    }
  }, [role, socket]);

  // Ascolto chiusura stanza definitiva (Studente)
  useEffect(() => {
    if (role === 'student' && socket) {
      socket.on('room_closed', () => {
        alert("La sessione è stata terminata definitivamente dall'insegnante.");
        navigate('/'); // Rimanda lo studente alla home (o a '/my-visits' se preferisci)
      });

      return () => socket.off('room_closed');
    }
  }, [role, socket, navigate]);

  const handleOptionSelect = (optIndex) => {
    setStudentAnswers(prev => ({ ...prev, [currentQuestionIndex]: optIndex }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < quizData.length - 1) setCurrentQuestionIndex(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) setCurrentQuestionIndex(prev => prev - 1);
  };

  const submitEntireQuiz = () => {
    if (quizFinished) return; // Previene il doppio click compulsivo

    if (Object.keys(studentAnswers).length < quizData.length) {
      if(!window.confirm("Non hai risposto a tutte le domande. Sicuro di voler consegnare?")) return;
    }

    let finalScore = 0;
    const history = quizData.map((q, idx) => {
      const selectedOpt = studentAnswers[idx];
      const isCorrect = selectedOpt === q.correctAnswerIndex;
      if (isCorrect) finalScore++;
      return { qIndex: idx, selectedOption: selectedOpt, isCorrect };
    });

    setScore(finalScore);
    setStudentHistory(history);
    setQuizFinished(true);

    socket.emit('submit_quiz', { roomCode, history, score: finalScore });
  };

  // --- RENDER INSEGNANTE (DASHBOARD) ---
  if (role === 'teacher') {
    return (
      <div className="fixed inset-0 z-[100] text-white flex flex-col items-center p-6 overflow-y-auto">
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-purple-900/20 to-slate-950 pointer-events-none"></div>
        <div className="relative z-10 w-full max-w-2xl mt-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-purple-400 mb-2">Risultati in Diretta</h1>
            <p className="text-slate-400">Stanza: <span className="font-mono text-white bg-slate-800 px-2 py-1 rounded">{roomCode}</span></p>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-slate-300 font-bold mb-4 flex items-center gap-2">
              <Trophy size={18} className="text-amber-500" /> Classifica e Consegne
            </h3>
            
            {Object.keys(studentResults).length === 0 ? (
              <div className="text-center py-8 text-slate-500 flex flex-col items-center">
                <Loader2 className="animate-spin mb-2" size={24} />
                In attesa che gli studenti consegnino il quiz...
              </div>
            ) : (
              <ul className="space-y-3">
                {Object.entries(studentResults)
                  .sort(([,a], [,b]) => b.score - a.score)
                  .map(([sId, data], index) => (
                    <li 
                      key={sId} 
                      onClick={() => setSelectedStudent(data)}
                      className="flex justify-between items-center bg-slate-800/50 hover:border-purple-500 p-4 rounded-xl border border-slate-700/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold shrink-0">
                          {index + 1}
                        </span>
                        <span className="font-bold text-slate-200">{data.name}</span>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <span className="text-amber-500 font-bold">{data.score} <span className="text-slate-500 text-xs">/ {quizData.length}</span></span>
                      </div>
                    </li>
                ))}
              </ul>
            )}
          </div>

          <button 
            onClick={async () => {
              socket.emit('close_room', { roomCode });

              try {
                const reportPayload = {
                  roomCode,
                  visitId, 
                  results: studentResults
                };
                
                const response = await fetch(`${API_BASE_URL}/quiz-results`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
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

        {/* MODALE REVISIONE INSEGNANTE */}
        <QuizReviewModal 
          isOpen={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
          studentName={selectedStudent?.name}
          score={selectedStudent?.score}
          history={selectedStudent?.history || []}
          quizData={quizData}
        />
      </div>
    );
  }

  // --- RENDER STUDENTE (QUIZ) ---
  if (quizFinished) {
    return (
      <div className="fixed inset-0 z-[100] text-white flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
        <Trophy size={64} className="text-amber-500 mb-4 animate-bounce" />
        <h1 className="text-3xl font-extrabold mb-2">Quiz Terminato!</h1>
        <p className="text-slate-400 mb-8">Hai completato il percorso didattico.</p>
        
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 mb-8 w-full max-w-sm shadow-2xl">
          <p className="text-sm text-slate-500 uppercase tracking-widest font-bold mb-1">Punteggio Finale</p>
          <p className="text-5xl font-black text-white">{score} <span className="text-2xl text-slate-600">/ {quizData.length}</span></p>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-3">
          <button onClick={() => setShowReview(true)} className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl cursor-pointer">
            Rivedi le risposte
          </button>
          <button onClick={() => navigate('/')} className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl cursor-pointer">
            Torna alla Home
          </button>
        </div>

        <QuizReviewModal 
           isOpen={showReview} 
           onClose={() => setShowReview(false)} 
           studentName="Il tuo risultato" 
           score={score} 
           history={studentHistory} 
           quizData={quizData} 
        />
      </div>
    );
  }

  const currentQ = quizData[currentQuestionIndex];
  const currentSelectedOption = studentAnswers[currentQuestionIndex];

  return (
    <div className="min-h-[100dvh] w-full text-white flex flex-col justify-center p-4 relative">
      <div className="relative z-10 w-full max-w-lg mx-auto flex flex-col">
        
        {/* HEADER SENZA PUNTEGGIO */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">
            Domanda {currentQuestionIndex + 1} di {quizData.length}
          </span>
        </div>

        <h2 className="text-lg font-bold mb-5 leading-tight">{currentQ.question}</h2>

        {/* OPZIONI NEUTRE (solo evidenziazione di selezione) */}
        <div className="flex flex-col gap-2 mb-8">
          {currentQ.options.map((opt, idx) => {
            const isSelected = currentSelectedOption === idx;
            const btnClass = isSelected 
              ? "bg-cyan-500/20 border-cyan-500 text-cyan-400" 
              : "bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500";
            
            return (
              <button
                key={idx}
                onClick={() => handleOptionSelect(idx)}
                className={`w-full p-3 border-2 rounded-xl text-left text-sm transition-all ${btnClass} cursor-pointer`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {/* NAVIGAZIONE E CONSEGNA */}
        <div className="flex justify-between items-center gap-3 mt-2">
          <button
            onClick={handlePrev}
            disabled={currentQuestionIndex === 0}
            className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-white font-bold py-3 rounded-xl transition-colors text-sm"
          >
            Indietro
          </button>
          
          {currentQuestionIndex < quizData.length - 1 ? (
            <button
              onClick={handleNext}
              className="flex-1 bg-slate-100 hover:bg-white text-slate-900 font-bold py-3 rounded-xl transition-colors text-sm"
            >
              Prossima
            </button>
          ) : (
            <button
              onClick={submitEntireQuiz}
              className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3 rounded-xl transition-colors text-sm"
            >
              Consegna Quiz
            </button>
          )}
        </div>

      </div>
    </div>
  );
}