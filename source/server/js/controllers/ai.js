const { GoogleGenerativeAI } = require("@google/generative-ai");
const Work = require("../models/works")

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
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
    
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
      
      Restituisci SOLO ED ESCLUSIVAMENTE un oggetto JSON valido. Non aggiungere commenti o backtick markdown. 
      La struttura DEVE essere esattamente questa:
      {
        "simple": { "short": "...", "medium": "...", "long": "...", "exhaustive": "..." },
        "medium": { "short": "...", "medium": "...", "long": "...", "exhaustive": "..." },
        "professional": { "short": "...", "medium": "...", "long": "...", "exhaustive": "..." },
        "expert": { "short": "...", "medium": "...", "long": "...", "exhaustive": "..." }
      }
    `;

    const result = await model.generateContent(prompt);
    let aiText = result.response.text();
    
    aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const descriptionsJSON = JSON.parse(aiText);

    // 2. MAGIA: Salviamo direttamente nel Database usando l'ID dell'opera!
    await Work.findByIdAndUpdate(workId, {
      description: descriptionsJSON
    });

    console.log(`✅ [AI SUCCESS] Matrice descrittiva generata e salvata per: ${workName}`);
  } catch (error) {
    console.error(`❌ [AI ERROR] Fallita generazione per l'opera ${workName}:`, error);
    throw error;
  }
};