import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "../config";

export function useWorkGuide({ 
  work, 
  initialExpertise = "medium", 
  initialLength = "medium", 
  commandsMap,
  socket,
  roomCode,
  isSharedSession,
  isTeacher
}) {
  const [playMode, setPlayMode] = useState(false);
  const [currentExpertise, setCurrentExpertise] = useState(initialExpertise);
  const [currentLength, setCurrentLength] = useState(initialLength);
  const [audioProgressRatio, setAudioProgressRatio] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [showFunFact, setShowFunFact] = useState(false);
  useEffect(() => {
    setShowFunFact(false);
  }, [work]);

  const [activeTab, setActiveTab] = useState('work');
  const [authorSubTab, setAuthorSubTab] = useState('bio');

  useEffect(() => {
    setShowFunFact(false);
    setActiveTab('work');
    setAuthorSubTab('bio');
  }, [work]);
  
  const [isListening, setIsListening] = useState(false);
  const [voiceToast, setVoiceToast] = useState("");
  const recognitionRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  
  const currentUtteranceRef = useRef(null);
  const audioCharIndexRef = useRef(0);
  const currentAudioTextRef = useRef("");
  const isAudioActiveRef = useRef(false);

  // --- TRACCIAMENTO "INDIZI DI ASCOLTO" per la dashboard dell'insegnante ---
  // Vive qui perché è l'hook, non il componente, a possedere davvero il
  // ciclo di vita dell'audio (onstart/onend/onerror, pause/resume/seek).
  // Emettiamo SOLO transizioni di stato, mai la posizione continua: con
  // ~20 studenti connessi vogliamo pochi eventi a testa per opera. Sono
  // indizi per il docente, non prove: leggere il testo invece di
  // ascoltarlo resta legittimo.
  const audioTrackingRef = useRef({
    accumulatedSeconds: 0,
    lastResumeAt: null,
    completedSent: false,
    seekBurstCount: 0,
    seekBurstTimer: null,
    expectedDuration: 0,
  });

  const resetAudioTracking = () => {
    const t = audioTrackingRef.current;
    t.accumulatedSeconds = 0;
    t.lastResumeAt = null;
    t.completedSent = false;
    t.seekBurstCount = 0;
    if (t.seekBurstTimer) {
      clearTimeout(t.seekBurstTimer);
      t.seekBurstTimer = null;
    }
  };

  const sendAudioEvent = (eventType, extra = {}) => {
    if (!(isSharedSession && !isTeacher && socket && roomCode)) return;
    console.log('[AUDIO EVENT]', eventType, extra);
    socket.emit("student_audio_event", {
      roomCode,
      studentName: localStorage.getItem("student_name") || "Studente",
      workId: work?._id,
      eventType,
      expectedDuration: audioTrackingRef.current.expectedDuration,
      timestamp: Date.now(),
      ...extra,
    });
  };

  // Ritorna il tempo di ascolto reale accumulato fino a questo istante
  // (segmenti passati + eventuale segmento in corso).
  const getLiveElapsedSeconds = () => {
    const t = audioTrackingRef.current;
    return t.accumulatedSeconds + (t.lastResumeAt ? (Date.now() - t.lastResumeAt) / 1000 : 0);
  };

  // Reset del tracciamento ad ogni cambio opera (nuova "sessione" di ascolto)
  useEffect(() => {
    resetAudioTracking();
  }, [work]);

  const lengthLevels = ["short", "medium", "long", "exhaustive"];
  const expertiseLevels = ["simple", "medium", "professional", "expert"];

  // --- CONTROLLER AUDIO CON DIAGNOSTICA COMPLETA ---
  const speakFromOffset = (text, startChar = 0) => {
    console.log("--> [AUDIO DEBUG] speakFromOffset chiamata!");
    console.log("--> [AUDIO DEBUG] Testo:", text);

    if (!text || typeof text !== "string" || text.trim() === "") {
      console.warn("--> [AUDIO DEBUG] Interrotto: il testo è nullo, non stringa o vuoto.");
      setPlayMode(false);
      return;
    }

    if (window.speechSynthesis.paused) {
      console.log("--> [AUDIO DEBUG] Rilevata pausa del browser, invoco resume()");
      window.speechSynthesis.resume();
    }
    
    window.speechSynthesis.cancel();

    const safeStart = Math.max(0, Math.min(startChar, text.length - 1));
    const subText = text.slice(safeStart);
    console.log("--> [AUDIO DEBUG] Testo effettivo da riprodurre:", subText.slice(0, 60) + "...");

    const utterance = new SpeechSynthesisUtterance(subText);
    currentUtteranceRef.current = utterance; // Riferimento per bloccare il Garbage Collector

    utterance.lang = "it-IT";
    const speed = parseFloat(localStorage.getItem('audioSpeed')) || 1.0;
    utterance.rate = speed;

    utterance.onstart = () => {
      console.log("--> [AUDIO DEBUG] EVENTO ONSTART: Inizio lettura.");
      setPlayMode(true);
      isAudioActiveRef.current = true;
      audioTrackingRef.current.lastResumeAt = Date.now();
    };

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        audioCharIndexRef.current = safeStart + event.charIndex;
        // AGGIUNTA: Calcola e salva il progresso
        setAudioProgressRatio(audioCharIndexRef.current / text.length); 
      }
    };

    utterance.onend = (e) => {
      console.log("--> [AUDIO DEBUG] EVENTO ONEND: Lettura terminata.", e);
      setPlayMode(false);
      isAudioActiveRef.current = false;
      audioCharIndexRef.current = 0;
      currentUtteranceRef.current = null;
      setAudioProgressRatio(0);
      setAudioDuration(0);

      // Fine naturale: se non era già stata segnalata (es. da un handleStopAudio
      // esplicito arrivato in mezzo), la registriamo come "completed".
      const tracking = audioTrackingRef.current;
      if (tracking.lastResumeAt) {
        tracking.accumulatedSeconds += (Date.now() - tracking.lastResumeAt) / 1000;
        tracking.lastResumeAt = null;
      }
      if (!tracking.completedSent) {
        tracking.completedSent = true;
        sendAudioEvent("audio_completed", { elapsedSeconds: Math.round(tracking.accumulatedSeconds) });
      }
    };

    utterance.onerror = (e) => {
      console.error("--> [AUDIO DEBUG] EVENTO ONERROR:", e.error, e);
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      setPlayMode(false);
      isAudioActiveRef.current = false;
      currentUtteranceRef.current = null;
      setAudioProgressRatio(0);
      setAudioDuration(0);

      const tracking = audioTrackingRef.current;
      if (tracking.lastResumeAt) {
        tracking.accumulatedSeconds += (Date.now() - tracking.lastResumeAt) / 1000;
        tracking.lastResumeAt = null;
      }
    };

    const voices = window.speechSynthesis.getVoices();
    console.log("--> [AUDIO DEBUG] Voci nel sistema:", voices.length);
    const itVoice = voices.find(v => v.lang.startsWith("it"));
    if (itVoice) {
      utterance.voice = itVoice;
      console.log("--> [AUDIO DEBUG] Voce italiana associata:", itVoice.name);
    }

    console.log("--> [AUDIO DEBUG] Esecuzione window.speechSynthesis.speak()");
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 50);
  };

  const speakText = (textToRead) => {
    console.log("--> [AUDIO DEBUG] speakText invocata");
    if (!textToRead) {
      handleStopAudio();
      return;
    }
    currentAudioTextRef.current = textToRead;
    audioCharIndexRef.current = 0;

    // Calcolo durata stimata (circa 2.2 parole al secondo corrette per la velocità)
    const words = textToRead.trim().split(/\s+/).filter(Boolean).length || 1;
    const speed = parseFloat(localStorage.getItem('audioSpeed')) || 1.0;
    const calculatedDuration = Math.max(1, Math.round(words / (2.2 * speed)));
    setAudioDuration(calculatedDuration);

    // Ogni chiamata a speakText è un "nuovo ascolto" (prima lettura, o restart
    // dopo "dimmi di più/meno", "semplifica/approfondisci", curiosità, ecc.)
    resetAudioTracking();
    audioTrackingRef.current.expectedDuration = calculatedDuration;
    sendAudioEvent("audio_started");

    speakFromOffset(textToRead, 0);
  };

  const handleStopAudio = () => {
    console.log("--> [AUDIO DEBUG] handleStopAudio invocata");
    window.speechSynthesis.cancel();
    setPlayMode(false);
    isAudioActiveRef.current = false;
    audioCharIndexRef.current = 0;
    currentUtteranceRef.current = null;
    setAudioProgressRatio(0);
    setAudioDuration(0);

    const tracking = audioTrackingRef.current;
    if (tracking.lastResumeAt) {
      tracking.accumulatedSeconds += (Date.now() - tracking.lastResumeAt) / 1000;
      tracking.lastResumeAt = null;
    }
    // Se non aveva già finito naturalmente e c'era stato davvero un po' di
    // ascolto, è un'interruzione manuale: la segnaliamo come indizio.
    if (!tracking.completedSent && tracking.accumulatedSeconds > 0) {
      tracking.completedSent = true;
      sendAudioEvent("audio_stopped", { elapsedSeconds: Math.round(tracking.accumulatedSeconds) });
    }
  };

  const handlePauseAudio = (visualRatio) => {
    // Interrompiamo brutalmente il motore invece di usare la pausa nativa buggata
    window.speechSynthesis.cancel();
    setPlayMode(false);
    
    const fullText = currentAudioTextRef.current;
    if (fullText && visualRatio !== undefined) {
      audioCharIndexRef.current = Math.round(fullText.length * visualRatio);
      setAudioProgressRatio(visualRatio);
    }

    const tracking = audioTrackingRef.current;
    if (tracking.lastResumeAt) {
      tracking.accumulatedSeconds += (Date.now() - tracking.lastResumeAt) / 1000;
      tracking.lastResumeAt = null;
    }
    sendAudioEvent("audio_paused", { progressRatio: visualRatio });
  };

  const handleResumeAudio = (visualRatio) => {
    const fullText = currentAudioTextRef.current;
    let targetChar = audioCharIndexRef.current;
    
    if (visualRatio !== undefined && fullText) {
      targetChar = Math.round(fullText.length * visualRatio);
    }

    sendAudioEvent("audio_resumed", { progressRatio: visualRatio });
    
    // Riavvia l'audio simulando la ripresa dall'esatto punto di interruzione
    speakFromOffset(fullText, targetChar);
  };

  const handleSeekAudio = (seconds, visualRatio) => {
    const fullText = currentAudioTextRef.current;
    if (!fullText) return;

    const speed = parseFloat(localStorage.getItem('audioSpeed')) || 1.0;
    const charsPerSecond = 15 * speed;
    const charShift = Math.round(charsPerSecond * seconds);

    // Usa la linea grafica come ancoraggio assoluto
    let currentIndex = audioCharIndexRef.current;
    if (visualRatio !== undefined) {
      currentIndex = Math.round(fullText.length * visualRatio);
    }

    const targetChar = Math.max(0, Math.min(fullText.length - 1, currentIndex + charShift));

    audioCharIndexRef.current = targetChar;
    // Un microscopico offset forza il re-render di React anche per salti minimi
    setAudioProgressRatio((targetChar / fullText.length) + 0.00001);

    speakFromOffset(fullText, targetChar);

    // Un singolo ±5s è normale; tanti in rapida sequenza (avanti veloce per
    // "far finire" l'opera) sono un indizio. Aggreghiamo invece di spammare
    // un evento per ogni click.
    if (seconds > 0) {
      const tracking = audioTrackingRef.current;
      tracking.seekBurstCount += 1;
      if (tracking.seekBurstTimer) clearTimeout(tracking.seekBurstTimer);
      tracking.seekBurstTimer = setTimeout(() => {
        if (tracking.seekBurstCount >= 3) {
          sendAudioEvent("audio_seek_burst", { seekCount: tracking.seekBurstCount });
        }
        tracking.seekBurstCount = 0;
        tracking.seekBurstTimer = null;
      }, 4000);
    }
  };

  // Funzione che mostra il pop-up a schermo per 2 secondi
  const triggerToast = (text) => {
    console.log("[MIC TOAST]", text);
    setVoiceToast(text);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setVoiceToast("");
    }, 2000);
  };

  const processUserCommand = async (phrase) => {
    if (!phrase.trim()) return;
    const cleanPhrase = phrase.trim().toLowerCase();

    if (isSharedSession && !isTeacher && socket && roomCode) {
      socket.emit('student_interaction', {
        roomCode,
        studentName: localStorage.getItem('student_name') || 'Studente',
        interactionType: 'voice',
        query: phrase
      });
    }

    // Mappatura comandi vocali sui tasti
    if (phrase.includes("approfondisci") || phrase.includes("spiega meglio") || phrase.includes("più difficile") || phrase.includes("più tecnico")) {
      handleHigherExper();
    } else if (phrase.includes("semplifica") || phrase.includes("più facile") || phrase.includes("parla semplice") || phrase.includes("più semplice")) {
      handleLowerExper();
    } else if (phrase.includes("dimmi di più") || phrase.includes("più lunga") || phrase.includes("continua") || phrase.includes("estendi")) {
      handleMoreDesc();
    } else if (phrase.includes("dimmi di meno") || phrase.includes("più corta") || phrase.includes("riassumi") || phrase.includes("meno")) {
      handleLessDesc();
    } else if (phrase.includes("ascolta") || phrase.includes("leggi") || phrase.includes("riproduci") || phrase.includes("play")) {
      speakText(work?.description?.[currentExpertise]?.[currentLength]);
    } else if (phrase.includes("ferma") || phrase.includes("stop") || phrase.includes("pausa") || phrase.includes("silenzio")) {
      handleStopAudio();
    } else if (phrase.includes("curiosità") || phrase.includes("aneddoto")) {
      handleFunFact();
    } else if (phrase.includes("autore") || phrase.includes("chi l'ha fatto")) {
      handleAuthorBio();
    } else if (phrase.includes("stile") || phrase.includes("corrente")) {
      handleAboutStyle();
    } else {
      // 1. Cerca il comando nel dizionario statico (priorità alta e risposta immediata)
      let mapped = commandsMap ? commandsMap[phrase.replace(/\.$/, '')] : null;
      
      // 2. Se non c'è nel dizionario, delega l'interpretazione all'IA
      if (!mapped) {
        try {
          const aiResponse = await fetch(`${API_BASE_URL}/ai/map-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: phrase })
          });
          
          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            mapped = aiData.mappedAction;
          }
        } catch (e) {
          console.error("[MIC] Errore durante la mappatura IA:", e);
        }
      }

      // 3. Esegui l'azione mappata (sia che provenga dal dizionario, sia dall'IA)
      switch (mapped) {
        case "PLAY":
          speakText(work?.description?.[currentExpertise]?.[currentLength]);
          break;
        case "NEXT_DESC":
          handleMoreDesc();
          break;
        case "PREV_DESC":
          handleLessDesc();
          break;
        case "NEXT_EXPER":
          handleHigherExper();
          break;
        case "PREV_EXPER":
          handleLowerExper();
          break;
        case "FUN_FACT":
          handleFunFact();
          break;
        case "AUTHOR_BIO":
          handleAuthorBio();
          break;
        case "AUTHOR_STUDIES":
          handleAuthorStudies();
          break;
        case "AUTHOR_WORKS":
          handleAuthorWorks();
          break;
        case "STYLE_DESC":
          handleAboutStyle();
          break;
        case "PARAPHRASE":
          handleParaphrase();
          break;
        case "CLOSE":
          handleStopAudio();
          break;
        case "UNKNOWN":
        default:
          triggerToast("Non ho capito, riprova");
          break;
      }
    }
  };

  // GESTORE RICONOSCIMENTO VOCALE
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Il browser non supporta il microfono.");
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (err) {}
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = 'it-IT';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log("[MIC] In ascolto...");
      setIsListening(true);
      handleStopAudio();
      triggerToast("In ascolto...");
    };

    recognition.onresult = async (event) => {
      const phrase = event.results[0][0].transcript.trim().toLowerCase();
      console.log("[MIC] Frase intercettata:", phrase);
      
      // Mostra a schermo esattamente quello che ha capito
      triggerToast(`"${phrase}"`);

      processUserCommand(phrase);
    }

    recognition.onerror = (e) => {
      console.warn("[MIC] Errore:", e.error);
      setIsListening(false);
      triggerToast("Non ho capito, riprova");
    };

    recognition.onend = () => {
      console.log("[MIC] Fine ascolto");
      setIsListening(false);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("[MIC] Errore start:", e);
      setIsListening(false);
    }
  };


  const handleMoreDesc = () => {
    setActiveTab('work');
    const currentIndex = lengthLevels.indexOf(currentLength);
    if (currentIndex < lengthLevels.length - 1) {
      const nextLength = lengthLevels[currentIndex + 1];
      const textToSpeak = work?.description?.[currentExpertise]?.[nextLength];
      if (textToSpeak) {
        setCurrentLength(nextLength);
        if (playMode) speakText(textToSpeak);
      }
    }
  };

  const handleLessDesc = () => {
    setActiveTab('work');
    const currentIndex = lengthLevels.indexOf(currentLength);
    if (currentIndex > 0) {
      const prevLength = lengthLevels[currentIndex - 1];
      const textToSpeak = work?.description?.[currentExpertise]?.[prevLength];
      if (textToSpeak) {
        setCurrentLength(prevLength);
        if (playMode) speakText(textToSpeak);
      }
    }
  };

  const handleHigherExper = () => {
    setActiveTab('work');
    const currentIndex = expertiseLevels.indexOf(currentExpertise);
    if (currentIndex < expertiseLevels.length - 1) {
      const nextExpertise = expertiseLevels[currentIndex + 1];
      const textToSpeak = work?.description?.[nextExpertise]?.[currentLength];
      if (textToSpeak) {
        setCurrentExpertise(nextExpertise);
        if (playMode) speakText(textToSpeak);
      }
    }
  };

  const handleLowerExper = () => {
    setActiveTab('work');
    const currentIndex = expertiseLevels.indexOf(currentExpertise);
    if (currentIndex > 0) {
      const prevExpertise = expertiseLevels[currentIndex - 1];
      const textToSpeak = work?.description?.[prevExpertise]?.[currentLength];
      if (textToSpeak) {
        setCurrentExpertise(prevExpertise);
        if (playMode) speakText(textToSpeak);
      }
    }
  };

  const handleFunFact = () => {
    setActiveTab('work');
    if (work?.funFact) {
      setShowFunFact(true);
      if (playMode) speakText(`Ecco una curiosità su quest'opera: ${work.funFact}`);
    } else {
      speakText(`Mi dispiace, ma non ho curiosità extra registrate per quest'opera.`);
    }
  };

  const handleParaphrase = () => {
    setActiveTab('work');
    const text = work?.paraphrase || "La parafrasi non è disponibile per quest'opera.";
    speakText(text);
  };

  // --- HELPER PER PESCARE I DATI CORRETTI ---
  const currentMuseumId = localStorage.getItem('selected_museum_id');

  const getAuthorData = () => {
    const authorObj = work?.author || work?.authorId;
    const dataList = authorObj?.data || [];
    
    // Controlla se m è un oggetto popolato (m._id) oppure una stringa/ObjectId semplice (m)
    return dataList.find(d => 
      d.museumId && d.museumId.some(m => 
        (m._id ? m._id.toString() : m.toString()) === currentMuseumId
      )
    ) || dataList[0];
  };

  const getStyleData = () => {
    const styleObj = work?.style || work?.styleId;
    const dataList = styleObj?.data || [];
    
    return dataList.find(d => 
      d.museumId && d.museumId.some(m => 
        (m._id ? m._id.toString() : m.toString()) === currentMuseumId
      )
    ) || dataList[0];
  };

  // --- FUNZIONI DI LETTURA ---
  const handleAuthorBio = () => {
    setActiveTab('author');
    setAuthorSubTab('bio');
    const authorData = getAuthorData();
    const text = authorData?.bio || `Mi dispiace, non ho una biografia dettagliata per ${work?.authorName || "questo autore"}.`;
    speakText(text);
  };

  const handleAuthorStudies = () => {
    setActiveTab('author');
    setAuthorSubTab('studies');
    const authorData = getAuthorData();
    const text = authorData?.studies || "Non ho informazioni sugli studi dell'autore.";
    speakText(text);
  };

  const handleAuthorWorks = () => {
    setActiveTab('author');
    setAuthorSubTab('works');
    const authorData = getAuthorData();
    const text = authorData?.mainWorks || "Non ho informazioni sulle altre opere principali.";
    speakText(text);
  };

  const handleAboutStyle = () => {
    setActiveTab('style');
    const styleData = getStyleData();
    const text = styleData?.description || `Mi dispiace, non ho approfondimenti sullo stile ${work?.styleName || "di quest'opera"}.`;
    speakText(text);
  };

  const authorText = getAuthorData()?.bio || `Mi dispiace, non ho una biografia dettagliata per ${work?.authorName || "questo autore"}.`;
  const styleText = getStyleData()?.description || `Mi dispiace, non ho approfondimenti sullo stile ${work?.styleName || "di quest'opera"}.`;

  return {
    playMode, currentExpertise, currentLength, audioProgressRatio, audioDuration,
    isListening, voiceToast, showFunFact,
    setCurrentExpertise, setCurrentLength,
    speakText, handleStopAudio, handlePauseAudio, handleResumeAudio, handleSeekAudio,
    startListening, handleMoreDesc, handleLessDesc, handleHigherExper, handleLowerExper,
    handleFunFact, handleAuthorBio, handleAuthorStudies, handleAuthorWorks, handleAboutStyle, handleParaphrase,
    processUserCommand, authorText, styleText, activeTab, setActiveTab, authorSubTab, setAuthorSubTab
  };
}