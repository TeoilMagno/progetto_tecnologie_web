const API_BASE_URL = "http://localhost:3000/api";

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
let currentUser = null; // popolato da /api/current-user all'avvio

// 1. INIZIALIZZAZIONE
document.addEventListener("DOMContentLoaded", async () => {
  const modalEl = document.getElementById("editItemModal");
  if (modalEl) {
    editModalInstance = new bootstrap.Modal(modalEl);
  }

  // Gestione Apertura/Chiusura Sidebar
  const sidebar = document.getElementById("sidebar");
    const openBtn = document.getElementById("sidebarOpenBtn");
    const closeBtn = document.getElementById("sidebarCloseBtn");

    // Funzione per chiudere
    closeBtn.addEventListener("click", () => {
        sidebar.classList.add("collapsed");
        openBtn.classList.add("show-btn");
    });

    // Funzione per aprire
    openBtn.addEventListener("click", () => {
        sidebar.classList.remove("collapsed");
        openBtn.classList.remove("show-btn");
    });

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

// 2. UTENTE LOGGATO

async function fetchCurrentUser() {
  try {
    const res = await fetch(`${API_BASE_URL}/current-user`);
    currentUser = await res.json(); // null se non loggato, { username, role } se loggato
  } catch (e) {
    currentUser = null;
  }
  renderUserArea();
}

function renderUserArea() {
  const area = document.getElementById("user-area");

  if (currentUser) {
    const initials = (currentUser.username || currentUser.name || "?")
      .slice(0, 2)
      .toUpperCase();

    // Definiamo le voci del menu in base al ruolo
    let menuOptions = "";
    if (currentUser.role === "curator") {
      menuOptions = `
        <li><a class="dropdown-item" href="/my-museums"><i class="bi bi-bank me-2"></i>I miei musei</a></li>
        <li><a class="dropdown-item" href="/my-visits"><i class="bi bi-map me-2"></i>Le mie visite</a></li>
        <li><a class="dropdown-item" href="/add-museum"><i class="bi bi-plus-square me-2"></i>Aggiungi museo</a></li>
      `;
    } else {
      menuOptions = `
        <li><a class="dropdown-item" href="/my-visits"><i class="bi bi-collection me-2"></i>Le mie visite</a></li>
        <li><a class="dropdown-item" href="/create-visit"><i class="bi bi-plus-lg me-2"></i>Crea visita</a></li>
      `;
    }

    area.innerHTML = `
      <div class="dropdown">
        <div class="d-flex align-items-center cursor-pointer dropdown-toggle" 
            id="userDropdown" data-bs-toggle="dropdown" aria-expanded="false" style="cursor: pointer;">
          
          <div class="rounded-circle d-flex justify-content-center align-items-center fw-bold me-2"
            style="background: var(--accent-gradient); width:32px; height:32px; font-size:0.75rem; color: white;">
            ${initials}
          </div>

          <span class="fw-medium text-white">${currentUser.username || currentUser.name}</span>

          <i class="bi bi-chevron-down ms-3 custom-arrow"></i> 
        </div>
        
        <ul class="dropdown-menu dropdown-menu-end custom-dropdown-menu mt-2" aria-labelledby="userDropdown">
          ${menuOptions}
          <li><hr class="dropdown-divider border-secondary opacity-25"></li>
          <li>
            <form action="/logout" method="post" class="m-0">
              <button type="submit" class="dropdown-item text-danger">
                <i class="bi bi-box-arrow-right me-2"></i>Esci
              </button>
            </form>
          </li>
        </ul>
      </div>
    `;
  } else {
    // Utente non loggato: tasti standard
    area.innerHTML = `
      <a href="/login" class="btn btn-sm btn-outline-light px-3">Accedi</a>
      <a href="/signup" class="btn btn-sm btn-primary ms-2 px-3">Registrati</a>
    `;
  }
}

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
    const response = await fetch(`${API_BASE_URL}/museums/${museumId}/items`);
    if (!response.ok) throw new Error("Errore items");
    history.pushState({ view: 'items', id: museumId }, "", `#museum/${museumId}`);
    currentItems = await response.json();
    const museum = cachedMuseums.find((m) => m._id === museumId);
    renderItemsList(currentItems, museum);
  } catch (error) {
    console.error("Errore in getMuseumItems: ", error);
    container.innerHTML = `<div class="alert alert-danger bg-transparent text-danger border-danger">Errore: ${error.message}</div>`;
  }
}

// 4. LOGICA RENDER

function renderMuseumsList(museums) {
  const container = document.getElementById("content-area");
  container.innerHTML = "";

  museums.forEach((museum) => {
    if (!museum) return;

    const tagsHtml = museum.tags
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

function renderItemsList(items, museumInfo) {
  const container = document.getElementById("content-area");
  const title = document.getElementById("page-title");
  const backBtn = document.getElementById("back-btn");

  title.innerText = museumInfo ? museumInfo.name : "Dettaglio Museo";
  backBtn.classList.remove("d-none");
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