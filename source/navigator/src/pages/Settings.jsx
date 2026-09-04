import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Headphones, Building2, Shield, Trash2, ChevronRight, User, GraduationCap, Lock, KeyRound, AlertTriangle, ChevronDown, CheckCircle2, Clock, Star } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function SettingsPage() {
  const navigate = useNavigate();
  
  // Stati Base Navigator
  const [playbackSpeed, setPlaybackSpeed] = useState(() => localStorage.getItem('audioSpeed') || '1.0');

  // Stati Profilo Utente
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdError, setPwdError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showCuratorModal, setShowCuratorModal] = useState(false);

  // Salvataggio audio nel local storage
  useEffect(() => {
    localStorage.setItem('audioSpeed', playbackSpeed);
  }, [playbackSpeed]);

  // Recupero Dati Utente dal DB all'avvio
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/current-user`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUserData(data);
        }
      } catch (e) {
        console.error("Errore fetch utente:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const handleUpdateProfile = async (field, value) => {
    if (!value) return;
    try {
      const res = await fetch(`${API_BASE_URL}/current-user/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
        credentials: 'include'
      });
      if (res.ok) {
        setUserData(prev => ({ ...prev, [field]: value }));
        // Se si aggiorna l'username, diamo feedback visivo
        if(field === 'username') alert("Username aggiornato con successo!");
      } else {
        alert((await res.json()).error || "Errore di salvataggio");
      }
    } catch (e) {
      alert("Errore di rete");
    }
  };

  const handlePasswordSubmit = async () => {
    setPwdError('');
    const requiresOld = userData?.hasPassword !== false;
    
    if (requiresOld && !passwordForm.oldPassword) return setPwdError("Inserisci la tua password attuale.");
    if (!passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword) return setPwdError("Le nuove password non coincidono.");

    try {
      const res = await fetch(`${API_BASE_URL}/current-user/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          oldPassword: passwordForm.oldPassword, 
          newPassword: passwordForm.newPassword 
        }),
        credentials: 'include'
      });
      
      if (res.ok) {
        alert("Password aggiornata con successo!");
        setUserData(prev => ({ ...prev, hasPassword: true }));
        setShowPasswordModal(false);
        setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPwdError((await res.json()).error || "Errore durante il salvataggio.");
      }
    } catch (e) {
      setPwdError("Errore di rete.");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/current-user/profile`, { 
        method: "DELETE",
        credentials: 'include'
      });
      if (res.ok) {
        alert("Account eliminato con successo. Arrivederci!");
        window.location.href = "/";
      } else {
        alert((await res.json()).error || "Errore durante l'eliminazione");
      }
    } catch (e) {
      alert("Errore di rete");
    }
  };

  const clearCache = () => {
    if (window.confirm("Sei sicuro di voler svuotare i dati salvati offline? Dovrai rifare l'accesso.")) {
      localStorage.clear();
      alert("Cache svuotata con successo.");
      window.location.href = "/navigator";
    }
  };

  const handleCuratorRequest = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/current-user/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestCurator: true }),
        credentials: 'include'
      });
      if (res.ok) {
        alert("Richiesta inviata con successo!");
        setUserData(prev => ({ ...prev, curator_status: 'pending' }));
        setShowCuratorModal(false); // Chiude il modale
      } else {
        alert("Errore durante l'invio della richiesta.");
      }
    } catch (e) {
      alert("Errore di connessione.");
    }
  };

  if (loading) return <div className="min-h-[100dvh] bg-[#09090b] text-white p-6 flex items-center justify-center">Caricamento in corso...</div>;

  return (
    <div className="min-h-[100dvh] bg-[#09090b] text-white p-6 flex flex-col items-center animate-fadeIn relative">
      <div className="w-full max-w-lg mt-4 flex flex-col h-full pb-20">
        
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 bg-slate-900 border border-white/5 text-slate-400 hover:text-white rounded-full transition-colors cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-white">Impostazioni</h1>
        </div>

        <div className="space-y-8">

          {/* 0. SEZIONE: NAVIGAZIONE (Specifica Navigator) */}
          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building2 size={14} /> Navigazione Locale
            </h3>
            <div className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden">
              <button 
                onClick={() => {
                  localStorage.removeItem('selected_museum_id'); 
                  localStorage.removeItem('selected_museum_name'); 
                  window.location.href = "/navigator/";
                }}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <div className="text-left flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                     <Building2 size={16} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200 text-sm">Cambia Museo</p>
                    <p className="text-xs text-slate-500 mt-0.5">Torna alla selezione principale</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-600" />
              </button>
            </div>
          </section>

          {/* 1. SEZIONE: DATI PERSONALI */}
          {userData && (
            <section>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <User size={14} /> Dati Personali
              </h3>
              <div className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                
                {userData.name && (
                   <div className="p-4">
                     <p className="text-xs text-slate-500 mb-1">Nome (da Social)</p>
                     <input type="text" readOnly value={userData.name} className="w-full bg-slate-800/50 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-400 cursor-not-allowed" />
                   </div>
                )}

                <div className="p-4">
                  <p className="text-xs text-slate-500 mb-2">Username pubblico</p>
                  <div className="flex gap-2">
                     <input 
                        type="text" 
                        defaultValue={userData.username} 
                        id="nav-username-input"
                        placeholder="Crea Username"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" 
                     />
                     <button 
                        onClick={() => handleUpdateProfile('username', document.getElementById('nav-username-input').value)} 
                        className="px-4 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white text-sm font-semibold transition-colors shrink-0 cursor-pointer"
                     >
                       Salva
                     </button>
                  </div>
                </div>

              </div>
            </section>
          )}

          {/* 2. SEZIONE: SICUREZZA E ACCESSO */}
          {userData && (
            <section>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <KeyRound size={14} /> Sicurezza e Accesso
              </h3>
              <div className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden">
                
                {userData.hasPassword !== false ? (
                  <button onClick={() => setShowPasswordModal(true)} className="w-full flex items-center justify-between p-4 hover:bg-slate-800 transition-colors cursor-pointer text-left">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 text-slate-400">
                         <KeyRound size={16} />
                       </div>
                       <p className="font-semibold text-slate-200 text-sm">Cambia Password</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-600" />
                  </button>
                ) : (
                  <button onClick={() => setShowPasswordModal(true)} className="w-full flex items-center justify-between p-4 hover:bg-cyan-500/10 transition-colors cursor-pointer text-left">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 text-cyan-400">
                         <Plus size={16} />
                       </div>
                       <p className="font-semibold text-cyan-400 text-sm">Aggiungi Password</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-600" />
                  </button>
                )}

              </div>
            </section>
          )}

          {/* 3. SEZIONE: PREFERENZE ESPERIENZA */}
          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Headphones size={14} /> Preferenze Esperienza
            </h3>
            <div className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
              
              {userData && (
                <>
                  <div className="p-4">
                     <p className="text-xs text-slate-500 mb-2">Registro Linguistico (IA)</p>
                     <div className="relative w-full">
                       <select 
                         value={userData.expertiseLevel || "medium"}
                         onChange={(e) => handleUpdateProfile('expertiseLevel', e.target.value)}
                         className="appearance-none w-full bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl pl-4 pr-10 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer"
                       >
                          <option value="simple">Semplice - Per principianti e bambini</option>
                          <option value="medium">Medio - Appassionato ma non esperto</option>
                          <option value="professional">Professionale - Focus su storia e tecnica</option>
                          <option value="expert">Esperto - Analisi critica e accademica</option>
                       </select>
                       <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <ChevronDown size={18} />
                       </div>
                     </div>
                  </div>

                  <div className="p-4">
                     <p className="text-xs text-slate-500 mb-2">Qualifica / Ruolo</p>
                     <div className="relative w-full">
                       <select 
                         value={userData.type || "none"}
                         onChange={(e) => handleUpdateProfile('type', e.target.value)}
                         className="appearance-none w-full bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl pl-4 pr-10 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer"
                       >
                          <option value="none">Visitatore Standard</option>
                          <option value="student">Studente</option>
                          <option value="teacher">Insegnante</option>
                       </select>
                       <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <ChevronDown size={18} />
                       </div>
                     </div>
                  </div>
                </>
              )}

              <div className="p-4">
                <p className="text-xs text-slate-500 mb-2">Velocità di Riproduzione Audio</p>
                <div className="relative w-full">
                  <select 
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(e.target.value)}
                    className="appearance-none w-full bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl pl-4 pr-10 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer"
                  >
                    <option value="0.75">Lenta (0.75x)</option>
                    <option value="1.0">Normale (1x)</option>
                    <option value="1.25">Veloce (1.25x)</option>
                    <option value="1.5">Molto Veloce (1.5x)</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown size={18} />
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* 4. SEZIONE: DATI E PRIVACY */}
          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Shield size={14} /> Dati e Privacy
            </h3>
            <div className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
              
              <button 
                onClick={() => alert("Qui andrà il link alla tua Privacy Policy.")}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <p className="font-semibold text-slate-300 text-sm">Termini e Privacy</p>
                <ChevronRight size={18} className="text-slate-600" />
              </button>

              <button 
                onClick={clearCache}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <p className="font-semibold text-slate-300 text-sm">Svuota Cache Locale</p>
                <Trash2 size={16} className="text-slate-500" />
              </button>

              {userData && (
                 <button 
                   onClick={() => {
                     setDeleteConfirmText('');
                     setShowDeleteModal(true);
                   }}
                   className="w-full flex items-center justify-between p-4 hover:bg-red-500/10 transition-colors cursor-pointer"
                 >
                   <p className="font-semibold text-red-400 text-sm">Elimina Account</p>
                   <AlertTriangle size={16} className="text-red-500/70" />
                 </button>
              )}
            </div>
          </section>

          {/* 5. SEZIONE: AREA CURATORE */}
          {userData && (
            <section>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Star size={14} /> Area Curatore
              </h3>
              <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-1">
                {(userData.role === 'admin' || userData.role === 'curator' || userData.curator_status === 'approved') ? (
                  <div className="flex items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl m-1">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-emerald-400 text-sm">Curatore Abilitato</p>
                      <p className="text-xs text-slate-400 mt-0.5">Hai l'accesso per aggiungere e gestire musei.</p>
                    </div>
                  </div>
                ) : userData.curator_status === 'pending' ? (
                  <div className="flex items-center gap-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl m-1">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-amber-400 text-sm">In attesa di approvazione</p>
                      <p className="text-xs text-slate-400 mt-0.5">Gli amministratori stanno valutando la tua richiesta.</p>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowCuratorModal(true)}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                         <Star size={20} />
                       </div>
                       <div>
                         <p className="font-semibold text-cyan-400 text-sm">Diventa Curatore</p>
                         <p className="text-xs text-slate-400 mt-0.5">Richiedi l'abilitazione per gestire un museo</p>
                       </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-600" />
                  </button>
                )}
              </div>
            </section>
          )}

        </div>

        <div className="mt-auto pt-8 pb-4 text-center">
          <p className="text-xs text-slate-600 font-mono">ArtAround Navigator v1.0.0</p>
        </div>
      </div>

      {/* --- MODALE PASSWORD --- */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/80 z-[10000] flex items-center justify-center p-4">
           <div className="w-full max-w-sm bg-[#121218] border border-white/10 rounded-3xl p-6 shadow-2xl relative">
              <h3 className="text-xl font-bold text-white mb-4">
                 {userData?.hasPassword !== false ? 'Modifica Password' : 'Crea Password'}
              </h3>
              
              <div className="space-y-4">
                 {userData?.hasPassword !== false && (
                    <div>
                       <label className="text-xs text-slate-400 mb-1 block">Password Attuale</label>
                       <input 
                         type="password" 
                         value={passwordForm.oldPassword}
                         onChange={e => setPasswordForm(p => ({ ...p, oldPassword: e.target.value }))}
                         className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" 
                       />
                    </div>
                 )}
                 <div>
                    <label className="text-xs text-slate-400 mb-1 block">Nuova Password</label>
                    <input 
                      type="password" 
                      value={passwordForm.newPassword}
                      onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" 
                    />
                 </div>
                 <div>
                    <label className="text-xs text-slate-400 mb-1 block">Conferma Nuova Password</label>
                    <input 
                      type="password" 
                      value={passwordForm.confirmPassword}
                      onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" 
                    />
                 </div>
              </div>

              {pwdError && <p className="text-red-400 text-xs mt-3">{pwdError}</p>}

              <div className="flex gap-3 mt-6">
                 <button onClick={() => setShowPasswordModal(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-semibold transition-colors cursor-pointer">Annulla</button>
                 <button onClick={handlePasswordSubmit} className="flex-1 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-colors cursor-pointer">Salva</button>
              </div>
           </div>
        </div>
      )}

      {/* --- MODALE ELIMINA ACCOUNT --- */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 z-[10000] flex items-center justify-center p-4">
           <div className="w-full max-w-sm bg-[#121218] border border-red-500/30 rounded-3xl p-6 shadow-2xl relative text-center">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                 <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Elimina Account</h3>
              <p className="text-slate-400 text-sm mb-4">Questa azione è irreversibile. Tutte le tue preferenze andranno perse.</p>
              
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl mb-4 text-left">
                 <p className="text-xs text-slate-400 mb-2">Per confermare, digita: <strong className="text-white">delete {userData?.username}</strong></p>
                 <input 
                   type="text" 
                   value={deleteConfirmText}
                   onChange={e => setDeleteConfirmText(e.target.value)}
                   className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" 
                 />
              </div>

              <div className="flex gap-3">
                 <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-semibold transition-colors cursor-pointer">Annulla</button>
                 <button 
                   onClick={handleDeleteAccount} 
                   disabled={deleteConfirmText !== `delete ${userData?.username}`}
                   className="flex-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:hover:bg-red-600 text-white text-sm font-semibold transition-colors cursor-pointer"
                 >
                   Elimina
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* --- MODALE DIVENTA CURATORE --- */}
      {showCuratorModal && (
        <div className="fixed inset-0 bg-black/80 z-[10000] flex items-center justify-center p-4">
           <div className="w-full max-w-sm bg-[#121218] border border-cyan-500/30 rounded-3xl p-6 shadow-2xl relative text-center animate-fadeIn">
              <div className="w-16 h-16 bg-cyan-500/10 text-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                 <Star size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Diventa Curatore</h3>
              <p className="text-slate-400 text-sm mb-6">Vuoi inviare la richiesta per diventare curatore? Il team valuterà il tuo profilo.</p>
              
              <div className="flex gap-3">
                 <button onClick={() => setShowCuratorModal(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-semibold transition-colors cursor-pointer">
                   Annulla
                 </button>
                 <button 
                   onClick={submitCuratorRequest} 
                   className="flex-1 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-colors cursor-pointer"
                 >
                   Invia Richiesta
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}