class SearchBar extends HTMLElement {
  connectedCallback() {
    // Inietta l'HTML
    this.innerHTML = `
      <div class="search-container me-2 position-relative d-flex align-items-center" id="search-container">
        <input type="text" id="museum-search-input" class="search-input form-control bg-transparent text-white border-0" placeholder="Cerca...">
        <button class="btn text-white" id="search-toggle-btn">
          <i class="bi bi-search fs-5"></i>
        </button>
      </div>
    `;

    // Carica autonomamente la sua dipendenza CSS se non è già presente
    if (!document.getElementById('search-bar-style')) {
      const link = document.createElement('link');
      link.id = 'search-bar-style';
      link.rel = 'stylesheet';
      link.href = '/marketplace/css/search-bar.css';
      document.head.appendChild(link);
    }

    this.setupEvents();
  }

  setupEvents() {
    const container = this.querySelector('#search-container');
    const toggleBtn = this.querySelector('#search-toggle-btn');
    const input = this.querySelector('#museum-search-input');

    toggleBtn.addEventListener('click', () => {
      container.classList.toggle('active');
      if (container.classList.contains('active')) {
        input.focus();
      } else {
        input.value = '';
        // Emette evento di reset
        this.dispatchEvent(new CustomEvent('search-cleared', { bubbles: true }));
      }
    });

    input.addEventListener('input', (e) => {
      // Emette evento con il valore cercato
      this.dispatchEvent(new CustomEvent('search-input', {
        detail: { query: e.target.value },
        bubbles: true
      }));
    });
  }
}
customElements.define('search-bar', SearchBar);

// Esportiamo le funzioni di utilità che prima erano qui dentro per renderle globali (o spostale in un utils.js)
window.levenshteinDistance = function(a, b) { 
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
};

window.fuzzySearch = function(query, targetText, maxTypos = 2) { 
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
};