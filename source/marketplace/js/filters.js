// ==========================================
// MODULO FILTRI AVANZATI (Booking Style)
// ==========================================

let userCoords = null;
let museumCoordsMap = {}; // Cache coordinate: { "museumId": {lat, lon} }

// 1. Inizializza i dati in background appena i musei sono caricati
async function initializeFiltersData(museums) {
  const tagsSet = new Set();

  for (const museum of museums) {
    // A. Raccogliamo tutti gli stili/tag univoci
    if (museum.tags) museum.tags.forEach(t => tagsSet.add(t));

    // B. Geocoding dell'indirizzo (Simulato/Esterno) in background
    if (museum.address && !museumCoordsMap[museum._id]) {
      try {
        const query = encodeURIComponent(museum.address);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
        const data = await res.json();
        if (data.length > 0) {
          museumCoordsMap[museum._id] = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        }
      } catch (e) { console.warn("Geocoding fallito per:", museum.address); }
    }
  }

  // Stampiamo le opzioni nel menu a tendina in ordine alfabetico
  renderStyleFilters(Array.from(tagsSet).sort());
}

// 2. Disegna le opzioni per gli stili nel tag <select>
// 2. Disegna le opzioni per gli stili come Checkbox
function renderStyleFilters(tags) {
  const list = document.getElementById("filter-style-list");
  if (!list) return;

  if (tags.length === 0) {
    list.innerHTML = `<span class="text-secondary small">Nessuno stile disponibile</span>`;
    return;
  }

  list.innerHTML = tags.map(tag => {
    // Creiamo un ID sicuro per l'HTML (senza spazi)
    const safeId = "style-" + tag.replace(/[^a-zA-Z0-9]/g, '-');
    return `
      <div class="form-check style-item">
        <input class="form-check-input style-checkbox cursor-pointer" type="checkbox" value="${tag}" id="${safeId}">
        <label class="form-check-label text-white small w-100 cursor-pointer" for="${safeId}">
          ${tag}
        </label>
      </div>
    `;
  }).join('');
}

// 3. APPLICA I FILTRI (Resa Async per supportare la ricerca della città)
async function applyMuseumFilters() {
  if (currentMuseumId !== null) return; 

  const locationInput = document.getElementById("filter-location-input")?.value.trim();
  const maxDistance = parseInt(document.getElementById("distance-slider")?.value || 500);
  const styleCheckboxes = document.querySelectorAll('.style-checkbox:checked');
  const selectedStyles = Array.from(styleCheckboxes).map(cb => cb.value);
  const freeEntryOnly = document.getElementById("filter-free-entry")?.checked;
  const maxPrice = parseInt(document.getElementById("price-slider")?.value || 50);
  const serviceCheckboxes = document.querySelectorAll('.service-checkbox:checked');
  const selectedServices = Array.from(serviceCheckboxes).map(cb => cb.value);
  const selectedDay = document.getElementById("filter-day-select")?.value;

  // A. Calcola le coordinate se l'utente ha scritto una città manualmente
  if (locationInput) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationInput)}`);
      const data = await res.json();
      if (data.length > 0) {
        userCoords = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      } else {
        alert("Città non trovata! Riprova con un altro nome.");
        return;
      }
    } catch (e) {
      alert("Errore nel servizio di localizzazione.");
      return;
    }
  }

  // B. Filtra l'elenco dei musei
  let filtered = cachedMuseums.filter(museum => {
    const museumPrice = museum.ticketPrice || 0;
    if (freeEntryOnly && museumPrice > 0) {
      return false;
    }
    
    // Se lo slider non è al massimo (50), filtriamo per prezzo massimo
    if (!freeEntryOnly && maxPrice < 50 && museumPrice > maxPrice) {
      return false;
    }

    // Filtro Stile (il museo deve avere ALMENO UNO degli stili selezionati)
    if (selectedStyles.length > 0) {
      if (!museum.tags || !selectedStyles.some(style => museum.tags.includes(style))) return false;
    }

    // Filtro Distanza
    if (userCoords && maxDistance < 500) {
      const mCoords = museumCoordsMap[museum._id];
      if (mCoords) {
        const km = getDistanceFromLatLonInKm(userCoords.lat, userCoords.lon, mCoords.lat, mCoords.lon);
        if (km > maxDistance) return false;
      } else {
        return false; // Se non abbiamo le coordinate del museo, lo escludiamo dalla ricerca per distanza
      }
    }

    // Filtro Servizi: il museo deve avere TUTTI i servizi selezionati dall'utente
    if (selectedServices.length > 0) {
      if (!museum.services || !selectedServices.every(service => museum.services.includes(service))) {
        return false;
      }
    }

    // Filtro Giorni: il museo deve essere aperto nel giorno selezionato
    if (selectedDay && selectedDay !== "") {
      if (!museum.openingDays || !museum.openingDays.includes(selectedDay)) {
        return false;
      }
    }

    return true;
  });

  renderMuseumsList(filtered);
}

function resetFilters() {
  userCoords = null;
  const distSlider = document.getElementById("distance-slider");
  if (distSlider) distSlider.value = 500;
  
  const distVal = document.getElementById("distance-value");
  if (distVal) distVal.innerText = "500+ km";
  
  const locInput = document.getElementById("filter-location-input");
  if (locInput) locInput.value = "";
  
  const styleSelect = document.getElementById("filter-style-select");
  if (styleSelect) styleSelect.value = "";
  
  const geoBtn = document.getElementById("btn-geolocate");
  if (geoBtn) {
    geoBtn.innerHTML = `<i class="bi bi-geo-alt me-1"></i> Usa la mia posizione GPS`;
    geoBtn.classList.replace("btn-outline-success", "btn-outline-info");
  }

  // Resetta la ricerca e le checkbox degli stili
  const styleSearch = document.getElementById("filter-style-search");
  if (styleSearch) styleSearch.value = "";
  
  document.querySelectorAll('.style-checkbox').forEach(cb => cb.checked = false);
  document.querySelectorAll('.style-item').forEach(item => item.style.display = "block");

  // Reset Prezzo
  const freeEntry = document.getElementById("filter-free-entry");
  if (freeEntry) freeEntry.checked = false;
  
  const priceSlider = document.getElementById("price-slider");
  if (priceSlider) priceSlider.value = 50;
  
  const priceVal = document.getElementById("price-value");
  if (priceVal) priceVal.innerText = "Qualsiasi";

  // Reset Servizi
  document.querySelectorAll('.service-checkbox').forEach(cb => cb.checked = false);
  
  // Reset Giorno di apertura
  const daySelect = document.getElementById("filter-day-select");
  if (daySelect) daySelect.value = "";

  renderMuseumsList(cachedMuseums);
}

// Formula matematica (Haversine) per calcolare i km
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = (lat2-lat1) * (Math.PI/180);
  const dLon = (lon2-lon1) * (Math.PI/180);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1*(Math.PI/180)) * Math.cos(lat2*(Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

// Collega gli eventi 
function attachMuseumFilterEvents() {
  // 3. Ricerca interna tra le checkbox degli stili
  const styleSearch = document.getElementById("filter-style-search");
  if (styleSearch) {
    styleSearch.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase().trim();
      const styleItems = document.querySelectorAll('.style-item');
      
      styleItems.forEach(item => {
        const label = item.querySelector('label').innerText.toLowerCase();
        
        if (query === "") {
          item.style.display = "block"; // Se la barra è vuota, mostra tutti
        } else {
          // Usa la fuzzySearch che abbiamo in search-bar.js
          const isMatch = fuzzySearch(query, label);
          item.style.display = isMatch ? "block" : "none";
        }
      });
    });
  }

  const geoBtn = document.getElementById("btn-geolocate");
  if (geoBtn) {
    geoBtn.addEventListener("click", () => {
      geoBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Ricerca...`;
      
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          userCoords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          // Svuota l'input testuale se usa il GPS
          const locInput = document.getElementById("filter-location-input");
          if (locInput) locInput.value = "";
          
          geoBtn.innerHTML = `<i class="bi bi-geo-alt-fill text-success me-1"></i> Posizione GPS Attiva`;
          geoBtn.classList.replace("btn-outline-info", "btn-outline-success");
        },
        (err) => {
          alert("Impossibile recuperare la posizione. Controlla i permessi del tuo browser.");
          geoBtn.innerHTML = `<i class="bi bi-geo-alt me-1"></i> Usa la mia posizione GPS`;
        }
      );
    });
  }

  // slider della distanza
  const distanceSlider = document.getElementById("distance-slider");
  if (distanceSlider) {
    distanceSlider.addEventListener("input", (e) => {
      const val = parseInt(e.target.value);
      const distanceLabel = document.getElementById("distance-value");
      if (distanceLabel) {
        distanceLabel.innerText = val >= 500 ? "500+ km" : `${val} km`;
      }
    });
  }

  // slider del prezzo
  const priceSlider = document.getElementById("price-slider");
  if (priceSlider) {
    priceSlider.addEventListener("input", (e) => {
      const val = parseInt(e.target.value);
      const priceLabel = document.getElementById("price-value");
      if (priceLabel) {
        priceLabel.innerText = val >= 50 ? "Qualsiasi" : `${val} €`;
      }
    });
  }
}

// ==========================================
// MODULO FILTRI BOOKSHOP (Items)
// ==========================================

function applyItemFilters() {
  // 1. Raccogliamo i valori scelti dall'utente
  const categoryCheckboxes = document.querySelectorAll('.item-category-checkbox:checked');
  const selectedCategories = Array.from(categoryCheckboxes).map(cb => cb.value);
  
  const selectedAge = document.getElementById("filter-age-select")?.value;
  const maxPrice = parseInt(document.getElementById("item-price-slider")?.value || 100);

  // 2. Filtriamo l'array corrente degli articoli
  let filtered = currentItems.filter(item => {
    
    // A. Filtro Categoria (l'item deve appartenere a una delle categorie spuntate)
    if (selectedCategories.length > 0) {
      if (!item.category || !selectedCategories.includes(item.category)) {
        return false;
      }
    }

    // B. Filtro Età target (Gestione intelligente)
    // Se l'utente cerca "4-7", mostriamo i prodotti specifici per "4-7" e quelli "all" (adatti a tutti)
    if (selectedAge && selectedAge !== "") {
      if (!item.targetAge || (!item.targetAge.includes(selectedAge) && !item.targetAge.includes('all'))) {
        return false;
      }
    }

    // C. Filtro Prezzo Massimo
    if (maxPrice < 100 && item.price > maxPrice) {
      return false;
    }

    return true;
  });

  // 3. Renderizziamo i risultati
  renderItemsList(filtered);
}

function resetItemFilters() {
  // Resetta le checkbox delle categorie
  document.querySelectorAll('.item-category-checkbox').forEach(cb => cb.checked = false);
  
  // Resetta la tendina dell'età
  const ageSelect = document.getElementById("filter-age-select");
  if (ageSelect) ageSelect.value = "";
  
  // Resetta lo slider del prezzo
  const priceSlider = document.getElementById("item-price-slider");
  if (priceSlider) priceSlider.value = 100;
  
  const priceVal = document.getElementById("item-price-value");
  if (priceVal) priceVal.innerText = "100+ €";

  // Ricarica la lista completa
  renderItemsList(currentItems);
}

function attachItemFilterEvents() {
  // Aggiorna dinamicamente l'etichetta del prezzo mentre si muove lo slider
  const priceSlider = document.getElementById("item-price-slider");
  if (priceSlider) {
    priceSlider.addEventListener("input", (e) => {
      const val = parseInt(e.target.value);
      const priceLabel = document.getElementById("item-price-value");
      if (priceLabel) {
        priceLabel.innerText = val >= 100 ? "100+ €" : `${val} €`;
      }
    });
  }
}

// TODO: i filtri sono ancora da testare dato che nel db gli elementi non hanno il modello appropriato
// TODO: come prime osservazioni author e style quasi sicuramente non andranno dato che nel modello ci sono solo riferimenti a modelli author
// ==========================================
// MODULO FILTRI OPERE (Works)
// ==========================================

// 1. Estrae i dati univoci dalle opere correnti e popola le liste
function initializeWorkFiltersData(works) {
  const authorsSet = new Set();
  const techniquesSet = new Set();
  const stylesSet = new Set();

  works.forEach(work => {
    // Gestione sicura nel caso in cui author e style siano popolati (oggetti) o semplici stringhe
    const authorName = typeof work.author === 'string' ? work.author : work.author?.name;
    const styleName = typeof work.style === 'string' ? work.style : work.style?.name;
    const techniqueName = work.technique;

    if (authorName) authorsSet.add(authorName);
    if (techniqueName) techniquesSet.add(techniqueName);
    if (styleName) stylesSet.add(styleName);
  });

  renderDynamicCheckboxes("filter-author-list", Array.from(authorsSet).sort(), "author");
  renderDynamicCheckboxes("filter-technique-list", Array.from(techniquesSet).sort(), "technique");
  renderDynamicCheckboxes("filter-workstyle-list", Array.from(stylesSet).sort(), "workstyle");
}

// Funzione Helper per stampare le checkbox dinamicamente
function renderDynamicCheckboxes(containerId, items, prefix) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `<span class="text-secondary small">Nessun dato disponibile</span>`;
    return;
  }

  container.innerHTML = items.map(item => {
    const safeId = `${prefix}-${item.replace(/[^a-zA-Z0-9]/g, '-')}`;
    return `
      <div class="form-check ${prefix}-item">
        <input class="form-check-input ${prefix}-cb cursor-pointer" type="checkbox" value="${item}" id="${safeId}">
        <label class="form-check-label text-white small w-100 cursor-pointer text-truncate" for="${safeId}" title="${item}">
          ${item}
        </label>
      </div>
    `;
  }).join('');
}

// 2. Applica i filtri controllando le checkbox spuntate
function applyWorkFilters() {
  const authorCbs = Array.from(document.querySelectorAll('.author-cb:checked')).map(cb => cb.value);
  const techniqueCbs = Array.from(document.querySelectorAll('.technique-cb:checked')).map(cb => cb.value);
  const styleCbs = Array.from(document.querySelectorAll('.workstyle-cb:checked')).map(cb => cb.value);

  let filtered = currentWorks.filter(work => {
    const authorName = typeof work.author === 'string' ? work.author : work.author?.name || "";
    const techniqueName = work.technique || "";
    const styleName = typeof work.style === 'string' ? work.style : work.style?.name || "";

    if (authorCbs.length > 0 && !authorCbs.includes(authorName)) return false;
    if (techniqueCbs.length > 0 && !techniqueCbs.includes(techniqueName)) return false;
    if (styleCbs.length > 0 && !styleCbs.includes(styleName)) return false;

    return true;
  });

  renderWorksList(filtered);
}

// 3. Resetta filtri e input di ricerca
function resetWorkFilters() {
  ['author', 'technique', 'workstyle'].forEach(prefix => {
    // Svuota ricerca
    const searchInput = document.getElementById(`filter-${prefix}-search`);
    if (searchInput) searchInput.value = "";
    // Deseleziona checkbox e mostra tutti
    document.querySelectorAll(`.${prefix}-cb`).forEach(cb => cb.checked = false);
    document.querySelectorAll(`.${prefix}-item`).forEach(item => item.style.display = "block");
  });

  renderWorksList(currentWorks);
}

// 4. Associa le funzioni di ricerca (fuzzy search) ai 3 campi di input
function attachWorkFilterEvents() {
  const categories = ['author', 'technique', 'workstyle'];

  categories.forEach(prefix => {
    const searchInput = document.getElementById(`filter-${prefix}-search`);
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        const items = document.querySelectorAll(`.${prefix}-item`);
        
        items.forEach(item => {
          const label = item.querySelector('label').innerText.toLowerCase();
          if (query === "") {
            item.style.display = "block";
          } else {
            // Assicurati che fuzzySearch sia accessibile a livello globale (da search-bar.js)
            const isMatch = typeof fuzzySearch === 'function' ? fuzzySearch(query, label) : label.includes(query);
            item.style.display = isMatch ? "block" : "none";
          }
        });
      });
    }
  });
}