import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Calendar, Users, Loader2, ArrowRight } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function QuizReportsList() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/my-quiz-results`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setReports(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="min-h-[100dvh] flex justify-center items-center bg-slate-950"><Loader2 className="animate-spin text-purple-500" size={32} /></div>;

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white p-6 flex flex-col items-center">
      <div className="w-full max-w-2xl mt-4">
        <h1 className="text-2xl font-bold text-purple-400 mb-2 flex items-center gap-2">
          <FileText size={24} /> Storico Report
        </h1>
        <p className="text-slate-400 text-sm mb-6">Consulta i risultati delle tue sessioni condivise.</p>

        {reports.length === 0 ? (
          <div className="text-center p-8 bg-slate-900 border border-slate-800 rounded-2xl">
            Nessun report disponibile al momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {reports.map((report) => (
              <div 
                key={report._id} 
                onClick={() => navigate(`/quiz-report/${report._id}`)}
                className="bg-slate-900 border border-slate-800 hover:border-purple-500/50 p-4 rounded-xl flex justify-between items-center cursor-pointer transition-colors"
              >
                <div>
                  <h3 className="font-bold text-slate-200 mb-1">{report.visitId?.title || 'Visita Eliminata'}</h3>
                  <div className="flex gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(report.date).toLocaleDateString('it-IT')}</span>
                    <span className="flex items-center gap-1"><Users size={12}/> Stanza: {report.roomCode}</span>
                  </div>
                </div>
                <ArrowRight size={20} className="text-slate-600" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}