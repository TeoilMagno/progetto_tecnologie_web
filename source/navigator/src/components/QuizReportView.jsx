import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Users, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config';
import QuizReviewModal from '../components/QuizReviewModal';

export default function QuizReportView() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/quiz-results/${reportId}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setReport(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [reportId]);

  if (loading) return <div className="min-h-[100dvh] flex justify-center items-center bg-slate-950"><Loader2 className="animate-spin text-purple-500" size={32} /></div>;
  if (!report) return <div className="min-h-[100dvh] bg-slate-950 text-white p-6 text-center pt-20">Report non trovato.</div>;

  // L'array originale delle domande lo prendiamo dalla visita popolata
  const quizData = report.visitId?.quiz || [];

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white p-4 flex flex-col items-center overflow-y-auto">
      <div className="w-full max-w-2xl mt-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 text-sm cursor-pointer">
          <ArrowLeft size={16} /> Indietro
        </button>
        
        <h1 className="text-2xl font-bold text-purple-400 mb-2">Risultati Sessione</h1>
        <p className="text-slate-400 text-sm mb-6 flex items-center gap-2">
          <Users size={16}/> Stanza: <span className="font-mono text-white">{report.roomCode}</span> • {new Date(report.date).toLocaleDateString('it-IT')}
        </p>

        <div className="grid grid-cols-1 gap-3">
          {report.results.map((student, idx) => (
            <div 
              key={idx} 
              onClick={() => setSelectedStudent(student)}
              className="bg-slate-900 border border-slate-800 hover:border-purple-500/50 p-4 rounded-xl flex justify-between items-center cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm shrink-0">
                  {idx + 1}
                </div>
                <span className="font-bold text-slate-200">{student.studentName}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-amber-500 font-bold">{student.score} <span className="text-slate-500 text-xs">/ {quizData.length}</span></span>
                <Trophy size={16} className={student.score === quizData.length ? "text-amber-400" : "text-slate-600"} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <QuizReviewModal 
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        studentName={selectedStudent?.studentName}
        score={selectedStudent?.score}
        history={selectedStudent?.answers || []}
        quizData={quizData}
      />
    </div>
  );
}