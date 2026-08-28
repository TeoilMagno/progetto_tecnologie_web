// le varie variabili globali sono in config.js

// Unico nodo sentinella condiviso per qualsiasi scroll infinito
const globalSentinel = document.createElement("div");
globalSentinel.id = "global-infinite-sentinel";
globalSentinel.className = "col-12 text-center py-4 d-none w-100";
globalSentinel.innerHTML = `
  <div class="spinner-border text-light spinner-border-sm" role="status"></div>
  <p class="text-secondary small mt-1">Caricamento altri elementi...</p>
`;

// 1. INIZIALIZZAZIONE
document.addEventListener("DOMContentLoaded", async () => {
  // Gestione del tasto indietro del browser
  window.addEventListener('popstate', (event) => {
    // Se torniamo alla home (stato nullo o senza view definita)
    if (!event.state || !event.state.view || event.state.view === 'home') {
      getMuseums(true);
      return;
    }

    // Se stiamo tornando dentro a un museo specifico
    if (event.state.view === 'museum') {
      getMuseumItems(event.state.id, true);
    }
  });

  // Carica utente dal server (Passport) e poi carica i musei
  await fetchCurrentUser();
  
  const urlParams = new URLSearchParams(window.location.search);
  const museumToOpen = urlParams.get("museumId");

  if (museumToOpen && document.getElementById("content-area")) {
    // Se ci hanno passato un ID e siamo nella home, prima carichiamo i dati...
    await getMuseums();
    // ...poi apriamo il museo!
    getMuseumItems(museumToOpen);
  } else {
    // Comportamento normale
    getMuseums();
  }
});

function setupInfiniteScroll() {
  const sentinel = document.getElementById("global-infinite-sentinel");
  if (!sentinel) return;

  if (museumObserver) museumObserver.disconnect();

  museumObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
       if (renderedMuseumsCount < cachedMuseums.length) {
          const nextChunk = cachedMuseums.slice(renderedMuseumsCount, renderedMuseumsCount + RENDER_CHUNK);
          renderedMuseumsCount += nextChunk.length;
          renderMuseumsList(nextChunk, "content-area", true);
          updateSentinelVisibility();
       } else if (!isFetchingMuseums && currentMuseumPage < totalMuseumPages) {
          currentMuseumPage++;
          applyMuseumFilters(true); 
       }
    }
  }, { rootMargin: '100px' });
  museumObserver.observe(sentinel);
}

function updateSentinelVisibility() {
  const sentinel = document.getElementById("global-infinite-sentinel");
  if (!sentinel) return;
  
  // Mostra la sentinella SE c'è ancora qualcosa da disegnare (in cache) O da scaricare (dal server)
  if (renderedMuseumsCount < cachedMuseums.length || currentMuseumPage < totalMuseumPages) {
    sentinel.classList.remove("d-none");
  } else {
    sentinel.classList.add("d-none");
  }
}

// 3. LOGICA API (FETCH)

async function getMuseums(isHistoryPop = false) {
  const container = document.getElementById("content-area");
  if (!container) return;

  container.appendChild(globalSentinel);

  const title = document.getElementById("page-title");
  const backBtn = document.getElementById("back-btn");
  currentMuseumId = null;

  if (backBtn) backBtn.classList.add("d-none");
  if (title) title.innerHTML = "Musei Disponibili";

  // Disegna i filtri nella sidebar (se non ci sono già)
  populateFilters('museums');
  
  // Innesca la prima chiamata API tramite la logica dei filtri!
  await applyMuseumFilters(false);
  
  setupInfiniteScroll(); // Attiva il guardiano dello scroll in fondo

  if (!isHistoryPop) {
    history.pushState({ view: 'home' }, "", "/");
  }
}

async function getMuseumItems(museumId, isHistoryPop = false) {
  const container = document.getElementById("content-area");
  currentMuseumId = museumId;

  // Stacca la sentinella dai musei così non interferisce
  if (globalSentinel.parentNode) {
    globalSentinel.parentNode.removeChild(globalSentinel);
  }

  container.innerHTML = `
    <div class="col-12 text-center mt-5">
      <div class="spinner-border text-info" role="status"></div>
      <p class="mt-2 text-secondary">Apertura catalogo...</p>
    </div>`;

  try {
    const museum = cachedMuseums.find((m) => m._id === museumId);
    currentView = 'works';
    if (!isHistoryPop) {
      history.pushState({ view: 'museum', id: museumId }, "", `/?museumId=${museumId}`);
    }
    renderMuseumDashboard(museum);
  } catch (error) {
    console.error("Errore in getMuseumItems: ", error);
    container.innerHTML = `<div class="alert alert-danger bg-transparent text-danger border-danger">Errore: ${error.message}</div>`;
  }
}

// 4. LOGICA RENDER
function renderMuseumsList(museums, containerId = "content-area", append = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // 1. FONDAMENTALE: Svuotiamo il contenitore SOLO se non stiamo aggiungendo in coda!
  if (!append) {
    container.innerHTML = "";
  }

  // Capiamo se siamo nel marketplace (dove c'è content-area) o in I Miei Musei
  const isMarketplace = containerId === "content-area";

  // 2. Messaggio se non ci sono risultati (e non stiamo scrollando)
  if (museums.length === 0 && !append) {
    container.innerHTML = '<div class="col-12 text-center text-secondary py-5">Nessun museo trovato con questi filtri.</div>';
    return;
  }

  // 3. Costruiamo tutto il nuovo blocco HTML in memoria (più veloce)
  let htmlString = ""; 

  museums.forEach((museum) => {
    if (!museum) return;

    const tags = museum.tags || [];
    const tagsHtml = tags
        .map((tag) => `<span class="badge badge-tag">${tag}</span>`)
        .join("");

    const clickAction = isMarketplace 
        ? `getMuseumItems('${museum._id}')` 
        : `window.location.href='/?museumId=${museum._id}'`;

    htmlString += `
      <div class="col">
        <div class="card h-100 custom-card cursor-pointer" onclick="${clickAction}" style="cursor: pointer;">
          <img src="${museum.image}" class="card-img-top" alt="${museum.name}" style="height: 200px; object-fit: cover; opacity: 0.9;">
          <div class="card-body">
            <h5 class="card-title">${museum.name}</h5>
            <p class="card-text small mb-3"><i class="bi bi-geo-alt me-1"></i> ${museum.address}</p>
            <div>${tagsHtml}</div>
          </div>
        </div>
      </div>`;
  });

  if (append) {
    container.insertAdjacentHTML('beforeend', htmlString);
  } else {
    container.innerHTML = htmlString;
  }
  
  // Riassicuriamoci che la sentinella resti in fondo al container dei musei
  if (isMarketplace) {
    container.appendChild(globalSentinel);
  }
}

function renderMuseumDashboard(museumInfo) {
  const container = document.getElementById("content-area");
  const title = document.getElementById("page-title");
  const backBtn = document.getElementById("back-btn");

  if (!container) return;

  // Costruiamo la barra delle info extra per il museo
  let museumExtraInfo = "";
  if (museumInfo) {
    const priceText = museumInfo.ticketPrice > 0 ? `€ ${museumInfo.ticketPrice.toFixed(2)}` : `<span class="text-success">Gratis</span>`;
    
    // --- MAGIA DEL MENU A TENDINA PER GLI ORARI ---
    let hoursDropdownHtml = `<span><i class="bi bi-clock me-1 text-info"></i> Orari non configurati</span>`;
    
    if (museumInfo.schedule) {
      const allDays = [
        { id: 'monday', label: 'Lunedì' }, { id: 'tuesday', label: 'Martedì' }, { id: 'wednesday', label: 'Mercoledì' },
        { id: 'thursday', label: 'Giovedì' }, { id: 'friday', label: 'Venerdì' }, { id: 'saturday', label: 'Sabato' }, { id: 'sunday', label: 'Domenica' }
      ];
      
      const listItems = allDays.map(d => {
        const savedDay = museumInfo.schedule.find(s => s.day === d.id);
        const isOpen = !!savedDay; 
        
        const timeText = isOpen ? (savedDay.hours || 'Aperto') : 'Chiuso';
        const textColorClass = isOpen ? 'text-white' : 'text-danger'; 
        
        return `
          <li class="d-flex justify-content-between align-items-center px-3 py-2 border-bottom border-secondary border-opacity-25" style="min-width: 220px;">
            <span class="text-white-50 small">${d.label}</span> 
            <strong class="${textColorClass} small">${timeText}</strong>
          </li>`;
      }).join('');
      
      hoursDropdownHtml = `
        <div class="dropdown d-inline-block">
          <span class="cursor-pointer text-light text-decoration-none dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false" style="font-size: 0.9rem;">
            <i class="bi bi-clock me-1 text-info"></i> Orari di Apertura
          </span>
          <ul class="dropdown-menu dropdown-menu-dark shadow mt-2 p-0 border-secondary">
            ${listItems}
          </ul>
        </div>
      `;
    }
    // --- FINE LOGICA TENDINA ---
    
   // Assembliamo la stringa finale 
    museumExtraInfo = `
      <div class="d-flex flex-wrap gap-4 mt-2 small align-items-center" style="font-size: 0.9rem; -webkit-text-fill-color: initial; text-transform: none; font-weight: normal; letter-spacing: normal;">
        <div style="-webkit-text-fill-color: currentColor;">${hoursDropdownHtml}</div>
        <span class="text-white-50"><i class="bi bi-ticket-perforated me-1 text-info"></i> Ingresso: <span class="text-white fw-bold">${priceText}</span></span>
        ${museumInfo.contact_phone ? `<span class="text-white-50"><i class="bi bi-telephone me-1 text-info"></i> <span class="text-white fw-bold">${museumInfo.contact_phone}</span></span>` : ''}
      </div>
    `;
  }

  // Configura il titolo, la barra extra e i bottoni
  if (museumInfo) {
    title.innerHTML = `
      <div class="d-flex justify-content-between align-items-center w-100">
        <div>
          ${museumInfo.name}
          ${museumExtraInfo}
        </div>
        <div class="d-flex flex-shrink-0 align-items-start">
          <a href="/create-visit?museumId=${museumInfo._id}" class="btn-create-visit ms-3">
            <i class="bi bi-map me-1"></i> Crea visita
          </a>
          <a href="/edit-museum?id=${museumInfo._id}" id="edit-museum-btn" class="btn-create-visit ms-2 d-none">
            <i class="bi bi-sliders me-1"></i> Modifica
          </a>
          <button id="edit-stock-btn" class="btn-create-visit ms-2 d-none" onclick="openBookshopManager('${museumInfo._id}')">        
            <i class="bi bi-shop me-1"></i> Bookshop
          </button>
          <a href="/museums/${museumInfo._id}/upload-map/" id="upload-map-btn" class="btn-create-visit ms-2 d-none">
            <i class="bi bi-map-fill me-1"></i> Mappa
          </a>
        </div>
      </div>
    `;
    
    checkIfMuseumIsManaged(museumInfo._id);
  }
  if (backBtn) backBtn.classList.remove("d-none");

  // Renderizziamo le tab
  container.innerHTML = `
    <div class="w-100 mb-4 px-0 mt-3">
      <div class="row g-0 border-bottom border-secondary border-opacity-25 p-0 w-100 mx-0" style="background: transparent;">
        <div class="col-4 p-0">
          <button id="tab-works" 
                  class="btn w-100 py-2 small rounded-top-3 border-0 ${currentView === 'works' ? 'tab-custom-active' : 'btn-glass text-secondary'}" 
                  onclick="switchMuseumView('works', '${museumInfo._id}')">
            <i class="bi bi-palette me-2"></i>Opere Esposte
          </button>
        </div>
        <div class="col-4 p-0">
          <button id="tab-items" 
                  class="btn w-100 py-2 small rounded-top-3 border-0 ${currentView === 'items' ? 'tab-custom-active' : 'btn-glass text-secondary'}" 
                  onclick="switchMuseumView('items', '${museumInfo._id}')">
            <i class="bi bi-bag-check me-2"></i>Bookshop & Servizi
          </button>
        </div>
        <div class="col-4 p-0">
          <button id="tab-visits" 
                  class="btn w-100 py-2 small rounded-top-3 border-0 ${currentView === 'visits' ? 'tab-custom-active' : 'btn-glass text-secondary'}" 
                  onclick="switchMuseumView('visits', '${museumInfo._id}')">
            <i class="bi bi-map me-2"></i>Visite Guidate
          </button>
        </div>
      </div>
    </div>
    <div id="museum-display-area" class="row g-3 w-100 m-0">
    </div>
  `;

  // Chiamiamo switchMuseumView invece di loadMuseumSubView per innescare 
  // anche il cambio dei filtri nella barra laterale fin dal primo caricamento!
  switchMuseumView(currentView || 'works', museumInfo._id);
}

// controlla se l'utente gestisce un determinato museo (o se è admin)
async function checkIfMuseumIsManaged(currentMuseumId) {
  if (!currentUser || (currentUser.role !== 'curator' && currentUser.role !== 'admin')) {
    return;
  }

  // se è admin, sblocca il bottone istantaneamente
  if (currentUser.role === 'admin') {
    const editBtn = document.getElementById("edit-museum-btn");
    const editBshopBtn = document.getElementById("edit-stock-btn");
    const uploadMapBtn = document.getElementById("upload-map-btn");
    if (editBtn) editBtn.classList.remove("d-none");
    if (editBshopBtn) editBshopBtn.classList.remove("d-none");
    if (uploadMapBtn) uploadMapBtn.classList.remove("d-none");
    return; // Ci fermiamo qui, l'admin ha già i permessi
  }

  // logica normale per i curatori
  try {
    // Se non abbiamo la cache, scarichiamo SOLO _id e name (fetching selettivo)
    if (!myManagedMuseumsCache) {
      const response = await fetch(`${API_BASE_URL}/my-museums?fields=_id,name`);
      if (response.ok) {
        myManagedMuseumsCache = await response.json();
      } else {
        return;
      }
    }
    
    // Controlliamo la cache
    const isManaged = myManagedMuseumsCache.some(museum => {
       return (museum._id && museum._id === currentMuseumId) || museum === currentMuseumId;
    });
    // mostriamo il bottone
    if (isManaged) {
      const editBtn = document.getElementById("edit-museum-btn");
      const editBshopBtn = document.getElementById("edit-stock-btn");

      if (editBtn) {
        editBtn.classList.remove("d-none");
      }
      if (editBshopBtn) {
        editBshopBtn.classList.remove("d-none");
      }
    }
  } catch (error) {
    console.error("Errore durante la verifica dei permessi di modifica museo:", error);
  }
}

// Gestisce lo switch attivando l'effetto "scheda a tre lati"
function switchMuseumView(view, museumId) {
  currentView = view;
  
  const tabWorks = document.getElementById("tab-works");
  const tabItems = document.getElementById("tab-items");
  const tabVisits = document.getElementById("tab-visits");
  
  if (!tabWorks || !tabItems || !tabVisits) return;
  
  tabWorks.classList.remove("tab-custom-active");
  tabWorks.classList.add("btn-glass", "text-secondary");
  tabItems.classList.remove("tab-custom-active");
  tabItems.classList.add("btn-glass", "text-secondary");
  tabVisits.classList.remove("tab-custom-active");
  tabVisits.classList.add("btn-glass", "text-secondary");
  
  if (view === 'works') {
    tabWorks.classList.remove("btn-glass", "text-secondary");
    tabWorks.classList.add("tab-custom-active");
  } else if (view === 'items') {
    tabItems.classList.remove("btn-glass", "text-secondary");
    tabItems.classList.add("tab-custom-active");
  } else if (view === 'visits') {
    tabVisits.classList.remove("btn-glass", "text-secondary");
    tabVisits.classList.add("tab-custom-active");
  }

  // Cambia la sidebar in base alla tab selezionata
  if (typeof populateFilters === 'function') populateFilters(view);
  
  loadMuseumSubView(view, museumId); //
}

async function fetchAndRenderWorks(museumId, isLoadMore = false) {
  if (isFetchingWorks) return;
  isFetchingWorks = true;
  
  const subContainer = document.getElementById("museum-display-area");
  if (!subContainer) return;

  if (isLoadMore) {
    globalSentinel.classList.remove("d-none");
  }

  // Raccogli filtri attivi se ci sono
  const search = document.getElementById("filter-author-search")?.value.trim() || ""; // o input dedicati
  const authorCbs = Array.from(document.querySelectorAll('.author-cb:checked')).map(cb => cb.value);
  const techniqueCbs = Array.from(document.querySelectorAll('.technique-cb:checked')).map(cb => cb.value);
  const styleCbs = Array.from(document.querySelectorAll('.workstyle-cb:checked')).map(cb => cb.value);

  const params = new URLSearchParams();
  params.append("page", currentWorkPage);
  params.append("limit", 12); // Scarica blocchi da 12 dal server
  if (!isLoadMore) params.append("fetchMetadata", "true"); // Chiede i dati per la sidebar solo la prima volta
  
  if (authorCbs.length > 0) params.append("author", authorCbs.join(","));
  if (techniqueCbs.length > 0) params.append("technique", techniqueCbs.join(","));
  if (styleCbs.length > 0) params.append("workstyle", styleCbs.join(","));

  try {
    const response = await fetch(`${API_BASE_URL}/museums/${museumId}/works?${params.toString()}`);
    if (!response.ok) throw new Error("Errore caricamento opere");
    const data = await response.json();

    totalWorkPages = data.totalPages;

    if (isLoadMore) {
      currentWorks = [...currentWorks, ...data.works];
      
      // Salva nella cache pulita delle opere se non ci sono filtri
      if (authorCbs.length === 0 && techniqueCbs.length === 0 && styleCbs.length === 0) {
        pristineWorksCache = [...currentWorks];
        pristineWorkPage = currentWorkPage;
        if (pristineWorksCache.length >= data.total) isEntireWorksDbInCache = true;
      }

      const nextChunk = currentWorks.slice(renderedWorksCount, renderedWorksCount + WORK_RENDER_CHUNK);
      renderedWorksCount += nextChunk.length;
      renderWorksList(nextChunk, true);
    } else {
      currentWorks = data.works;
      
      if (authorCbs.length === 0 && techniqueCbs.length === 0 && styleCbs.length === 0) {
        pristineWorksCache = [...currentWorks];
        pristineWorkPage = currentWorkPage;
        pristineTotalWorkPages = totalWorkPages;
        if (pristineWorksCache.length >= data.total) isEntireWorksDbInCache = true;
      }

      // Se il server ha restituito i metadati per la sidebar, inizializziamoli!
      if (data.metadata && typeof initializeWorkFiltersDataFromApi === 'function') {
        initializeWorkFiltersDataFromApi(data.metadata);
      }

      renderedWorksCount = Math.min(WORK_RENDER_CHUNK, currentWorks.length);
      const initialChunk = currentWorks.slice(0, renderedWorksCount);
      renderWorksList(initialChunk, false);
    }

    setupWorksInfiniteScroll(museumId);
  } catch (error) {
    console.error(error);
    if (!isLoadMore) subContainer.innerHTML = `<div class="col-12 text-center text-danger small py-3">Errore: ${error.message}</div>`;
  } finally {
    isFetchingWorks = false;
    updateWorksSentinelVisibility();
  }
}
async function fetchAndRenderItems(museumId, isLoadMore = false) {
  if (isFetchingItems) return;
  isFetchingItems = true;
  
  const subContainer = document.getElementById("museum-display-area");
  if (!subContainer) return;

  if (isLoadMore) globalSentinel.classList.remove("d-none");

  const params = new URLSearchParams();
  params.append("page", currentItemsPage);
  params.append("limit", 12); 
  
  try {
    const response = await fetch(`${API_BASE_URL}/museums/${museumId}/items?${params.toString()}`);
    if (!response.ok) throw new Error("Errore caricamento articoli");
    
    const data = await response.json();
    
    const itemsArray = data.items || [];
    totalItemsPages = data.totalPages || 1;

    if (isLoadMore) {
      currentItems = [...currentItems, ...itemsArray];
      const nextChunk = currentItems.slice(renderedItemsCount, renderedItemsCount + ITEMS_RENDER_CHUNK);
      renderedItemsCount += nextChunk.length;
      renderItemsList(nextChunk, true);
    } else {
      currentItems = itemsArray;
      renderedItemsCount = Math.min(ITEMS_RENDER_CHUNK, currentItems.length);
      const initialChunk = currentItems.slice(0, renderedItemsCount);
      renderItemsList(initialChunk, false);
    }
  } catch (error) {
    console.error(error);
    if (!isLoadMore) subContainer.innerHTML = `<div class="col-12 text-center text-danger small py-3">Errore: ${error.message}</div>`;
  } finally {
    isFetchingItems = false;
    updateItemsSentinelVisibility();
  }
}

let itemsObserver = null;
function setupItemsInfiniteScroll(museumId) {
  const sentinel = document.getElementById("global-infinite-sentinel");
  if (!sentinel) return;

  if (itemsObserver) itemsObserver.disconnect();

  itemsObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
       if (renderedItemsCount < currentItems.length) {
          const nextChunk = currentItems.slice(renderedItemsCount, renderedItemsCount + ITEMS_RENDER_CHUNK);
          renderedItemsCount += nextChunk.length;
          renderItemsList(nextChunk, true);
          updateItemsSentinelVisibility();
       } else if (!isFetchingItems && currentItemsPage < totalItemsPages) {
          currentItemsPage++;
          fetchAndRenderItems(museumId, true);
       }
    }
  }, { rootMargin: '100px' });

  itemsObserver.observe(sentinel);
}

function updateItemsSentinelVisibility() {
  if (renderedItemsCount < currentItems.length || currentItemsPage < totalItemsPages) {
    globalSentinel.classList.remove("d-none");
  } else {
    globalSentinel.classList.add("d-none");
  }
}

let worksObserver = null;
function setupWorksInfiniteScroll(museumId) {
  const sentinel = document.getElementById("global-infinite-sentinel");
  if (!sentinel) return;

  if (worksObserver) worksObserver.disconnect();

  worksObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
       if (renderedWorksCount < currentWorks.length) {
          const nextChunk = currentWorks.slice(renderedWorksCount, renderedWorksCount + WORK_RENDER_CHUNK);
          renderedWorksCount += nextChunk.length;
          renderWorksList(nextChunk, true);
          updateWorksSentinelVisibility();
       } else if (!isFetchingWorks && currentWorkPage < totalWorkPages) {
          currentWorkPage++;
          fetchAndRenderWorks(museumId, true);
       }
    }
  }, { rootMargin: '100px' });

  worksObserver.observe(sentinel);
}

function updateWorksSentinelVisibility() {
  if (renderedWorksCount < currentWorks.length || currentWorkPage < totalWorkPages) {
    globalSentinel.classList.remove("d-none");
  } else {
    globalSentinel.classList.add("d-none");
  }
}

// Si occupa di fare la fetch corretta in base al tab selezionato
async function loadMuseumSubView(view, museumId) {
  const subContainer = document.getElementById("museum-display-area");
  if (!subContainer) return;

  // Stacchiamo temporaneamente la sentinella mentre puliamo il subContainer
  if (globalSentinel.parentNode) {
    globalSentinel.parentNode.removeChild(globalSentinel);
  }

  subContainer.innerHTML = `
    <div class="col-12 text-center py-4">
      <div class="spinner-border text-light spinner-border-sm" role="status"></div>
    </div>`;

  try {
    if (view === 'visits') {
      const response = await fetch(`${API_BASE_URL}/visits`);
      if (!response.ok) throw new Error("Errore nel caricamento delle visite");
      const allVisits = await response.json();
      
      // Filtriamo per questo museo
      const museumVisits = allVisits.filter(v => v.isPublic !== false && (v.museumId?._id === museumId || v.museumId === museumId));
      
      currentVisits = museumVisits;
      renderVisitsListForMuseum(currentVisits);
    } else {
      // Scegliamo l'endpoint corretto
      if (view === 'works') {
        // --- MAGIA DELLA CACHE DEI TAB ---
        // Se abbiamo già scaricato le opere per questo museo e l'array non è vuoto, usiamole al volo!
        if (currentWorks && currentWorks.length > 0 && currentWorks[0].museumId === museumId) {
           currentWorkPage = 1;
           renderedWorksCount = Math.min(WORK_RENDER_CHUNK, currentWorks.length);
           const cachedChunk = currentWorks.slice(0, renderedWorksCount);
           renderWorksList(cachedChunk, false);
           updateWorksSentinelVisibility();
           return; // STOP! Nessun fetch, visualizzazione istantanea!
        }
        
        // Altrimenti procedi col fetch normale
        currentWorkPage = 1;
        renderedWorksCount = 0;
        await fetchAndRenderWorks(museumId, false);
      } else {
        // --- MAGIA DELLA CACHE: Se li abbiamo già scaricati per questo museo, usiamo la RAM ---
        if (currentItems && currentItems.length > 0 && (currentItems[0].museumId === museumId || currentItems[0].museumId?._id === museumId)) {
           currentItemsPage = 1;
           renderedItemsCount = Math.min(ITEMS_RENDER_CHUNK, currentItems.length);
           const cachedChunk = currentItems.slice(0, renderedItemsCount);
           renderItemsList(cachedChunk, false);
           updateItemsSentinelVisibility();
           return;
        }
        
        currentItemsPage = 1;
        renderedItemsCount = 0;
        await fetchAndRenderItems(museumId, false);
      }
    }
  } catch (error) {
    console.error(error);
    subContainer.innerHTML = `<div class="col-12 text-center text-danger small py-3">Impossibile caricare i contenuti: ${error.message}</div>`;
  }
}

function renderVisitsListForMuseum(visits) {
  const container = document.getElementById("museum-display-area");
  if (!container) return;
  container.innerHTML = "";

  if (visits.length === 0) {
    container.innerHTML = '<div class="col-12 text-center text-secondary py-5">Nessuna visita guidata disponibile per questo museo.</div>';
    return;
  }

  // Dizionari per tradurre i valori del DB in etichette leggibili
  const targetMap = { kids: 'Bambini', families: 'Famiglie', adults: 'Adulti', schools: 'Scuole' };
  const accMap = { wheelchair_accessible: '♿ Sedia a rotelle', blind_friendly: '👁️ Ipovedenti', deaf_friendly: '👂 Sordi', dsa_friendly: '🧠 DSA', sensory_friendly: '🧘 Sensory' };

  visits.forEach((visit) => {
    const coverImg = visit.coverImage || (visit.works && visit.works.length > 0 && visit.works[0].image ? visit.works[0].image : "/img/fallback-visit.jpg");
    const safeTitle = visit.title.replace(/'/g, "\\'");

    // Generazione dinamica dei tag
    let extraTagsHtml = "";
    
    if (visit.targetAudience && visit.targetAudience.length > 0) {
      visit.targetAudience.forEach(t => {
        if (t !== 'all' && targetMap[t]) {
          extraTagsHtml += `<span class="badge bg-info bg-opacity-25 text-info border border-info me-1 mb-1">${targetMap[t]}</span>`;
        }
      });
    }

    if (visit.accessibility && visit.accessibility.length > 0) {
      visit.accessibility.forEach(a => {
        if (a !== 'none' && accMap[a]) {
          extraTagsHtml += `<span class="badge bg-warning bg-opacity-25 text-warning border border-warning me-1 mb-1">${accMap[a]}</span>`;
        }
      });
    }

    container.innerHTML += `
      <div class="col-12 col-md-6 col-lg-4">
        <div class="card h-100 custom-card cursor-pointer overflow-hidden" onclick="window.location.href='/visit-details?id=${visit._id}'">
          
          <div style="height: 160px; overflow: hidden; position: relative;">
            <img src="${coverImg}" class="card-img-top h-100 w-100" style="object-fit: cover;" alt="${visit.title}">
            <div class="position-absolute top-0 end-0 m-2">
              ${visit.price > 0 ? `<span class="badge bg-dark border border-secondary fs-6">€ ${visit.price.toFixed(2)}</span>` : `<span class="badge bg-success fs-6">GRATIS</span>`}
            </div>
            <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 50%; background: linear-gradient(to top, rgba(18,18,28,0.9), transparent);"></div>
          </div>

          <div class="card-body d-flex flex-column">
            <h5 class="card-title text-info mb-1">${visit.title}</h5>
            
            <div class="mb-2">
              ${extraTagsHtml}
            </div>

            <p class="card-text small text-secondary flex-grow-1">${visit.description || "Nessuna descrizione."}</p>
            
            <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-secondary border-opacity-25">
              <span class="badge badge-tag"><i class="bi bi-collection me-1"></i>${visit.works ? visit.works.length : 0} Opere</span>
              <span class="small text-secondary"><i class="bi bi-stopwatch me-1"></i>${visit.duration || 0} min</span>
            </div>

            <div class="mt-3">
              <button class="btn btn-sm btn-gradient w-100 py-2 rounded-pill" 
                onclick="event.stopPropagation(); addToCart({ id: '${visit._id}', type: 'visit', name: '${safeTitle}', price: ${visit.price}, image: '${coverImg}' })">
                <i class="bi bi-cart-plus me-1"></i> Acquista
              </button>
            </div>
          </div>
        </div>
      </div>`;
  });
}

function renderWorksList(works, append = false) {
  const subContainer = document.getElementById("museum-display-area");
  if (!subContainer) return;

  if (!append) {
    subContainer.innerHTML = "";
  } 

  if (works.length === 0 && !append) {
    subContainer.innerHTML = '<div class="col-12 text-center text-secondary py-5">Nessuna opera d\'arte esposta in questo museo.</div>';
    return;
  }

  let htmlString = "";
  works.forEach((work) => {
    const primaryDesc = work.description?.medium?.short || work.description?.[0]?.description || work.description || "";

    htmlString += `
      <div class="col-12 col-lg-6">
        <div class="card custom-card h-100">
          <div class="row g-0 h-100">
            <div class="col-4">
              <img src="${work.image}" class="img-fluid rounded-start h-100"
                style="object-fit: cover; min-height: 180px" alt="${work.name}"/>
            </div>
            <div class="col-8">
              <div class="card-body d-flex flex-column h-100 py-3 px-3">
                <h5 class="card-title mb-1 text-truncate text-info">${work.name}</h5>
                
                <p class="small text-secondary mb-2">
                  <i class="bi bi-person-fill me-1"></i> ${work.authorName || 'Autore ignoto'} <br>
                  <i class="bi bi-calendar3 me-1"></i> ${work.year || ''} &bull; ${work.styleName || ''}
                </p>
                
                <p class="card-text small text-truncate-3 mb-3" style="flex-grow: 1; opacity: 0.8">
                  ${primaryDesc}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  });

  // Aggiungiamo la sentinella direttamente in fondo alla stringa HTML delle opere
  htmlString += `
    <div id="works-loading-sentinel" class="col-12 text-center py-4 d-none w-100">
      <div class="spinner-border text-light spinner-border-sm" role="status"></div>
      <p class="text-secondary small mt-1">Caricamento altre opere...</p>
    </div>
  `;

  if (append) {
    subContainer.insertAdjacentHTML('beforeend', htmlString);
  } else {
    subContainer.innerHTML = htmlString;
  }

  // Sposta magicamente la sentinella universale in fondo al contenitore delle opere
  subContainer.appendChild(globalSentinel);

  if (currentMuseumId) {
    setupWorksInfiniteScroll(currentMuseumId);
    updateWorksSentinelVisibility();
  }
}

function renderItemsList(items, append = false) {
  const container = document.getElementById("museum-display-area");
  if(!container) return;

  if (!append) container.innerHTML = "";

  if (items.length === 0 && !append) {
    container.innerHTML = '<div class="col-12 text-center text-secondary py-5">Nessun articolo presente nel bookshop.</div>';
    return;
  }

  let htmlString = "";

  items.forEach((item) => {
    const safeName = item.name.replace(/'/g, "\\'");

    htmlString += `
      <div class="col-12 col-lg-6">
        <div class="card custom-card h-100">
          <div class="row g-0 h-100">
            <div class="col-4">
              <img src="${item.image}" class="img-fluid rounded-start h-100" style="object-fit: cover; min-height: 180px" alt="${item.name}"/>
            </div>
            <div class="col-8">
              <div class="card-body d-flex flex-column h-100 py-3 px-3">
                <div class="d-flex justify-content-between align-items-start">
                  <h5 class="card-title mb-1 text-truncate">${item.name}</h5>
                </div>
                <p class="card-text small text-truncate-3 mb-3" style="flex-grow: 1; opacity: 0.8">${item.description}</p>
                <div class="d-flex justify-content-between align-items-end mt-auto pt-2 border-top border-secondary border-opacity-25">
                  <div class="fw-bold text-white fs-5">€ ${item.price.toFixed(2)}</div>
                  <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-gradient rounded-pill px-3" onclick="addToCart({ id: '${item._id}', type: 'item', name: '${safeName}', price: ${item.price}, image: '${item.image || ''}' })"><i class="bi bi-cart-plus me-1"></i> Compra</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  });

  if (append) {
    container.insertAdjacentHTML('beforeend', htmlString);
  } else {
    container.innerHTML = htmlString;
  }

  // Sposta la sentinella universale per le opere d'arte/bookshop
  container.appendChild(globalSentinel);

  if (currentMuseumId) {
    setupItemsInfiniteScroll(currentMuseumId);
    updateItemsSentinelVisibility();
  }
}

async function loadManagedMuseums(isLoadMore = false) {
  const container = document.getElementById("managed-museums-area");
  if (!container) return;

  // Mostriamo il caricamento solo al primo giro
  if (!isLoadMore) {
    container.innerHTML = `<div class="col-12 text-center mt-5"><div class="spinner-border text-info"></div></div>`;
    myMuseumsAdminPage = 1;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/my-museums?page=${myMuseumsAdminPage}&limit=${RENDER_CHUNK}`);
    const data = await response.json();

    const isPaginated = !Array.isArray(data);
    const managedMuseums = isPaginated ? data.museums : data;
    const totalPages = isPaginated ? data.totalPages : 1;

    if (managedMuseums.length === 0 && !isLoadMore) {
      container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <p class="text-secondary">Non hai ancora musei assegnati.</p>
                    <a href="/add-museum" class="btn btn-primary">Aggiungi il tuo primo museo</a>
                </div>`;
      return;
    }

    renderMuseumsList(managedMuseums, "managed-museums-area", isLoadMore);

    // Se stiamo gestendo dati paginati (admin), attiviamo lo scroll infinito
    if (isPaginated) {
      container.appendChild(globalSentinel);
      setupManagedMuseumsObserver(totalPages);
      
      // Nascondiamo la sentinella se abbiamo raggiunto l'ultima pagina
      if (myMuseumsAdminPage >= totalPages) {
        globalSentinel.classList.add("d-none");
      } else {
        globalSentinel.classList.remove("d-none");
      }
    }
  } catch (error) {
    if (!isLoadMore) container.innerHTML = `<div class="alert alert-danger">Errore nel caricamento dei tuoi musei.</div>`;
  }
}

function setupManagedMuseumsObserver(totalPages) {
  if (!globalSentinel) return;
  if (managedMuseumObserver) managedMuseumObserver.disconnect();

  managedMuseumObserver = new IntersectionObserver((entries) => {
    // Impediamo doppie chiamate controllando isFetchingMuseums
    if (entries[0].isIntersecting && !isFetchingMuseums) {
       if (myMuseumsAdminPage < totalPages) {
          isFetchingMuseums = true;
          myMuseumsAdminPage++;
          loadManagedMuseums(true).finally(() => { isFetchingMuseums = false; });
       }
    }
  }, { rootMargin: '100px' });

  managedMuseumObserver.observe(globalSentinel);
}