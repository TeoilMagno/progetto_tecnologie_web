// Tempi di spostamento e osservazione (in minuti)
const WALK_SAME_SECTION = 30 / 60; // 30 secondi tra opere nella stessa stanza
const WALK_DIFF_SECTION = 2;       // 2 minuti tra opere in stanze diverse o per la prima opera
const OBSERVATION_TIME = 0.5;   // 30 secondi forfettari dedicati solo a guardare l'opera prima/dopo aver letto

// Stima dei minuti necessari per leggere/ascoltare le descrizioni (I tuoi valori IA)
const READING_TIMES = {
  short: 3 / 60,       // 3 secondi
  medium: 15 / 60,     // 15 secondi
  long: 1,             // 1 minuto
  exhaustive: 4        // 4 minuti
};

/**
 * 1. Calcola la durata totale stimata della visita
 * @param {Array} worksArray - Array di opere ordinate (devono contenere il campo sectionId)
 * @param {String} preferredLength - 'short', 'medium', 'long', 'exhaustive'
 */
exports.calculateVisitDuration = (worksArray, preferredLength = 'medium') => {
  if (!worksArray || worksArray.length === 0) return 0;

  const readTime = READING_TIMES[preferredLength] || READING_TIMES.medium;
  let totalMinutes = 0;

  for (let i = 0; i < worksArray.length; i++) {
    // 1. Tempo per osservare l'opera e leggerne la descrizione
    totalMinutes += OBSERVATION_TIME + readTime;

    // 2. Tempo di cammino per arrivare a quest'opera
    if (i === 0) {
      // Per la prima opera calcoliamo l'ingresso nel museo/stanza
      totalMinutes += WALK_DIFF_SECTION; 
    } else {
      // Confrontiamo la sezione attuale con quella dell'opera precedente
      const currentSectionId = worksArray[i].sectionId?.toString();
      const previousSectionId = worksArray[i - 1].sectionId?.toString();

      if (currentSectionId && previousSectionId && currentSectionId === previousSectionId) {
        totalMinutes += WALK_SAME_SECTION;
      } else {
        totalMinutes += WALK_DIFF_SECTION;
      }
    }
  }
  
  // Arrotondiamo per eccesso per la stima finale
  return Math.ceil(totalMinutes); 
};

// TODO: se c'e' tempo (improbabile) si possono fare chiamate api per capire quali opere meritino di piu' e quali invece possono avere una descrizinoe sommaria
/**
 * 2. Suggerisce la lunghezza della descrizione in base al tempo a disposizione
 * (In questo caso usiamo una media ponderata forfettaria per il tempo di cammino, 
 * es. 1 minuto medio, perché l'utente sta solo filtrando a monte)
 */
exports.recommendLengthForTime = (worksCount, availableMinutes) => {
  if (!worksCount || worksCount === 0) return 'medium';

  const AVERAGE_WALK = 1; // Media forfettaria per il calcolo inverso
  const totalWalkingAndObservingTime = worksCount * (AVERAGE_WALK + OBSERVATION_TIME);
  const timeLeftForReading = availableMinutes - totalWalkingAndObservingTime;

  if (timeLeftForReading <= 0) return 'short';

  const readTimePerWork = timeLeftForReading / worksCount;

  if (readTimePerWork >= READING_TIMES.exhaustive) return 'exhaustive';
  if (readTimePerWork >= READING_TIMES.long) return 'long';
  if (readTimePerWork >= READING_TIMES.medium) return 'medium';
  
  return 'short';
};