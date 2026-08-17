// 1. Algoritmo di Levenshtein (calcola il numero di modifiche necessarie per trasformare una parola in un'altra)
function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // Sostituzione
          matrix[i][j - 1] + 1,     // Inserimento
          matrix[i - 1][j] + 1      // Cancellazione
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// 2. Funzione riutilizzabile per confrontare la query testuale con una stringa target (es. nome museo)
function fuzzySearch(query, targetText, maxTypos = 2) {
  query = query.toLowerCase().trim();
  targetText = targetText.toLowerCase().trim();
  
  if (query === "") return true;
  if (targetText.includes(query)) return true; // Se è una sottostringa esatta, passa subito!

  const queryWords = query.split(/\s+/);
  const targetWords = targetText.split(/\s+/);

  // Controlla se ogni parola cercata assomiglia (entro maxTypos errori) a una qualsiasi parola del target
  return queryWords.every(qw => 
    targetWords.some(tw => levenshteinDistance(qw, tw) <= maxTypos)
  );
}

// 3. Gestione dell'interfaccia di ricerca nel Marketplace
document.addEventListener("DOMContentLoaded", () => {
  const searchContainer = document.getElementById("search-container");
  const searchToggleBtn = document.getElementById("search-toggle-btn");
  const searchInput = document.getElementById("museum-search-input");

  if (!searchContainer || !searchToggleBtn || !searchInput) return;

  // Apre e chiude la barra di ricerca
  searchToggleBtn.addEventListener("click", () => {
    searchContainer.classList.toggle("active");
    if (searchContainer.classList.contains("active")) {
      searchInput.focus();
    } else {
      // Se la chiudiamo, resettiamo la ricerca
      searchInput.value = "";
      if (currentMuseumId === null) renderMuseumsList(cachedMuseums);
      else if (currentView === 'works') renderWorksList(currentWorks);
      else if (currentView === 'items') renderItemsList(currentItems);
    }
  });

  // Filtra dinamicamente in base a cosa stiamo guardando!
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value;
    
    if (currentMuseumId === null) {
      // 1. Modalità Home: Ricerca Musei (per nome o città)
      const filteredMuseums = cachedMuseums.filter(museum => 
        fuzzySearch(query, museum.name) || 
        (museum.address && fuzzySearch(query, museum.address))
      );
      renderMuseumsList(filteredMuseums);
      
    } else if (currentView === 'works') {
      // 2. Modalità Museo: Ricerca Opere (per titolo o autore)
      const filteredWorks = currentWorks.filter(work => 
        fuzzySearch(query, work.name) || 
        (work.author && fuzzySearch(query, work.author))
      );
      renderWorksList(filteredWorks);
      
    } else if (currentView === 'items') {
      // 3. Modalità Bookshop: Ricerca Articoli (per nome o descrizione)
      const filteredItems = currentItems.filter(item => 
        fuzzySearch(query, item.name) || 
        (item.description && fuzzySearch(query, item.description))
      );
      renderItemsList(filteredItems);
    }
  });
});