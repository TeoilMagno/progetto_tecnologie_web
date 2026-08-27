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
    const lat = museum.latitude;
    const lon = museum.longitude;
    if (lat && lon) {
      museumCoordsMap[museum._id] = { lat, lon };
    } else {
      console.log("ATTENZIONE: museo senza coordinate\n");
    }
  }

  // Stampiamo le opzioni nel menu a tendina in ordine alfabetico
  renderStyleFilters(Array.from(tagsSet).sort());
}

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
    const coords = await geocodeAddress(locationInput);
    
    if (coords && coords.lat !== null && coords.lon !== null) {
      userCoords = { lat: coords.lat, lon: coords.lon };
    } else {
      alert("Città non trovata o servizio non disponibile! Riprova con un altro nome.");
      return; // Interrompiamo la ricerca
    }
  }

  // B. Filtra l'elenco dei musei
  let filtered = cachedMuseums.filter(museum => {
    const museumPrice = museum.ticketPrice || 0;
    if (freeEntryOnly && museumPrice > 0) {
      return false;
    }
    
    if (!freeEntryOnly && maxPrice < 50 && museumPrice > maxPrice) {
      return false;
    }

    if (selectedStyles.length > 0) {
      if (!museum.tags || !selectedStyles.some(style => museum.tags.includes(style))) return false;
    }

    // Filtro Distanza (Migliorato)
    if (userCoords) { 
      const mCoords = museumCoordsMap[museum._id];
      if (mCoords) {
        const km = getDistanceFromLatLonInKm(userCoords.lat, userCoords.lon, mCoords.lat, mCoords.lon);
        
        // Salviamo la distanza nel museo per usarla dopo per l'ordinamento
        museum.tempDistance = km;

        // Se lo slider NON è al massimo, filtriamo chi è troppo lontano
        if (maxDistance < 500 && km > maxDistance) {
          return false; 
        }
      } else {
        // Se l'utente cerca per zona, tagliamo fuori i musei senza coordinate
        return false; 
      }
    }

    if (selectedServices.length > 0) {
      if (!museum.services || !selectedServices.every(service => museum.services.includes(service))) {
        return false;
      }
    }

    // Filtro Giorno di apertura (Aggiornato per il nuovo modello schedule)
    if (selectedDay && selectedDay !== "") {
      // Se il museo non ha lo schedule, è sicuramente chiuso
      if (!museum.schedule || museum.schedule.length === 0) return false;
      
      // Cerchiamo se il giorno richiesto è presente nell'array.
      // Dato che salviamo solo i giorni aperti, se NON lo trova, il museo è chiuso!
      const dayConfig = museum.schedule.find(s => s.day === selectedDay);
      if (!dayConfig) {
        return false; 
      }
    }

    return true;
  });

  // C. MAGIA: Se abbiamo le coordinate, ordiniamo i risultati dal più vicino!
  if (userCoords) {
    filtered.sort((a, b) => (a.tempDistance || 0) - (b.tempDistance || 0));
  }

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
          item.style.display = "block";
        } else {
          const isMatch = fuzzySearch(query, label);
          item.style.display = isMatch ? "block" : "none";
        }
      });
    });
  }

  const geoBtn = document.getElementById("btn-geolocate");
  if (geoBtn) {
    geoBtn.addEventListener("click", (e) => {
      // FONDAMENTALE: Evita che il bottone causi il ricaricamento della pagina!
      e.preventDefault(); 
      
      geoBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Ricerca...`;
      
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          userCoords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          
          const locInput = document.getElementById("filter-location-input");
          if (locInput) locInput.value = ""; // Svuota l'input di testo
          
          geoBtn.innerHTML = `<i class="bi bi-geo-alt-fill text-success me-1"></i> Posizione GPS Attiva`;
          geoBtn.classList.replace("btn-outline-info", "btn-outline-success");

          // UX TOP: Applica i filtri automaticamente appena il GPS ti trova!
          applyMuseumFilters();
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

// ==========================================
// MODULO FILTRI OPERE (Works)
// ==========================================

// 1. Estrae i dati univoci dalle opere correnti e popola le liste
function initializeWorkFiltersData(works) {
  const authorsSet = new Set();
  const techniquesSet = new Set();
  const stylesSet = new Set();

  works.forEach(work => {
    // ESTRAZIONE BLINDATA: Cerca il nome in tutti i campi possibili, scartando gli ID di Mongoose (24 caratteri)
    const authorName = work.authorName || work.author?.name || (typeof work.author === 'string' && work.author.length !== 24 ? work.author : null);
    const styleName = work.styleName || work.style?.name || (typeof work.style === 'string' && work.style.length !== 24 ? work.style : null);
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
        <input class="form-check-input ${prefix}-cb cursor-pointer" type="checkbox" value="${item}" id="${safeId}" onchange="applyWorkFilters()">
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
    // USIAMO LA STESSA IDENTICA ESTRAZIONE!
    const authorName = work.authorName || work.author?.name || (typeof work.author === 'string' && work.author.length !== 24 ? work.author : "");
    const styleName = work.styleName || work.style?.name || (typeof work.style === 'string' && work.style.length !== 24 ? work.style : "");
    const techniqueName = work.technique || "";

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

// ==========================================
// MODULO FILTRI VISITE GUIDATE (Visits)
// ==========================================

function applyVisitFilters() {
  if (!currentVisits || currentVisits.length === 0) return;

  // 1. Raccogliamo i valori
  const freeEntryOnly = document.getElementById("filter-visit-free")?.checked;
  const maxPrice = parseInt(document.getElementById("visit-price-slider")?.value || 100);
  const maxDuration = parseInt(document.getElementById("visit-duration-slider")?.value || 180);

  const accCbs = Array.from(document.querySelectorAll('.visit-acc-cb:checked')).map(cb => cb.value);
  const targetCbs = Array.from(document.querySelectorAll('.visit-target-cb:checked')).map(cb => cb.value);

  // 2. Filtriamo l'array corrente delle visite
  let filtered = currentVisits.filter(visit => {
    const price = visit.price || 0;
    const duration = visit.duration || 0;

    // A. Filtro Costo
    if (freeEntryOnly && price > 0) return false;
    if (!freeEntryOnly && maxPrice < 100 && price > maxPrice) return false;

    // B. Filtro Durata
    if (maxDuration < 180 && duration > maxDuration) return false;

    // C. Filtro Accessibilità (L'utente spunta di cosa ha bisogno, la visita deve averlo)
    if (accCbs.length > 0) {
      if (!visit.accessibility || !accCbs.some(acc => visit.accessibility.includes(acc))) {
        return false;
      }
    }

    // D. Filtro Pubblico Consigliato
    if (targetCbs.length > 0) {
      // Se la visita è adatta "a tutti" (all), passa il filtro a prescindere
      const isForAll = visit.targetAudience && visit.targetAudience.includes('all');
      const hasSpecificTarget = visit.targetAudience && targetCbs.some(targ => visit.targetAudience.includes(targ));
      
      if (!isForAll && !hasSpecificTarget) {
        return false;
      }
    }

    return true;
  });

  // 3. Renderizziamo i risultati usando la funzione di marketplace.js
  renderVisitsListForMuseum(filtered);
}

function resetVisitFilters() {
  // Reset Costo
  const freeEntry = document.getElementById("filter-visit-free");
  if (freeEntry) freeEntry.checked = false;
  
  const priceSlider = document.getElementById("visit-price-slider");
  if (priceSlider) priceSlider.value = 100;
  
  const priceVal = document.getElementById("visit-price-value");
  if (priceVal) priceVal.innerText = "100+ €";

  // Reset Durata
  const durationSlider = document.getElementById("visit-duration-slider");
  if (durationSlider) durationSlider.value = 180;

  const durationVal = document.getElementById("visit-duration-value");
  if (durationVal) durationVal.innerText = "Qualsiasi";

  // Reset Checkbox Accessibilità e Target
  document.querySelectorAll('.visit-acc-cb').forEach(cb => cb.checked = false);
  document.querySelectorAll('.visit-target-cb').forEach(cb => cb.checked = false);

  // Ricarica la lista completa
  renderVisitsListForMuseum(currentVisits);
}

function attachVisitFilterEvents() {
  // Aggiorna l'etichetta del prezzo mentre si muove lo slider
  const priceSlider = document.getElementById("visit-price-slider");
  if (priceSlider) {
    priceSlider.addEventListener("input", (e) => {
      const val = parseInt(e.target.value);
      const priceLabel = document.getElementById("visit-price-value");
      if (priceLabel) {
        priceLabel.innerText = val >= 100 ? "100+ €" : `${val} €`;
      }
    });
  }

  // Aggiorna l'etichetta della durata mentre si muove lo slider
  const durationSlider = document.getElementById("visit-duration-slider");
  if (durationSlider) {
    durationSlider.addEventListener("input", (e) => {
      const val = parseInt(e.target.value);
      const durationLabel = document.getElementById("visit-duration-value");
      if (durationLabel) {
        durationLabel.innerText = val >= 180 ? "Qualsiasi" : `Fino a ${val} min`;
      }
    });
  }
}

// ==========================================
// MODULO FILTRI LE MIE VISITE (My Visits)
// ==========================================
// ATTENZIONE: questo modulo presuppone che getMyVisits() (in visits-ui.js)
// salvi l'elenco grezzo delle visite in una variabile globale chiamata
// "allMyVisits" e che esista una funzione "renderManagedVisitsList(list)"
// che disegna le card dentro #managed-visits-area. Se in visits-ui.js i nomi
// sono diversi, sostituiscili qui sotto (sono usati in 3 punti in tutto).

let filterMyTypeInstance = null;
let filterMyDateDirInstance = null;
let filterMySearchInstance = null;

function attachMyVisitsFilterEvents() {
  // Inizializza IMask per la data (DD/MM/YYYY)
  const dateInput = document.getElementById("filter-my-date");
  if (dateInput) {
    const dateMask = IMask(dateInput, {
      mask: Date,
      pattern: 'd/`m/`Y',
      lazy: false,
      blocks: {
        d: { mask: IMask.MaskedRange, from: 1, to: 31, maxLength: 2, placeholderChar: 'd' },
        m: { mask: IMask.MaskedRange, from: 1, to: 12, maxLength: 2, placeholderChar: 'm' },
        Y: { mask: IMask.MaskedRange, from: 1900, to: 9999, placeholderChar: 'y' }
      },
      format: date => {
        let day = date.getDate().toString().padStart(2, '0');
        let month = (date.getMonth() + 1).toString().padStart(2, '0');
        let year = date.getFullYear();
        return [day, month, year].join('/');
      },
      parse: str => {
        const parts = str.split('/');
        return new Date(parts[2], parts[1] - 1, parts[0]);
      }
    });

    // Filtra solo quando l'utente ha scritto l'intera data o ha svuotato il campo
    dateMask.on('complete', applyMyVisitsFilters);
    dateMask.on('accept', () => {
      if (dateMask.value === '') applyMyVisitsFilters();
    });
  }

  // Inizializza Tom Select
  if (document.getElementById("filter-my-type")) {
    filterMyTypeInstance = new TomSelect("#filter-my-type", { create: false, controlInput: null, sortField: false, onChange: applyMyVisitsFilters });
  }
  if (document.getElementById("filter-my-date-dir")) {
    filterMyDateDirInstance = new TomSelect("#filter-my-date-dir", { create: false, controlInput: null, sortField: false, onChange: applyMyVisitsFilters });
  }

  // Gestione etichetta interruttore ordinamento
  const sortToggle = document.getElementById("filter-my-sort-toggle");
  const sortLabel = document.getElementById("sort-toggle-label");
  if (sortToggle && sortLabel) {
    sortToggle.addEventListener("change", (e) => {
      sortLabel.innerText = e.target.checked ? "Più recenti prima" : "Meno recenti prima";
      applyMyVisitsFilters();
    });
  }

  // Inizializza Tom Select per la ricerca testuale
  if (document.getElementById("filter-my-search")) {
    // Estrae tutti i titoli e musei dalle visite caricate
    const optionsSet = new Set();
    cachedVisits.forEach(v => {
      if (v.title) optionsSet.add(v.title);
      if (v.museumId && v.museumId.name) optionsSet.add(v.museumId.name);
    });
    
    filterMySearchInstance = new TomSelect("#filter-my-search", {
      options: Array.from(optionsSet).map(opt => ({ value: opt, text: opt })),
      create: true, // Permette di digitare testo libero non in lista
      createOnBlur: true,
      sortField: { field: "text", direction: "asc" },
      onChange: applyMyVisitsFilters
    });
  }
}

function applyMyVisitsFilters() {
  const searchQuery = filterMySearchInstance ? (filterMySearchInstance.getValue() || "").toLowerCase().trim() : "";
  const typeFilter = document.getElementById("filter-my-type")?.value || "all";
  
  // Data target e direzione
  // Data target e direzione
  const dateInput = document.getElementById("filter-my-date")?.value;
  const dateDir = document.getElementById("filter-my-date-dir")?.value || "after";
  
  let targetDate = null;
  if (dateInput && dateInput.length === 10) {
    // Separa GG, MM, AAAA e lo rimonta per farlo digerire a Javascript
    const [d, m, y] = dateInput.split('/');
    targetDate = new Date(`${y}-${m}-${d}T00:00:00`).getTime();
  }

  // Stato toggle
  const sortNewestFirst = document.getElementById("filter-my-sort-toggle")?.checked ?? true;

  let filtered = cachedVisits.filter(visit => {
    if (!visit) return false;

    // 1. Ricerca Fuzzy Search su Titolo o Museo
    if (searchQuery !== "") {
      const titleMatch = fuzzySearch(searchQuery, visit.title || "");
      const museumMatch = fuzzySearch(searchQuery, visit.museumId?.name || "");
      if (!titleMatch && !museumMatch) return false;
    }

    // 2. Filtro Data f
    if (targetDate) {
      const visitDate = new Date(visit.sortDate || visit.updatedAt || visit.createdAt || 0).getTime();
      if (dateDir === "after" && visitDate < targetDate) return false;
      if (dateDir === "before" && visitDate > targetDate) return false;
    }

    // 3. Tipologia
    const creatorId = visit.creator?._id || visit.creator;
    const isPurchased = currentUser && creatorId && (creatorId.toString() !== currentUser._id.toString());

    if (typeFilter === "created" && isPurchased) return false;
    if (typeFilter === "purchased" && !isPurchased) return false;
    if (typeFilter === "drafts" && !visit.isDraft) return false;
    if (typeFilter === "public" && (isPurchased || !visit.isPublic || visit.isDraft)) return false;
    if (typeFilter === "private" && (isPurchased || visit.isPublic || visit.isDraft)) return false;

    return true;
  });

  // 4. Ordinamento da switch
  filtered.sort((a, b) => {
    return sortNewestFirst ? b.sortDate - a.sortDate : a.sortDate - b.sortDate;
  });

  renderVisitsList(filtered, "managed-visits-area");

  // --- AGGIUNTO: Aggiorna dinamicamente le opzioni del search (opzioni rimanenti) ---
  if (filterMySearchInstance) {
    const currentVal = filterMySearchInstance.getValue();
    const newOptions = new Set();
    
    // Raccoglie i nomi solo dalle visite sopravvissute ai filtri
    filtered.forEach(v => {
      if (v.title) newOptions.add(v.title);
      if (v.museumId && v.museumId.name) newOptions.add(v.museumId.name);
    });

    // Aggiorna le opzioni in silenzio per non scatenare un loop infinito
    filterMySearchInstance.clearOptions();
    Array.from(newOptions).forEach(opt => filterMySearchInstance.addOption({ value: opt, text: opt }));
    
    // Mantiene il valore cercato attualmente per non farlo sparire dal box
    if (currentVal && !newOptions.has(currentVal)) {
      filterMySearchInstance.addOption({ value: currentVal, text: currentVal });
    }
    
    filterMySearchInstance.refreshOptions(false);
  }
}

function resetMyVisitsFilters() {
  const dateInput = document.getElementById("filter-my-date");
  const sortToggle = document.getElementById("filter-my-sort-toggle");
  const sortLabel = document.getElementById("sort-toggle-label");

  if (dateInput) dateInput.value = "";
  
  // Resetta i menu a tendina in modo silenzioso (true = silent)
  if (filterMySearchInstance) filterMySearchInstance.setValue("", true);
  if (filterMyTypeInstance) filterMyTypeInstance.setValue("all", true);
  if (filterMyDateDirInstance) filterMyDateDirInstance.setValue("after", true);

  if (sortToggle && sortLabel) {
    sortToggle.checked = true;
    sortLabel.innerText = "Più recenti prima";
  }

  // Ricalcola tutto con i filtri puliti (ripristinerà anche le opzioni della barra di ricerca)
  applyMyVisitsFilters();
}