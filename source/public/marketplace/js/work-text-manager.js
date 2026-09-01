// work-text-manager.js — Modulo "Gestisci Testi" per l'opera: i vari registri
// linguistici (semplice/medio/professionale/esperto, + curiosità/parafrasi)
// mostrati nel modal "textManagerModal", scorporato dal core perché lavora
// su un concetto diverso dall'anagrafica dell'opera.
//
// Dipende da: worksCache, currentMuseumId, API_BASE_URL (definite/gestite
// in edit-museum.js core / config.js). openTextManager() è chiamata dal
// bottone "Gestisci Testi" generato in renderSectionAccordionItem (edit-museum.js).

let tmCurrentWork = null;

// Inizializza la modale quando la pagina si carica
document.addEventListener("DOMContentLoaded", () => {
  const tmModalEl = document.getElementById("textManagerModal");
  if (tmModalEl) {
    textManagerModalInstance = new bootstrap.Modal(tmModalEl);
  }
});

// Apre la modale ricevendo l'ID dell'opera
function openTextManager(workId) {
  // Peschiamo l'opera direttamente dalla cache usando l'ID come chiave!
  tmCurrentWork = worksCache[workId];
  
  if (!tmCurrentWork) {
    alert("Errore: Opera non trovata.");
    return;
  }

  document.getElementById("tm-work-name").innerText = tmCurrentWork.name;
  
  // Impostiamo i valori di default coerenti con il nuovo HTML
  document.getElementById("tm-audience").value = "medium";
  document.getElementById("tm-length").value = "medium";

  handleTextTypeChange();

  loadSpecificText();
  textManagerModalInstance.show();
}

// Gestisce il blocco e lo stile della tendina "Lunghezza" per Curiosità e Parafrasi
function handleTextTypeChange() {
  const aud = document.getElementById("tm-audience").value;
  const lenSelect = document.getElementById("tm-length");
  
  if (aud === 'funFact' || aud === 'paraphrase') {
    lenSelect.disabled = true;
    // Aggiungiamo le classi Bootstrap per farlo diventare grigino e semi-trasparente
    lenSelect.classList.add("opacity-50", "text-muted");
    lenSelect.classList.remove("text-light");
  } else {
    lenSelect.disabled = false;
    // Ripristiniamo l'aspetto originale
    lenSelect.classList.remove("opacity-50", "text-muted");
    lenSelect.classList.add("text-light");
  }
  
  loadSpecificText();
}

// 1. Cerca la stringa corretta nel database e la stampa
function loadSpecificText() {
  const aud = document.getElementById("tm-audience").value; // simple, medium, professional, expert, funFact, paraphrase
  const len = document.getElementById("tm-length").value;   // short, medium, long, exhaustive
  const textarea = document.getElementById("tm-textarea");

  textarea.value = "";

  if (tmCurrentWork) {
    if (aud === 'funFact' || aud === 'paraphrase') {
      // Se stiamo cercando Curiosità o Parafrasi, peschiamo dal primo livello dell'oggetto!
      if (tmCurrentWork[aud]) textarea.value = tmCurrentWork[aud];
    } else {
      // Altrimenti peschiamo dal registro nidificato (description.simple.short)
      if (tmCurrentWork.description && tmCurrentWork.description[aud] && tmCurrentWork.description[aud][len]) {
        textarea.value = tmCurrentWork.description[aud][len];
      } else if (typeof tmCurrentWork.description === 'string' && aud === 'medium' && len === 'medium') {
        textarea.value = tmCurrentWork.description;
      }
    }
  }
}

// 2. Salva la modifica manuale nel database (accetta tutte le opzioni)
async function saveSpecificText() {
  const aud = document.getElementById("tm-audience").value;
  const len = document.getElementById("tm-length").value;
  const newText = document.getElementById("tm-textarea").value.trim();

  if (!tmCurrentWork) return;

  // Costruiamo il payload dinamico da spedire al server
  let updatePayload = { museumId: currentMuseumId };

  if (aud === 'funFact' || aud === 'paraphrase') {
    // Aggiorna la cache e prepara il payload per i campi di primo livello
    tmCurrentWork[aud] = newText;
    updatePayload[aud] = newText; 
  } else {
    // Assicurati che l'oggetto descrizione esista e sia formattato bene
    if (!tmCurrentWork.description || typeof tmCurrentWork.description === 'string') {
      tmCurrentWork.description = { simple: {}, medium: {}, professional: {}, expert: {} };
    }
    if (!tmCurrentWork.description[aud]) tmCurrentWork.description[aud] = {};
    
    // Aggiorna la cache e prepara il payload per la descrizione nidificata
    tmCurrentWork.description[aud][len] = newText;
    updatePayload.description = tmCurrentWork.description;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/works/${tmCurrentWork._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatePayload)
    });

    if (res.ok) alert("Testo salvato con successo!");
    else alert("Errore durante il salvataggio.");
  } catch (error) {
    console.error(error);
  }
}

// 3. Genera il testo per UNA SINGOLA Cella (Risparmio Token!)
async function generateSpecificTextWithAI() {
  const aud = document.getElementById("tm-audience").value;
  const len = document.getElementById("tm-length").value;
  const textarea = document.getElementById("tm-textarea");

  if (!tmCurrentWork) return;

  // Peschiamo il contesto inserito nel form principale (se presente)
  const baseContext = document.getElementById("work-description")?.value || "Basati sulle tue conoscenze storiche.";
  let prompt = "";

  if (aud === 'funFact') {
    prompt = `Scrivi una curiosità divertente o un aneddoto poco noto (max 3 frasi) sull'opera d'arte "${tmCurrentWork.name}". Contesto del curatore: ${baseContext}. Restituisci SOLO ed ESCLUSIVAMENTE il testo finale, senza markdown e senza virgolette.`;
  } else if (aud === 'paraphrase') {
    prompt = `Scrivi una parafrasi (spiegazione molto semplificata, 2-3 frasi) del significato dell'opera d'arte "${tmCurrentWork.name}". Contesto del curatore: ${baseContext}. Restituisci SOLO ed ESCLUSIVAMENTE il testo finale, senza markdown e senza virgolette.`;
  } else {
    prompt = `
    Sei un esperto curatore d'arte e storico. Il tuo compito è generare una descrizoine per l'opera d'arte "${tmCurrentWork.name}".

    Considera che esistono questi 4 registri linguistici:
      - simple: per bambini o principianti assoluti (linguaggio molto semplice, concetti base).
      - medium: per il visitatore medio (divulgativo, coinvolgente).
      - professional: per appassionati o studenti d'arte (terminologia tecnica, cenni al movimento artistico).
      - expert: per storici dell'arte (analisi critica profonda, contesto socio-culturale, tecnica).
    E queste 4 lunghezze di descrizione:
      - short: 3 secondi (1 frase sintetica). NOTA BENE: Puoi usare la stessa identica frase "short" per tutti e 4 i registri per risparmiare tempo.
      - medium: 15 secondi (2-3 frasi).
      - long: 1 minuto (circa 2-3 paragrafi).
      - exhaustive: 4 minuti (analisi completa e lunghissima).

    Devi scrivere la descrizione basandoti sulle seguenti istruzioni:
      1. Tieni conto della contesto fornito dal curatore: ${baseContext}
      2. Usa il registro linguistico richiesto: ${aud} 
      3. Lunghezza richiesta: ${len} 

    Restituisci SOLO ed ESCLUSIVAMENTE il testo finale, senza virgolette iniziali/finali o formattazione markdown.
  `;
  }

  textarea.value = "Generazione in corso (attendi qualche secondo)...";
  
  try {
    const res = await fetch(`${API_BASE_URL}/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    
    if (res.ok) {
      const data = await res.json();
      textarea.value = data.text;
      // Nota: Il testo è stato inserito nella textarea, ma NON salvato nel DB. 
      // L'utente deve cliccare su "Salva Modifica Manuale" per confermare la scelta dell'IA.
    } else {
      textarea.value = "Errore durante la generazione. L'IA potrebbe essere offline.";
    }
  } catch (e) {
    textarea.value = "Errore di connessione al server.";
  }
}