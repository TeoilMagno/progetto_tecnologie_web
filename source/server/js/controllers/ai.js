const { GoogleGenerativeAI } = require("@google/generative-ai");
const Work = require("../models/works")
const Author = require('../models/author'); 
const Style = require('../models/style');   

// Inizializziamo il client usando la chiave segreta dal file .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// exports.generateContent = async (prompt) => {
//   try {
//     // Usiamo il modello "flash" che è velocissimo e gratuito per i test
//     const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
    
//     // Invia il prompt a Google e aspetta la magia
//     const result = await model.generateContent(prompt);
    
//     // Estrae solo il testo pulito dalla risposta complessa di Google
//     return result.response.text();
//   } catch (error) {
//     console.error("Errore fatale con Gemini API:", error);
//     throw error;
//   }
// };

exports.generateAndSaveWorkDescriptions = async (workId, workName, userDescription) => {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.5-flash-lite",
      generationConfig: { responseMimeType: "application/json" }
    });
    
    const prompt = `
      Sei un esperto curatore d'arte e storico. Il tuo compito è generare un set completo di descrizioni per un'opera d'arte.
      
      Nome dell'opera: "${workName}"
      Appunti/Contesto iniziale del curatore: "${userDescription || 'Nessun contesto fornito. Basati sulle tue conoscenze storiche.'}"
      
      Istruzioni:
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
      
      Restituisci SOLO ED ESCLUSIVAMENTE un oggetto JSON valido. Non aggiungere commenti o backtick markdown. 
      La struttura DEVE essere esattamente questa:
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
    let aiText = result.response.text();
    
    aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const aiData = JSON.parse(aiText);

    // 2. MAGIA: Salviamo direttamente nel Database usando l'ID dell'opera!
    await Work.findByIdAndUpdate(workId, {
      description: aiData.descriptions,
      funFact: aiData.funfact,
      paraphrase: aiData.paraphrase
    });

    console.log(`✅ [AI SUCCESS] Matrice descrittiva generata e salvata per: ${workName}`);
  } catch (error) {
    console.error(`❌ [AI ERROR] Fallita generazione per l'opera ${workName}:`, error);
    throw error;
  }
};

// --- GENERAZIONE AUTORE ---
exports.generateAndSaveAuthorDescription = async (authorId, museumId, authorName, userContext) => {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.5-flash-lite",
      generationConfig: { responseMimeType: "application/json" }
    });
    
    const prompt = `
      Sei uno storico dell'arte. Il tuo compito è creare una scheda anagrafica e biografica completa per l'artista: "${authorName}".
      
      Appunti iniziali forniti dal curatore: "${userContext || 'Nessun appunto fornito.'}"
      
      Istruzioni rigorose:
      1. Se il curatore ha fornito degli appunti, usali come base assoluta, migliorali sintatticamente e riempi le informazioni mancanti.
      2. "bio": Scrivi un testo di circa 2 o 3 paragrafi. Includi il periodo storico, il movimento di appartenenza e l'impatto nel mondo dell'arte. Linguaggio divulgativo ma professionale.
      3. "bd": Restituisci le date di nascita e morte nel formato stringa "AAAA - AAAA" (es. "1853 - 1890"). Se è ancora in vita scrivi "AAAA - Oggi".
      4. "studies": Descrivi brevemente il percorso di formazione (maestri, accademie, viaggi formativi).
      5. "mainWorks": Scrivi al massimo 2-3 frasi citando e contestualizzando le sue opere principali.
      
      Restituisci SOLO ed ESCLUSIVAMENTE un oggetto JSON valido. Non aggiungere markdown, backtick o spiegazioni. La struttura DEVE essere questa:
      {
        "bio": "...",
        "bd": "...",
        "studies": "...",
        "mainWorks": "..."
      }
    `;

    const result = await model.generateContent(prompt);
    let aiText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(aiText);

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
      model: "gemini-3.5-flash-lite",
      generationConfig: { responseMimeType: "application/json" }
    });
    
    const prompt = `
      Sei uno storico dell'arte. Spiega in modo chiaro e affascinante la corrente artistica o lo stile: "${styleName}".
      Appunti iniziali: "${userContext || 'Nessun appunto fornito.'}"
      
      Istruzioni:
      1. Scrivi un testo di circa 2 o 3 paragrafi.
      2. Spiega il periodo storico in cui è nato, le sue caratteristiche visive principali e i temi fondanti.
      3. Usa un linguaggio divulgativo ma professionale.
      4. REGOLE JSON RIGOROSE: Devi usare le virgolette doppie (") per la chiave e per racchiudere l'intero valore testuale. Tuttavia, ALL'INTERNO del testo della descrizione, ti è severamente vietato usare le virgolette doppie. Usa esclusivamente apici singoli (').
      
      Restituisci SOLO un oggetto JSON con questa struttura esatta:
      {
        "description": "testo della spiegazione..."
      }
    `;

    const result = await model.generateContent(prompt);
    let aiText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(aiText);

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