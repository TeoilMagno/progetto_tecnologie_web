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

        <div class="mb-4">
          <label class="form-label text-white small fw-bold">Prezzo Ingresso Base</label>
          
          <!-- Checkbox Ingresso Gratuito -->
          <div class="form-check mb-2">
            <input class="form-check-input cursor-pointer" type="checkbox" id="filter-free-entry">
            <label class="form-check-label text-white small cursor-pointer" for="filter-free-entry">
              Solo ingresso gratuito
            </label>
          </div>
          
          <!-- Slider Prezzo Massimo -->
          <div class="d-flex justify-content-between text-secondary small mb-1">
            <span>0 €</span>
            <span id="price-value">Qualsiasi</span>
          </div>
          <input type="range" class="form-range custom-range" id="price-slider" min="0" max="50" step="1" value="50">
        </div>

        <!-- Filtro Servizi Offerti -->
        <div class="mb-4">
          <label class="form-label text-white small fw-bold mb-2">Servizi Offerti</label>
          <div class="d-flex flex-column gap-1">
            <div class="form-check">
              <input class="form-check-input service-checkbox cursor-pointer" type="checkbox" value="bathrooms" id="srv-bathrooms">
              <label class="form-check-label text-white small cursor-pointer" for="srv-bathrooms">Bagni</label>
            </div>
            <div class="form-check">
              <input class="form-check-input service-checkbox cursor-pointer" type="checkbox" value="cafe" id="srv-cafe">
              <label class="form-check-label text-white small cursor-pointer" for="srv-cafe">Caffetteria / Bar</label>
            </div>
            <div class="form-check">
              <input class="form-check-input service-checkbox cursor-pointer" type="checkbox" value="cloakroom" id="srv-cloakroom">
              <label class="form-check-label text-white small cursor-pointer" for="srv-cloakroom">Guardaroba</label>
            </div>
            <div class="form-check">
              <input class="form-check-input service-checkbox cursor-pointer" type="checkbox" value="accessibility_ramp" id="srv-ramp">
              <label class="form-check-label text-white small cursor-pointer" for="srv-ramp">Accessibilità (Rampa)</label>
            </div>
            <div class="form-check">
              <input class="form-check-input service-checkbox cursor-pointer" type="checkbox" value="wifi" id="srv-wifi">
              <label class="form-check-label text-white small cursor-pointer" for="srv-wifi">Wi-Fi</label>
            </div>
          </div>
        </div>

        <!-- Filtro Giorni di Apertura -->
        <div class="mb-4">
          <label class="form-label text-white small fw-bold mb-2">Aperto il giorno</label>
          <select id="filter-day-select" class="form-select glass-input text-white small">
            <option value="">Qualsiasi giorno</option>
            <option value="monday">Lunedì</option>
            <option value="tuesday">Martedì</option>
            <option value="wednesday">Mercoledì</option>
            <option value="thursday">Giovedì</option>
            <option value="friday">Venerdì</option>
            <option value="saturday">Sabato</option>
            <option value="sunday">Domenica</option>
          </select>
        </div>

        <button class="btn btn-gradient w-100 mt-3" onclick="applyMuseumFilters()" data-bs-dismiss="offcanvas">Applica Filtri</button>
        <button class="btn btn-link text-secondary w-100 mt-2 text-decoration-none small" onclick="resetFilters()">Resetta</button>
      `;
  } else if (context === 'items') {
      html = `
        <!-- Filtri Bookshop -->
        <div class="mb-4">
          <label class="form-label text-white small fw-bold mb-2">Categoria Prodotto</label>
          <div class="d-flex flex-column gap-1">
            <div class="form-check">
              <input class="form-check-input item-category-checkbox cursor-pointer" type="checkbox" value="book" id="cat-book">
              <label class="form-check-label text-white small cursor-pointer" for="cat-book">Libri e Guide</label>
            </div>
            <div class="form-check">
              <input class="form-check-input item-category-checkbox cursor-pointer" type="checkbox" value="gadget" id="cat-gadget">
              <label class="form-check-label text-white small cursor-pointer" for="cat-gadget">Gadget e Souvenir</label>
            </div>
            <div class="form-check">
              <input class="form-check-input item-category-checkbox cursor-pointer" type="checkbox" value="clothing" id="cat-clothing">
              <label class="form-check-label text-white small cursor-pointer" for="cat-clothing">Abbigliamento</label>
            </div>
            <div class="form-check">
              <input class="form-check-input item-category-checkbox cursor-pointer" type="checkbox" value="jewelry" id="cat-jewelry">
              <label class="form-check-label text-white small cursor-pointer" for="cat-jewelry">Gioielli / Bigiotteria</label>
            </div>
            <div class="form-check">
              <input class="form-check-input item-category-checkbox cursor-pointer" type="checkbox" value="stationery" id="cat-stationery">
              <label class="form-check-label text-white small cursor-pointer" for="cat-stationery">Cancelleria</label>
            </div>
          </div>
        </div>

        <div class="mb-4">
          <label class="form-label text-white small fw-bold mb-2">Fascia d'età ideale</label>
          <select id="filter-age-select" class="form-select glass-input text-white small">
            <option value="">Per tutti</option>
            <option value="0-3">0-3 anni</option>
            <option value="4-7">4-7 anni</option>
            <option value="8-12">8-12 anni</option>
            <option value="teens">Adolescenti</option>
            <option value="adults">Adulti</option>
          </select>
        </div>

        <div class="mb-4">
          <label class="form-label text-white small fw-bold">Prezzo Massimo</label>
          <div class="d-flex justify-content-between text-secondary small mb-1">
            <span>0 €</span>
            <span id="item-price-value">100+ €</span>
          </div>
          <input type="range" class="form-range custom-range" id="item-price-slider" min="5" max="100" step="5" value="100">
        </div>

        <button class="btn btn-gradient w-100 mt-3" onclick="applyItemFilters()" data-bs-dismiss="offcanvas">Applica Filtri</button>
        <button class="btn btn-link text-secondary w-100 mt-2 text-decoration-none small" onclick="resetItemFilters()">Resetta</button>
      `;
  } else if (context === 'works') {
      html = `
        <!-- Filtri Opere -->
        <div class="mb-4">
          <label class="form-label text-white small fw-bold mb-2">Autore</label>
          <div class="glass-panel p-2 rounded border border-secondary border-opacity-25">
            <input type="text" id="filter-author-search" class="form-control bg-transparent text-white border-bottom border-secondary border-opacity-25 mb-2 border-top-0 border-start-0 border-end-0 rounded-0 px-1 small shadow-none" placeholder="Cerca autore...">
            <div id="filter-author-list" class="d-flex flex-column gap-2 pe-1" style="max-height: 120px; overflow-y: auto;">
              <span class="text-secondary small">Caricamento...</span>
            </div>
          </div>
        </div>

        <div class="mb-4">
          <label class="form-label text-white small fw-bold mb-2">Tecnica</label>
          <div class="glass-panel p-2 rounded border border-secondary border-opacity-25">
            <input type="text" id="filter-technique-search" class="form-control bg-transparent text-white border-bottom border-secondary border-opacity-25 mb-2 border-top-0 border-start-0 border-end-0 rounded-0 px-1 small shadow-none" placeholder="Cerca tecnica...">
            <div id="filter-technique-list" class="d-flex flex-column gap-2 pe-1" style="max-height: 120px; overflow-y: auto;">
              <span class="text-secondary small">Caricamento...</span>
            </div>
          </div>
        </div>

        <div class="mb-4">
          <label class="form-label text-white small fw-bold mb-2">Stile / Movimento</label>
          <div class="glass-panel p-2 rounded border border-secondary border-opacity-25">
            <input type="text" id="filter-workstyle-search" class="form-control bg-transparent text-white border-bottom border-secondary border-opacity-25 mb-2 border-top-0 border-start-0 border-end-0 rounded-0 px-1 small shadow-none" placeholder="Cerca stile...">
            <div id="filter-workstyle-list" class="d-flex flex-column gap-2 pe-1" style="max-height: 120px; overflow-y: auto;">
              <span class="text-secondary small">Caricamento...</span>
            </div>
          </div>
        </div>

        <button class="btn btn-gradient w-100 mt-3" onclick="applyWorkFilters()" data-bs-dismiss="offcanvas">Applica Filtri</button>
        <button class="btn btn-link text-secondary w-100 mt-2 text-decoration-none small" onclick="resetWorkFilters()">Resetta</button>
      `;
  } else if(context === 'visits') {
    html = `
      <div class="filter-section mb-4">
        <h6 class="text-uppercase text-secondary small fw-bold mb-3">Prezzo</h6>
        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" id="filter-visit-free" onchange="applyVisitFilters()">
          <label class="form-check-label text-white small" for="filter-visit-free">Solo gratuite</label>
        </div>
        <label class="form-label text-white small mb-1">Prezzo massimo: <span id="visit-price-value" class="text-info fw-bold">100+ €</span></label>
        <input type="range" class="form-range custom-range" id="visit-price-slider" min="0" max="100" step="5" value="100" onchange="applyVisitFilters()">
      </div>

      <div class="filter-section mb-4">
        <h6 class="text-uppercase text-secondary small fw-bold mb-3">Durata del Tour</h6>
        <label class="form-label text-white small mb-1"><span id="visit-duration-value" class="text-info fw-bold">Qualsiasi</span></label>
        <input type="range" class="form-range custom-range" id="visit-duration-slider" min="15" max="180" step="15" value="180" onchange="applyVisitFilters()">
      </div>

      <div class="filter-section mb-4">
        <h6 class="text-uppercase text-secondary small fw-bold mb-3">Accessibilità</h6>
        <div class="form-check mb-2">
          <input class="form-check-input visit-acc-cb" type="checkbox" id="v-acc-wheel" value="wheelchair_accessible" onchange="applyVisitFilters()">
          <label class="form-check-label text-white small" for="v-acc-wheel">Sedia a Rotelle</label>
        </div>
        <div class="form-check mb-2">
          <input class="form-check-input visit-acc-cb" type="checkbox" id="v-acc-blind" value="blind_friendly" onchange="applyVisitFilters()">
          <label class="form-check-label text-white small" for="v-acc-blind">Ipovedenti (Audio)</label>
        </div>
        <div class="form-check mb-2">
          <input class="form-check-input visit-acc-cb" type="checkbox" id="v-acc-deaf" value="deaf_friendly" onchange="applyVisitFilters()">
          <label class="form-check-label text-white small" for="v-acc-deaf">Sordi (Testo/LIS)</label>
        </div>
        <div class="form-check mb-2">
          <input class="form-check-input visit-acc-cb" type="checkbox" id="v-acc-dsa" value="dsa_friendly" onchange="applyVisitFilters()">
          <label class="form-check-label text-white small" for="v-acc-dsa">DSA Friendly (Testi Semplificati)</label>
        </div>
        <div class="form-check mb-2">
          <input class="form-check-input visit-acc-cb" type="checkbox" id="v-acc-sensory" value="sensory_friendly" onchange="applyVisitFilters()">
          <label class="form-check-label text-white small" for="v-acc-sensory">Sensory Friendly (Ambiente Calmo)</label>
        </div>
      </div>

      <div class="filter-section mb-4">
        <h6 class="text-uppercase text-secondary small fw-bold mb-3">Pubblico Consigliato</h6>
        <div class="form-check mb-2">
          <input class="form-check-input visit-target-cb" type="checkbox" id="v-targ-kids" value="kids" onchange="applyVisitFilters()">
          <label class="form-check-label text-white small" for="v-targ-kids">Bambini</label>
        </div>
        <div class="form-check mb-2">
          <input class="form-check-input visit-target-cb" type="checkbox" id="v-targ-fam" value="families" onchange="applyVisitFilters()">
          <label class="form-check-label text-white small" for="v-targ-fam">Famiglie</label>
        </div>
        <div class="form-check mb-2">
          <input class="form-check-input visit-target-cb" type="checkbox" id="v-targ-adults" value="adults" onchange="applyVisitFilters()">
          <label class="form-check-label text-white small" for="v-targ-adults">Adulti</label>
        </div>
        <div class="form-check mb-2">
          <input class="form-check-input visit-target-cb" type="checkbox" id="v-targ-schools" value="schools" onchange="applyVisitFilters()">
          <label class="form-check-label text-white small" for="v-targ-schools">Scuole</label>
        </div>
      </div>

      <button class="btn btn-outline-secondary w-100 mt-2" onclick="resetVisitFilters()">
        <i class="bi bi-arrow-counterclockwise me-1"></i> Resetta Filtri
      </button>
  `}

  container.innerHTML = html;

  // Ricollega gli eventi agli slider/bottoni appena creati
  if (context === 'museums') attachMuseumFilterEvents();
  else if (context === 'items' ) attachItemFilterEvents();
  else if(context === 'works') attachWorkFilterEvents();
};