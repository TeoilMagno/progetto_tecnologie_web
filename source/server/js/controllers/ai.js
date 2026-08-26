const { GoogleGenerativeAI } = require("@google/generative-ai");
const Work = require("../models/works")
const Author = require('../models/author'); 
const Style = require('../models/style');  
const Item = require('../models/items');

// Inizializziamo il client usando la chiave segreta dal file .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const AImodel = "gemini-3.5-flash-lite";

exports.generateContent = async (prompt) => {
  try {
    // Usiamo il modello "flash" che è velocissimo e gratuito per i test
    const model = genAI.getGenerativeModel({ model: AImodel });
    
    // Invia il prompt a Google e aspetta la magia
    const result = await model.generateContent(prompt);
    
    // Estrae solo il testo pulito dalla risposta complessa di Google
    return result.response.text();
  } catch (error) {
    console.error("Errore fatale con Gemini API:", error);
    throw error;
  }
};

exports.generateAndSaveWorkDescriptions = async (workId, workName, userDescription) => {
  try {
    const model = genAI.getGenerativeModel({ 
      model: AImodel,
      systemInstruction: ` 
          Sei un esperto curatore d'arte e storico. Genera descrizioni museali basate sugli appunti forniti. Scrivi 4 registri linguistici (simple, medium, professional, expert) declinati in 4 lunghezze (short, medium, long, exhaustive).

          1. Usa gli appunti del curatore come base di partenza. Migliorali, espandili e adattali ai vari registri, mantenendo le informazioni chiave.
          2. Crea 4 registri linguistici:
            - simple: per bambini o principianti assoluti (linguaggio molto semplice, concetti base).
            - medium: per il visitatore medio (divulgativo, coinvolgente).
            - professional: per appassionati o studenti d'arte (terminologia tecnica, cenni al movimento artistico).
            - expert: per storici dell'arte (analisi critica profonda, contesto socio-culturale, tecnica).
          3. Per OGNI registro, crea 4 lunghezze basate sul tempo di lettura:
            - short: 3 secondi (1 frase sintetica). NOTA BENE: Puoi usare la stessa identica frase "short" per tutti e 4 i registri per risparmiare tempo.
            - medium: 15 secondi (2-3 frasi).
            - long: 1 minuto (circa 2-3 paragrafi).
            - exhaustive: 4 minuti (analisi completa e lunghissima).
          4. Scrivi anche un "funFact" (una curiosità divertente o poco nota sull'opera, max 3 frasi).
          5. Scrivi una "paraphrase" (una spiegazione semplificata del significato dell'opera in 2-3 frasi).
          Aggiungi una curiosità (funFact) e una parafrasi semplice. Rispondi SOLO in formato JSON.`,
      generationConfig: { responseMimeType: "application/json" }
    });
    
    const prompt = `
      Opera: "${workName}"
      Appunti iniziali: "${userDescription || 'Nessun contesto fornito. Basati sulle tue conoscenze storiche.'}"
      
      Struttura JSON attesa:
      {
        "descriptions": {
          "simple": { "short": "...", "medium": "...", "long": "...", "exhaustive": "..." },
          "medium": { "short": "...", "medium": "...", "long": "...", "exhaustive": "..." },
          "professional": { "short": "...", "medium": "...", "long": "...", "exhaustive": "..." },
          "expert": { "short": "...", "medium": "...", "long": "...", "exhaustive": "..." }
        },
        "funFact": "...",
        "paraphrase": "..."
      }
    `;

    const result = await model.generateContent(prompt);
    // Non serve più il regex replace, l'API restituisce JSON puro!
    const aiData = JSON.parse(result.response.text());

    await Work.findByIdAndUpdate(workId, {
      description: aiData.descriptions,
      funFact: aiData.funFact, // Ho corretto l'uso del camelCase (prima era funfact)
      paraphrase: aiData.paraphrase
    });

    console.log(`✅ [AI SUCCESS] Matrice descrittiva generata e salvata per: ${workName}`);
  } catch (error) {
    console.error(`❌ [AI ERROR] Fallita generazione per l'opera ${workName}:`, error);
  }
};

// --- GENERAZIONE AUTORE ---
exports.generateAndSaveAuthorDescription = async (authorId, museumId, authorName, userContext) => {
  try {
    const model = genAI.getGenerativeModel({ 
      model: AImodel,
      systemInstruction: `Sei uno storico dell'arte. 
          Crea schede anagrafiche e biografiche divulgative ma professionali. 
          Rispondi sempre e solo in formato JSON strutturato.
          
          1. Se il curatore ha fornito degli appunti, usali come base assoluta, migliorali sintatticamente e riempi le informazioni mancanti.
          2. "bio": Scrivi un testo di circa 2 o 3 paragrafi. Includi il periodo storico, il movimento di appartenenza e l'impatto nel mondo dell'arte. Linguaggio divulgativo ma professionale.
          3. "bd": Restituisci le date di nascita e morte nel formato stringa "AAAA - AAAA" (es. "1853 - 1890" o "AAAA - Oggi").
          4. "studies": Descrivi brevemente il percorso di formazione (maestri, accademie, viaggi formativi).
          5. "mainWorks": Scrivi al massimo 2-3 frasi citando e contestualizzando le sue opere principali.`,
      generationConfig: { responseMimeType: "application/json" }
    });
    
    const prompt = `
      Artista: "${authorName}"
      Appunti iniziali forniti dal curatore: "${userContext || 'Nessun appunto fornito.'}"
      
      La struttura DEVE essere questa:
      {
        "bio": "...",
        "bd": "...",
        "studies": "...",
        "mainWorks": "..."
      }
    `;

    const result = await model.generateContent(prompt);
    const parsedData = JSON.parse(result.response.text());

    await Author.findOneAndUpdate(
      { _id: authorId, "data.museumId": museumId }, // Filtro
      { 
        $set: { 
          "data.$.bio": parsedData.bio,
          "data.$.bd": parsedData.bd,
          "data.$.studies": parsedData.studies,
          "data.$.mainWorks": parsedData.mainWorks 
        } 
      }
    );
    console.log(`✅ [AI SUCCESS] Biografia generata per l'autore: ${authorName}`);
  } catch (error) {
    console.error(`❌ [AI ERROR] Fallita biografia per ${authorName}:`, error);
  }
};

// --- GENERAZIONE STILE ---
exports.generateAndSaveStyleDescription = async (styleId, museumId, styleName, userContext) => {
  try {
    const model = genAI.getGenerativeModel({ 
      model: AImodel,
      systemInstruction: `
        Sei uno storico dell'arte. 
        Spiega correnti artistiche in modo chiaro, affascinante e professionale. 
        Rispondi esclusivamente in formato JSON.

        1. Scrivi un testo di circa 2 o 3 paragrafi.
        2. Spiega il periodo storico in cui è nato, le sue caratteristiche visive principali e i temi fondanti.`,
      generationConfig: { responseMimeType: "application/json" }
    });
    
    const prompt = `
      Stile: "${styleName}".
      Appunti iniziali: "${userContext || 'Nessun appunto fornito.'}"
      
      Restituisci SOLO un oggetto JSON con questa struttura esatta:
      {
        "description": "testo della spiegazione..."
      }
    `;

    const result = await model.generateContent(prompt);
    const parsedData = JSON.parse(result.response.text());

    await Style.findOneAndUpdate(
      { _id: styleId, "data.museumId": museumId },
      { 
        $set: { 
          "data.$.description": parsedData.description 
        } 
      }
    );

    console.log(`✅ [AI SUCCESS] Descrizione generata per lo stile: ${styleName}`);
  } catch (error) {
    console.error(`❌ [AI ERROR] Fallita descrizione per ${styleName}:`, error);
  }
};

// Classificazione eta' bookshop
exports.generateAndSaveItemTargetAge = async (itemId, itemName, itemDescription) => {
  try {
    // Rendiamo anche questa funzione indipendente e strettamente JSON
    const model = genAI.getGenerativeModel({ 
      model: AImodel,
      systemInstruction: "Sei un analista di marketing per bookshop museali. Determina il target di età dei prodotti. Rispondi solo con un Array JSON di stringhe.",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      Nome Articolo: ${itemName}
      Descrizione: ${itemDescription}
      
      Seleziona una o più fasce d'età da questa lista esatta: ["0-3", "4-7", "8-12", "teens", "adults", "all"]
      Restituisci solo l'array JSON. Esempio: ["8-12", "teens"]
    `;

    const result = await model.generateContent(prompt);
    const ageArray = JSON.parse(result.response.text());

    await Item.findByIdAndUpdate(itemId, { targetAge: ageArray });
    console.log(`✅ [AI SUCCESS] Target età calcolato per: ${itemName}`);
  } catch (error) {
    console.error(`❌ [AI ERROR] Fallito target età per ${itemName}:`, error);
  }
};

exports.mapRequest = async (prompt) => {
  try {
    // includiamo il dizionario su cui mappare
    const dictionary = require('../../../navigator/src/data/dictionary.json');
    const validActions = [...new Set(Object.values(dictionary))];
    
    // Usiamo il modello "flash" che è velocissimo e gratuito per i test
    const model = genAI.getGenerativeModel({
      model: AImodel,
      systemInstruction: `
        Sei un assistente per un'audioguida museale.
        Il tuo unico compito è capire l'intento dell'utente e mapparlo a UNA ed una soltanto di queste azioni esatte: ${validActions.join(", ")}.
        Se la richiesta dell'utente non c'entra niente o è incomprensibile, restituisci "UNKNOWN".
        
        Esempi:
        Utente: "Puoi leggermi il testo?" -> PLAY
        Utente: "Voglio sapere altro" -> NEXT_DESC
        Utente: "La descrizione è troppo corta" -> NEXT_DESC
        Utente: "Voglio sapere meno" -> PREV_DESC
        Utente: "La descrizione è troppo lunga" -> PREV_DESC
        Utente: "La descrizione è troppo semplice" -> NEXT_EXPER
        Utente: "Voglio una spiegazione più tecnica" -> NEXT_EXPER
        Utente: "La descrizione è troppo difficile" -> PREV_EXPER
        Utente: "Voglio una spiegazione meno tecnica" -> PREV_EXPER
        Utente: "Togli questa schermata" -> CLOSE
        Utente: "dimmi una curiosità su quest'opera" -> FUN_FACT
        Utente: "raccontami qualcosa di divertente su quest'opera" -> FUN_FACT
        Utente: "dimmi qualcosa che non so" -> FUN_FACT
        Utente: "Che ore sono?" -> UNKNOWN
      `,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            mappedAction: {
              type: "string",
              description: "L'azione mappata in base all'intento dell'utente"
            }
          },
          required: ["mappedAction"]
        }
      }
    });
    //
    // Invia il prompt a Google e aspetta la magia
    const result = await model.generateContent(prompt);

    // parso la risposta in JSON
    const aiResponse = JSON.parse(result.response.text());
    
    // Estrae solo il testo pulito dalla risposta complessa di Google
    return aiResponse;
  } catch (error) {
    console.error("Errore fatale con Gemini API:", error);
    throw error;
  }
};

exports.suggestWorks = async (payload) => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", // Assicurati che AImodel punti a questo o al gemini-3.5-flash-lite
      systemInstruction: `Sei un esperto curatore museale. Il tuo compito è suggerire le prossime opere da vedere per completare il tour.
      Regole tassative:
      1. Il visitatore ha ancora ${payload.remaining_time} minuti di tempo.
      2. Si stima un tempo di ${payload.duration} minuti per osservare ogni opera.
      3. Calcola quante opere il visitatore può ancora vedere senza superare il tempo rimanente. Restituisci MASSIMO quel numero di opere.
      4. Scegli le opere più affini per autore o stile a quelle che il visitatore ha già visto.
      5. Devi restituire ESCLUSIVAMENTE un JSON contenente l'array degli ID delle opere scelte.`,
      
      generationConfig: {
        responseMimeType: "application/json",
        // Schema corretto per Gemini
        responseSchema: {
          type: "OBJECT",
          properties: {
            works: {
              type: "ARRAY",
              description: "Lista degli ID (stringhe) delle opere suggerite",
              items: {
                type: "STRING"
              }
            }
          },
          required: ["works"]
        }
      }
    });

    // Costruiamo il prompt con i dati convertiti in stringhe leggibili!
    const prompt = `
      Opere già visitate:
      ${JSON.stringify(payload.seen, null, 2)}
      
      Opere disponibili per il suggerimento:
      ${JSON.stringify(payload.available, null, 2)}
    `;

    // Invia il prompt a Google e aspetta la magia
    const result = await model.generateContent(prompt);

    // Parso la risposta in JSON
    const aiResponse = JSON.parse(result.response.text());
    
    // L'output sarà un oggetto del tipo: { works: ["id_1", "id_2"] }
    return aiResponse;
    
  } catch (error) {
    console.error("Errore fatale con Gemini API:", error);
    throw error;
  }
};
