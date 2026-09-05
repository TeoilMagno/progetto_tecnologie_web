import { useState, useEffect, useRef } from "react";

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
  
  const [isListening, setIsListening] = useState(false);
  const [voiceToast, setVoiceToast] = useState("");
  const recognitionRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  
  const currentUtteranceRef = useRef(null);
  const audioCharIndexRef = useRef(0);
  const currentAudioTextRef = useRef("");
  const isAudioActiveRef = useRef(false);

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
    };

    utterance.onerror = (e) => {
      console.error("--> [AUDIO DEBUG] EVENTO ONERROR:", e.error, e);
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      setPlayMode(false);
      isAudioActiveRef.current = false;
      currentUtteranceRef.current = null;
      setAudioProgressRatio(0);
      setAudioDuration(0);
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
  };

  const handleResumeAudio = (visualRatio) => {
    const fullText = currentAudioTextRef.current;
    let targetChar = audioCharIndexRef.current;
    
    if (visualRatio !== undefined && fullText) {
      targetChar = Math.round(fullText.length * visualRatio);
    }
    
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
        handleAboutAuthor();
      } else if (phrase.includes("stile") || phrase.includes("corrente")) {
        handleAboutStyle();
      } else {
        let mapped = commandsMap ? commandsMap[phrase.replace(/\.$/, '')] : null;
        if (mapped === "PLAY") speakText(work?.description?.[currentExpertise]?.[currentLength]);
      }
    };

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
    if (work?.funFact) {
      setShowFunFact(true);
      if (playMode) speakText(`Ecco una curiosità su quest'opera: ${work.funFact}`);
    } else {
      speakText(`Mi dispiace, ma non ho curiosità extra registrate per quest'opera.`);
    }
  };

  const handleAboutAuthor = () => {
    const authorName = work?.authorName || "Autore non specificato";
    const authorBio = work?.authorBio || work?.authorDescription;
    const speech = authorBio 
      ? `L'opera è stata realizzata da ${authorName}. ${authorBio}`
      : `Quest'opera è attribuita a ${authorName}, maestro attivo nel periodo di creazione dell'opera.`;
    speakText(speech);
  };

  const handleAboutStyle = () => {
    const styleName = work?.styleName || "Stile non specificato";
    const styleDesc = work?.styleDescription;
    const speech = styleDesc
      ? `Quest'opera appartiene alla corrente ${styleName}. ${styleDesc}`
      : `L'opera è un esempio significativo dello stile ${styleName}, caratteristico dell'epoca ${work?.year || ''}.`;
    speakText(speech);
  };

  return {
    playMode, currentExpertise, currentLength, audioProgressRatio, audioDuration,
    isListening, voiceToast, showFunFact,
    setCurrentExpertise, setCurrentLength,
    speakText, handleStopAudio, handlePauseAudio, handleResumeAudio, handleSeekAudio,
    startListening, handleMoreDesc, handleLessDesc, handleHigherExper, handleLowerExper,
    handleFunFact, handleAboutAuthor, handleAboutStyle
  };
}