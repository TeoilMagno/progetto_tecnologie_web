document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("filterSidebar");
  if (!sidebar) return; 

  // Inizializza la struttura base della Sidebar dei Filtri
  sidebar.innerHTML = `
    <div class="offcanvas-header border-bottom border-secondary border-opacity-25 mb-3">
      <h5 class="offcanvas-title text-info fw-bold"><i class="bi bi-funnel me-2"></i>Filtri Avanzati</h5>
      <button type="button" class="btn-close btn-close-white custom-close" data-bs-dismiss="offcanvas"></button>
    </div>
    <div class="offcanvas-body flex-column px-0" id="dynamic-filters-container">
      <!-- I filtri verranno iniettati qui dinamicamente in base al contesto -->
    </div>
  `;
});

// Funzione globale chiamata da marketplace.js per popolare i filtri giusti
window.populateFilters = function(context) {
  const container = document.getElementById("dynamic-filters-container");
  if (!container) return;

  let html = '';

  if (context === 'museums') {
      html = `
        <!-- Filtri Musei -->
        <div class="mb-4">
          <label class="form-label text-white small fw-bold">Punto di partenza</label>
          <input type="text" id="filter-location-input" class="form-control glass-input text-white small mb-2" placeholder="Es. Roma, Via Roma 1...">
          <button class="btn btn-sm btn-outline-info w-100 rounded-pill" id="btn-geolocate">
            <i class="bi bi-geo-alt me-1"></i> Usa la mia posizione GPS
          </button>
        </div>

        <div class="mb-4">
          <label class="form-label text-white small fw-bold">Distanza Massima</label>
          <div class="d-flex justify-content-between text-secondary small mb-1">
            <span>0 km</span>
            <span id="distance-value">500+ km</span>
          </div>
          <input type="range" class="form-range custom-range" id="distance-slider" min="5" max="500" step="5" value="500">
        </div>

        <div class="mb-4">
          <label class="form-label text-white small fw-bold mb-2">Stile / Tematica</label>
          <div class="glass-panel p-2 rounded border border-secondary border-opacity-25">
            <!-- Barra di ricerca interna per i tag -->
            <input type="text" id="filter-style-search" class="form-control bg-transparent text-white border-bottom border-secondary border-opacity-25 mb-2 border-top-0 border-start-0 border-end-0 rounded-0 px-1 small shadow-none" placeholder="Cerca stile (es. Classica)...">
            
            <!-- Lista scorrevole delle checkbox -->
            <div id="filter-style-list" class="d-flex flex-column gap-2 pe-1" style="max-height: 140px; overflow-y: auto;">
              <span class="text-secondary small">Caricamento...</span>
            </div>
          </div>
        </div>

        <button class="btn btn-gradient w-100 mt-3" onclick="applyMuseumFilters()" data-bs-dismiss="offcanvas">Applica Filtri</button>
        <button class="btn btn-link text-secondary w-100 mt-2 text-decoration-none small" onclick="resetFilters()">Resetta</button>
      `;
  } else if (context === 'items') {
      html = `
        <!-- Filtri Bookshop (preparazione) -->
        <div class="mb-4 text-secondary small">Filtri bookshop in arrivo...</div>
      `;
  } else if (context === 'works') {
      html = `
        <!-- Filtri Opere (preparazione) -->
        <div class="mb-4 text-secondary small">Filtri opere in arrivo...</div>
      `;
  }

  container.innerHTML = html;

  // Ricollega gli eventi agli slider/bottoni appena creati
  if (context === 'museums' && typeof attachMuseumFilterEvents === 'function') {
      attachMuseumFilterEvents();
  }
};