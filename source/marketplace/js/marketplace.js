// Stato globale
let cachedMuseums = [];
let currentItems = [];
let currentWorks = [];
let currentMuseumId = null;
let editModalInstance = null;
let currentView = 'works';

// 1. INIZIALIZZAZIONE
document.addEventListener("DOMContentLoaded", async () => {
  const modalEl = document.getElementById("editItemModal");
  if (modalEl) {
    editModalInstance = new bootstrap.Modal(modalEl);
  }

  // Gestione del tasto indietro del browser
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

// 3. LOGICA API (FETCH)

async function getMuseums(isHistoryPop = false) {
  const container = document.getElementById("content-area");

  // 1. SE IL CONTAINER NON ESISTE (es. siamo nella pagina I Miei Musei), FERMATI.
  if (!container) return;

  const title = document.getElementById("page-title");
  const backBtn = document.getElementById("back-btn");

  currentMuseumId = null; // Resetta l'ID del museo aperto

  // 2. CONTROLLA CHE GLI ELEMENTI ESISTANO PRIMA DI MODIFICARLI
  if (backBtn) {
    backBtn.classList.add("d-none");
  }

  if (title) {
    title.innerHTML = "Musei Disponibili";
  }

  container.innerHTML = `
    <div class="col-12 text-center mt-5">
      <div class="spinner-border text-light" role="status"></div>
      <p class="mt-2 text-secondary">Caricamento...</p>
    </div>`;

  try {
    const response = await fetch(`${API_BASE_URL}/museums`);
    if (!response.ok) throw new Error("Errore server");
    cachedMuseums = await response.json();

    // Genera l'interfaccia HTML dei filtri per i musei nella sidebar
    populateFilters('museums');

    // Inizializza i dati in background
    initializeFiltersData(cachedMuseums);

    // Renderizza passandogli esplicitamente l'id (per evitare conflitti)
    renderMuseumsList(cachedMuseums, "content-area");

    if (!isHistoryPop) {
      history.pushState({ view: 'home' }, "", "/");
    }
  } catch (error) {
    console.error(error);
    container.innerHTML = `<div class="alert alert-danger bg-transparent text-danger border-danger">Errore caricamento dati. Il server è attivo?</div>`;
  }
}

async function getMuseumItems(museumId, isHistoryPop = false) {
  const container = document.getElementById("content-area");
  currentMuseumId = museumId;

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
function renderMuseumsList(museums, containerId = "content-area") {
  // Ora usa il parametro dinamico invece della stringa fissa
  const container = document.getElementById(containerId);

  // Se il contenitore non esiste, si ferma senza crashare
  if (!container) return;

  container.innerHTML = "";

  // Capiamo se siamo nel marketplace (dove c'è content-area) o in I Miei Musei
  const isMarketplace = containerId === "content-area";

  museums.forEach((museum) => {
    if (!museum) return; // Controllo di sicurezza che avevamo aggiunto

    const tags = museum.tags || [];
    const tagsHtml = tags
        .map((tag) => `<span class="badge badge-tag">${tag}</span>`)
        .join("");

    // Se siamo nel marketplace apriamo la scheda dinamicamente, altrimenti redirigiamo alla home passandogli l'ID!
    const clickAction = isMarketplace 
        ? `getMuseumItems('${museum._id}')` 
        : `window.location.href='/?museumId=${museum._id}'`;

    container.innerHTML += `
      <div class="col">
        <div class="card h-100 custom-card cursor-pointer" onclick="${clickAction}" style="cursor: pointer;">
          <img src="${museum.image}" class="card-img-top" alt="${museum.name}" style="height: 200px; object-fit: cover; opacity: 0.9;">
          <div class="card-body">
            <h5 class="card-title">${museum.name}</h5>
            <p class="card-text small mb-3"><i class="bi bi-geo-alt me-1"></i> ${museum.address}</p>
            <div>${tagsHtml}</div>
          </div>
        </div>
        <a href="/navigator/museum/${museum._id}"><div class="explore">Navigate museum</div></a>
        <a href="/museums/${museum._id}/upload-map/"><div class="explore">Upload Map</div></a>
      </div>`;
  });
}

function renderMuseumDashboard(museumInfo) {
  const container = document.getElementById("content-area");
  const title = document.getElementById("page-title");
  const backBtn = document.getElementById("back-btn");

  if (!container) return;

  // Configura il titolo e il bottone per creare la visita
  if (museumInfo) {
    title.innerHTML = `
      ${museumInfo.name} 
      <a href="/create-visit?museumId=${museumInfo._id}" class="btn-create-visit ms-3">
        <i class="bi bi-map me-1"></i> Crea visita qui
      </a>
      <a href="/edit-museum?id=${museumInfo._id}" id="edit-museum-btn" class="btn-create-visit ms-2 d-none">
        <i class="bi bi-sliders me-1"></i> Modifica
      </a>
      <button id="edit-stock-btn" class="btn-create-visit ms-2 d-none" onclick="openBookshopManager('${museumInfo._id}')">        
        <i class="bi bi-shop me-1"></i> Gestisci Bookshop
      </button>
    `;
    
    // controlliamo se l'utente puo' mostrare
    checkIfMuseumIsManaged(museumInfo._id);
  }
  if (backBtn) backBtn.classList.remove("d-none");

  // 2. Renderizziamo la barra di navigazione simmetrica, sottile e con stile tab personalizzato
  container.innerHTML = `
    <div class="w-100 mb-4 px-0">
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

  // 3. Carica la vista iniziale
  loadMuseumSubView(currentView, museumInfo._id);
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
    if (editBtn) {
      editBtn.classList.remove("d-none");
    }
    if (editBshopBtn) {
      editBshopBtn.classList.remove("d-none");
    }
    return; // Ci fermiamo qui, l'admin ha già i permessi
  }

  // logica normale per i curatori
  try {
    // recuperiamo l'elenco dei musei gestiti dal curatore
    const response = await fetch(`${API_BASE_URL}/my-museums`);
    
    if (response.ok) {
      const managedMuseums = await response.json();
      
      // controlliamo se l'ID del museo aperto è nell'array restituito
      const isManaged = managedMuseums.some(museum => {
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

// Si occupa di fare la fetch corretta in base al tab selezionato
async function loadMuseumSubView(view, museumId) {
  const subContainer = document.getElementById("museum-display-area");
  if (!subContainer) return;

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
      renderVisitsListForMuseum(museumVisits);
    } else {
      // Scegliamo l'endpoint corretto (opere o articoli di vendita)
      const endpoint = view === 'works' 
        ? `${API_BASE_URL}/museums/${museumId}/works` 
        : `${API_BASE_URL}/museums/${museumId}/items`;

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("Errore nel caricamento dei dati");
      const data = await response.json();

      if (view === 'works') {
        currentWorks = data;
        initializeWorkFiltersData(data);
        renderWorksList(data); // Rendering per le Opere
      } else {
        currentItems = data; // Conserviamo gli articoli per l'editor
        renderItemsList(data); // Il tuo vecchio rendering per gli Articoli (in vendita)
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

  visits.forEach((visit) => {
    const coverImg =
      visit.coverImage ||
      (visit.works && visit.works.length > 0 && visit.works[0].image
        ? visit.works[0].image
        : "/img/fallback-visit.jpg");

    const safeTitle = visit.title.replace(/'/g, "\\'");

    container.innerHTML += `
      <div class="col-12 col-md-6 col-lg-4">
        <div class="card h-100 custom-card cursor-pointer overflow-hidden" onclick="window.location.href='/visit-details?id=${visit._id}'">
          <div style="height: 160px; overflow: hidden; position: relative;">
            <img src="${coverImg}" class="card-img-top h-100 w-100" style="object-fit: cover;" alt="${visit.title}">
            <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 50%; background: linear-gradient(to top, rgba(18,18,28,0.9), transparent);"></div>
          </div>

          <div class="card-body d-flex flex-column">
            <h5 class="card-title text-info mb-2">${visit.title}</h5>
            <p class="card-text small text-secondary flex-grow-1">${visit.description || "Nessuna descrizione disponibile."}</p>
            
            <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-secondary border-opacity-25">
              <span class="badge badge-tag"><i class="bi bi-collection me-1"></i>${visit.works ? visit.works.length : 0} Opere</span>
              ${visit.price > 0 ? `<span class="fw-bold text-white">€ ${visit.price.toFixed(2)}</span>` : `<span class="fw-bold text-success">GRATIS</span>`}
            </div>

            <div class="mt-3">
              <button class="btn btn-sm btn-gradient w-100 py-2 rounded-pill" 
                onclick="event.stopPropagation(); addToCart({ id: '${visit._id}', type: 'visit', name: '${safeTitle}', price: ${visit.price}, image: '${coverImg}' })">
                <i class="bi bi-cart-plus me-1"></i> Acquista Visita
              </button>
            </div>

          </div>
        </div>
      </div>`;
  });
}

function renderWorksList(works) {
  const subContainer = document.getElementById("museum-display-area");
  if (!subContainer) return;

  subContainer.innerHTML = "";

  if (works.length === 0) {
    subContainer.innerHTML = '<div class="col-12 text-center text-secondary py-5">Nessuna opera d\'arte esposta in questo museo.</div>';
    return;
  }

  works.forEach((work) => {
    // Estraiamo la prima descrizione disponibile nell'array, se presente
    const primaryDesc = work.description && work.description.length > 0 
      ? work.description[0].description 
      : "Descrizione culturale in corso di generazione...";

    subContainer.innerHTML += `
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
                  <i class="bi bi-person-fill me-1"></i> ${work.author} <br>
                  <i class="bi bi-calendar3 me-1"></i> ${work.year} &bull; ${work.style}
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
}

function renderItemsList(items, museumInfo) {
  const container = document.getElementById("museum-display-area");
  
  if(!container) return;
  container.innerHTML = "";

  if (items.length === 0) {
    container.innerHTML = '<div class="col-12 text-center text-secondary py-5">Nessun articolo presente nel bookshop.</div>';
    return;
  }

  const isCurator = currentUser && currentUser.role === "curator";

  items.forEach((item) => {
    // Puliamo il nome da eventuali apici singoli che romperebbero la stringa onclick di JavaScript
    const safeName = item.name.replace(/'/g, "\\'");

    container.innerHTML += `
      <div class="col-12 col-lg-6">
        <div class="card custom-card h-100">
          <div class="row g-0 h-100">
            <div class="col-4">
              <img src="${item.image}" class="img-fluid rounded-start h-100"
                style="object-fit: cover; min-height: 180px" alt="${item.name}"/>
            </div>
            <div class="col-8">
              <div class="card-body d-flex flex-column h-100 py-3 px-3">
                <div class="d-flex justify-content-between align-items-start">
                  <h5 class="card-title mb-1 text-truncate">${item.name}</h5>
                </div>
                <p class="card-text small text-truncate-3 mb-3" style="flex-grow: 1; opacity: 0.8">
                  ${item.description}
                </p>
                <div class="d-flex justify-content-between align-items-end mt-auto pt-2 border-top border-secondary border-opacity-25">
                  <div class="fw-bold text-white fs-5">€ ${item.price.toFixed(2)}</div>
                  
                  <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-gradient rounded-pill px-3" 
                      onclick="addToCart({ id: '${item._id}', type: 'item', name: '${safeName}', price: ${item.price}, image: '${item.image || ''}' })">
                      <i class="bi bi-cart-plus me-1"></i> Compra
                    </button>

                    ${isCurator ? `
                    <button class="btn btn-sm btn-outline-secondary rounded-pill px-3" onclick="openEditModal('${item._id}')">
                      <i class="bi bi-pencil"></i>
                    </button>` : ""}
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  });
}

// 5. LOGICA EDITOR

function openEditModal(itemId) {
  const item = currentItems.find((i) => i._id === itemId);
  if (!item) { console.error("Item non trovato:", itemId); return; }

  document.getElementById("itemId").value = item._id;
  document.getElementById("itemName").value = item.name;
  document.getElementById("itemPrice").value = item.price;
  document.getElementById("itemDescription").value = item.description;
  document.getElementById("itemDuration").value = item.duration || "1min";
  document.getElementById("itemTone").value = item.tone || "medio";

  editModalInstance.show();
}

async function saveItem() {
  const id = document.getElementById("itemId").value;
  const updatedData = {
    name: document.getElementById("itemName").value,
    price: parseFloat(document.getElementById("itemPrice").value),
    description: document.getElementById("itemDescription").value,
    duration: document.getElementById("itemDuration").value,
    tone: document.getElementById("itemTone").value,
  };

  const saveBtn = document.querySelector("#editItemModal .btn-primary");
  const originalText = saveBtn.innerText;
  saveBtn.innerText = "Salvataggio...";
  saveBtn.disabled = true;

  try {
    const response = await fetch(`${API_BASE_URL}/items/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedData),
    });
    if (!response.ok) throw new Error("Errore nel salvataggio");

    const index = currentItems.findIndex((i) => i._id === id);
    if (index !== -1) currentItems[index] = { ...currentItems[index], ...updatedData };

    editModalInstance.hide();
    const museum = cachedMuseums.find((m) => m._id === currentMuseumId);
    renderItemsList(currentItems, museum);
    alert("Modifica salvata con successo!");
  } catch (error) {
    console.error(error);
    alert("Errore durante il salvataggio: " + error.message);
  } finally {
    saveBtn.innerText = originalText;
    saveBtn.disabled = false;
  }
}

async function loadManagedMuseums() {
  const container = document.getElementById("managed-museums-area");
  if (!container) return;

  container.innerHTML = `<div class="col-12 text-center mt-5"><div class="spinner-border text-info"></div></div>`;

  try {
    const response = await fetch(`${API_BASE_URL}/my-museums`);
    const managedMuseums = await response.json();

    if (managedMuseums.length === 0) {
      container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <p class="text-secondary">Non hai ancora musei assegnati.</p>
                    <a href="/add-museum" class="btn btn-primary">Aggiungi il tuo primo museo</a>
                </div>`;
      return;
    }

    // Riutilizziamo la tua funzione di rendering esistente!
    renderMuseumsList(managedMuseums, "managed-museums-area");
  } catch (error) {
    container.innerHTML = `<div class="alert alert-danger">Errore nel caricamento dei tuoi musei.</div>`;
  }
}
let currentBookshopMuseumId = null;

// Apre il modal e scarica gli items
async function openBookshopManager(museumId) {
  currentBookshopMuseumId = museumId;
  const modal = new bootstrap.Modal(document.getElementById('bookshopManagerModal'));
  modal.show();
  
  await loadBookshopItems();
}

// Scarica e renderizza la lista degli oggetti
async function loadBookshopItems() {
  const container = document.getElementById("bookshop-items-list");
  container.innerHTML = `<div class="text-center text-secondary my-3"><span class="spinner-border spinner-border-sm"></span> Caricamento articoli...</div>`;
  
  try {
    const res = await fetch(`${API_BASE_URL}/museums/${currentBookshopMuseumId}/items`);
    const items = await res.json();
    
    if (items.length === 0) {
      container.innerHTML = `<div class="alert alert-dark text-center">Nessun articolo presente nel bookshop.</div>`;
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="list-group-item bg-dark border-secondary text-white d-flex justify-content-between align-items-center">
        <div>
          <h6 class="mb-0">${item.name || item.title}</h6>
          <small class="text-secondary">Prezzo: €${item.price} | Categoria: ${item.category || 'N/D'} | In magazzino: <strong class="text-warning" id="stock-val-${item._id}">${item.quantity}</strong></small>
        </div>
        <div class="d-flex gap-2">
          <input type="number" id="add-qty-${item._id}" class="form-control form-control-sm" style="width: 70px;" min="1" placeholder="+ Q.tà">
          <button class="btn btn-sm btn-outline-success" onclick="addStock('${item._id}')">Aggiungi</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    container.innerHTML = `<div class="alert alert-danger">Errore nel caricamento degli articoli.</div>`;
  }
}

// Chiamata API per aggiungere pezzi in magazzino
async function addStock(itemId) {
  const input = document.getElementById(`add-qty-${itemId}`);
  const quantityToAdd = input.value;

  if (!quantityToAdd || quantityToAdd <= 0) {
    alert("Inserisci una quantità valida da aggiungere.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/items/${itemId}/add-stock`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantityToAdd })
    });
    
    if (res.ok) {
      const data = await res.json();
      // Aggiorniamo visivamente il numero senza ricaricare tutto
      document.getElementById(`stock-val-${itemId}`).innerText = data.item.quantity;
      input.value = ''; // Svuotiamo l'input
    } else {
      alert("Errore durante l'aggiunta dello stock.");
    }
  } catch (error) {
    console.error(error);
  }
}

// --- Gestione Nuovo Articolo ---

function toggleNewItemForm() {
  document.getElementById("new-item-form-container").classList.toggle("d-none");
}

document.getElementById("new-item-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const newItemData = {
    name: document.getElementById("new-item-name").value,
    price: parseFloat(document.getElementById("new-item-price").value),
    quantity: parseInt(document.getElementById("new-item-qty").value),
    category: document.getElementById("new-item-category").value,
    image: document.getElementById("new-item-image").value,       // <-- Nuovo campo catturato
    description: document.getElementById("new-item-description").value // <-- Nuovo campo catturato
  };

  try {
    const res = await fetch(`${API_BASE_URL}/museums/${currentBookshopMuseumId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newItemData)
    });
    
    if (res.ok) {
      const data = await res.json();

      e.target.reset(); // Svuota il form
      toggleNewItemForm(); // Nasconde il form
      await loadBookshopItems(); // Ricarica la lista per mostrare il nuovo nato

      fetch(`${API_BASE_URL}/ai/generate-item-targetage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: data.item._id, 
          itemName: newItemData.name,
          itemDescription: newItemData.description
        })
      })
      .then(res => res.json())
      .then(aiResponse => {
        console.log("Risposta IA ricevuta:", aiResponse);
        loadBookshopItems(); 
      })
      .catch(err => console.error("Errore di rete nella chiamata IA:", err));

    } else {
      // Estraiamo il messaggio di errore reale dal server (se Mongoose si arrabbia ancora)
      const errorData = await res.json();
      alert("Errore durante la creazione dell'articolo: " + (errorData.error || "Controlla i dati."));
    }
  } catch (error) {
    console.error(error);
  }
});
