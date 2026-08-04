/*
  // TODO: aggiunta museo tramite json
  // TODO: correzione meta_data su mongodb
  // TODO: scrivere schema visite 
*/

// Stato globale
let cachedMuseums = [];
let currentItems = [];
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
  window.addEventListener('popstate', (event) => {
    if (event.state && event.state.view === 'items') {
      // Se lo stato indica che eravamo in un museo, carichiamo gli items
      getMuseumItems(event.state.id, true); // Passiamo un flag per evitare pushState duplicati
    } else {
      // Altrimenti torniamo alla lista generale
      getMuseums(true);
    }
  });

  // Carica utente dal server (Passport) e poi carica i musei
  await fetchCurrentUser();
  getMuseums();
});

// 3. LOGICA API (FETCH)

async function getMuseums() {
  const container = document.getElementById("content-area");

  // 1. SE IL CONTAINER NON ESISTE (es. siamo nella pagina I Miei Musei), FERMATI.
  if (!container) return;

  const title = document.getElementById("page-title");
  const backBtn = document.getElementById("back-btn");

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

    // Renderizza passandogli esplicitamente l'id (per evitare conflitti)
    renderMuseumsList(cachedMuseums, "content-area");
  } catch (error) {
    console.error(error);
    container.innerHTML = `<div class="alert alert-danger bg-transparent text-danger border-danger">Errore caricamento dati. Il server è attivo?</div>`;
  }
}

async function getMuseumItems(museumId) {
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
    history.pushState({ view: 'museum', id: museumId }, "", `#museum/${museumId}`);
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

  museums.forEach((museum) => {
    if (!museum) return; // Controllo di sicurezza che avevamo aggiunto

    const tags = museum.tags || [];
    const tagsHtml = tags
        .map((tag) => `<span class="badge badge-tag">${tag}</span>`)
        .join("");

    container.innerHTML += `
      <div class="col">
        <div class="card h-100 custom-card cursor-pointer" onclick="getMuseumItems('${museum._id}')" style="cursor: pointer;">
          <img src="${museum.image}" class="card-img-top" alt="${museum.name}" style="height: 200px; object-fit: cover; opacity: 0.9;">
          <div class="card-body">
            <h5 class="card-title">${museum.name}</h5>
            <p class="card-text small mb-3"><i class="bi bi-geo-alt me-1"></i> ${museum.address}</p>
            <div>${tagsHtml}</div>
          </div>
        </div>
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
    `;
    
    // controlliamo se l'utente puo' mostrare
    checkIfMuseumIsManaged(museumInfo._id);
  }
  if (backBtn) backBtn.classList.remove("d-none");

  // 2. Renderizziamo la barra di navigazione simmetrica, sottile e con stile tab personalizzato
  container.innerHTML = `
    <div class="w-100 mb-4 px-0">
      <div class="row g-0 border-bottom border-secondary border-opacity-25 p-0 w-100 mx-0" style="background: transparent;">
        <div class="col-6 p-0">
          <button id="tab-works" 
                  class="btn w-100 py-2 small rounded-top-3 border-0 ${currentView === 'works' ? 'tab-custom-active' : 'btn-glass text-secondary'}" 
                  onclick="switchMuseumView('works', '${museumInfo._id}')">
            <i class="bi bi-palette me-2"></i>Opere Esposte
          </button>
        </div>
        <div class="col-6 p-0">
          <button id="tab-items" 
                  class="btn w-100 py-2 small rounded-top-3 border-0 ${currentView === 'items' ? 'tab-custom-active' : 'btn-glass text-secondary'}" 
                  onclick="switchMuseumView('items', '${museumInfo._id}')">
            <i class="bi bi-bag-check me-2"></i>Bookshop & Servizi
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

// controlla se l'utente gestisce un determinato museo
async function checkIfMuseumIsManaged(currentMuseumId) {
  if (!currentUser || currentUser.role !== 'curator') {
    return;
  }

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
        if (editBtn) {
          editBtn.classList.remove("d-none");
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
  
  if (!tabWorks || !tabItems) return;
  
  if (view === 'works') {
    tabWorks.classList.remove("btn-glass", "text-secondary");
    tabWorks.classList.add("tab-custom-active");
    
    tabItems.classList.remove("tab-custom-active");
    tabItems.classList.add("btn-glass", "text-secondary");
  } else {
    tabItems.classList.remove("btn-glass", "text-secondary");
    tabItems.classList.add("tab-custom-active");
    
    tabWorks.classList.remove("tab-custom-active");
    tabWorks.classList.add("btn-glass", "text-secondary");
  }
  
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
    // Scegliamo l'endpoint corretto (opere o articoli di vendita)
    const endpoint = view === 'works' 
      ? `${API_BASE_URL}/museums/${museumId}/works` 
      : `${API_BASE_URL}/museums/${museumId}/items`;

    const response = await fetch(endpoint);
    if (!response.ok) throw new Error("Errore nel caricamento dei dati");
    const data = await response.json();

    if (view === 'works') {
      renderWorksList(data); // Rendering per le Opere
    } else {
      currentItems = data; // Conserviamo gli articoli per l'editor
      renderItemsList(data); // Il tuo vecchio rendering per gli Articoli (in vendita)
    }
  } catch (error) {
    console.error(error);
    subContainer.innerHTML = `<div class="col-12 text-center text-danger small py-3">Impossibile caricare i contenuti: ${error.message}</div>`;
  }
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
    container.innerHTML = '<div class="col-12 text-center text-secondary py-5">Nessuna opera presente.</div>';
    return;
  }

  const isCurator = currentUser && currentUser.role === "curator";

  items.forEach((item) => {
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
                  ${isCurator ? `
                  <button class="btn btn-sm btn-outline-secondary rounded-pill px-3" onclick="openEditModal('${item._id}')">
                    <i class="bi bi-pencil me-1"></i> Modifica
                  </button>` : ""}
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
