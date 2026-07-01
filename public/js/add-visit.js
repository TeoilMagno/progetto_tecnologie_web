// Stato globale della visita in creazione
let currentVisitCart = []; // Array che conterrà gli ID (o gli oggetti) delle opere
let currentMuseumId = null;

// TODO: da modificare in produzione
const API_URL = "http://localhost:3000/api";

document.addEventListener("DOMContentLoaded", () => {
  // 1. INIZIALIZZA IL DRAG & DROP
  const cartListElement = document.getElementById("visit-cart-list");
  if (cartListElement) {
    new Sortable(cartListElement, {
      handle: ".drag-handle", // Solo l'hamburger menu può iniziare il trascinamento
      animation: 150, // Animazione fluida (stile Mint)
      ghostClass: "sortable-ghost",

      // 2. AGGIORNA L'ARRAY QUANDO FINISCI DI TRASCINARE
      onEnd: function (evt) {
        // Sposta l'elemento nell'array in base al nuovo indice
        const movedItem = currentVisitCart.splice(evt.oldIndex, 1)[0];
        currentVisitCart.splice(evt.newIndex, 0, movedItem);

        console.log("Nuovo ordine della visita:", currentVisitCart);
      },
    });
  }

  const urlParams = new URLSearchParams(window.location.search);
  const preselectedMuseumId = urlParams.get("museumId");

  if (preselectedMuseumId) {
    // Caso A: L'utente è arrivato cliccando "Crea visita qui" da un museo
    currentMuseumId = preselectedMuseumId;
    loadMuseumWorks(preselectedMuseumId);
  } else {
    // Caso B: L'utente è arrivato dal menu generale (nessun ID)
    showMuseumSelector();
  }
});

async function loadMuseumWorks(museumId) {
  const catalogArea = document.getElementById("works-catalog-area");
  const museumNameLabel = document.getElementById("current-museum-name");

  catalogArea.innerHTML = `<div class="col-12 text-center mt-4"><div class="spinner-border text-info"></div></div>`;

  try {
    // 1. Recuperiamo i dettagli del museo (per il nome) e le sue opere
    const itemsRes = await fetch(`${API_URL}/museums/${museumId}/items`);
    const items = await itemsRes.json();

    // (Opzionale: potresti fare una fetch anche per avere il nome esatto del museo)
    museumNameLabel.innerText = "Catalogo caricato"; // Qui metteremo il nome reale se lo fetchi

    if (items.length === 0) {
      catalogArea.innerHTML = `<p class="text-secondary">Questo museo non ha ancora opere disponibili.</p>`;
      return;
    }

    // 2. Inseriamo le opere nella colonna di sinistra
    catalogArea.innerHTML = "";
    items.forEach((item) => {
      catalogArea.innerHTML += `
                <div class="col">
                    <div class="card custom-card h-100">
                        <div class="row g-0 h-100">
                            <div class="col-4">
                                <img src="${item.image}" class="img-fluid rounded-start h-100" style="object-fit: cover; min-height: 120px;">
                            </div>
                            <div class="col-8">
                                <div class="card-body p-2 d-flex flex-column h-100">
                                    <h6 class="card-title mb-1 text-truncate">${item.name}</h6>
                                    <p class="small text-secondary mb-2" style="font-size: 0.75rem;">€ ${item.price.toFixed(2)}</p>
                                    <button class="btn btn-sm btn-outline-light mt-auto w-100" onclick="addToVisit('${item._id}', '${item.name.replace(/'/g, "\\'")}')">
                                        <i class="bi bi-plus"></i> Aggiungi
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
    });
  } catch (error) {
    catalogArea.innerHTML = `<p class="text-danger">Errore nel caricamento delle opere.</p>`;
  }
}

async function showMuseumSelector() {
  const catalogArea = document.getElementById("works-catalog-area");
  const museumNameLabel = document.getElementById("current-museum-name");

  museumNameLabel.innerText = "Scelta del museo";
  catalogArea.innerHTML = `<div class="col-12 text-center mt-4"><div class="spinner-border text-info"></div></div>`;

  try {
    // Scarica la lista di TUTTI i musei (o potresti fare /api/my-museums se vuoi limitare)
    const res = await fetch(`${API_URL}/museums`);
    const museums = await res.json();

    catalogArea.innerHTML = `
            <div class="col-12">
                <p class="text-white mb-3">Seleziona il museo in cui vuoi creare la tua visita:</p>
                <div class="list-group bg-transparent">
                    ${museums
                      .map(
                        (m) => `
                        <button class="list-group-item list-group-item-action bg-transparent text-white border-secondary mb-2 rounded" 
                                onclick="window.location.href='/create-visit?museumId=${m._id}'">
                            <i class="bi bi-bank me-2"></i> ${m.name}
                        </button>
                    `,
                      )
                      .join("")}
                </div>
            </div>
        `;
  } catch (error) {
    catalogArea.innerHTML = `<p class="text-danger">Errore nel caricamento dei musei.</p>`;
  }
}

// Funzione richiamata dal bottone "Aggiungi" sulle opere a sinistra
function addToVisit(itemId, itemName) {
  // Evita duplicati
  if (currentVisitCart.some((item) => item.id === itemId)) {
    alert("Quest'opera è già nella tua visita!");
    return;
  }

  // Aggiungi all'array
  currentVisitCart.push({ id: itemId, name: itemName });

  // Aggiorna l'interfaccia
  renderVisitCart();
}

function removeFromVisit(itemId) {
  currentVisitCart = currentVisitCart.filter((item) => item.id !== itemId);
  renderVisitCart();
}

function renderVisitCart() {
  const cartList = document.getElementById("visit-cart-list");
  const emptyMsg = document.getElementById("empty-cart-msg");
  const saveBtn = document.getElementById("save-visit-btn");

  cartList.innerHTML = "";

  if (currentVisitCart.length === 0) {
    emptyMsg.classList.remove("d-none");
    saveBtn.classList.add("disabled");
    return;
  }

  emptyMsg.classList.add("d-none");
  saveBtn.classList.remove("disabled");

  currentVisitCart.forEach((item) => {
    cartList.innerHTML += `
            <li class="list-group-item bg-transparent text-white d-flex justify-content-between align-items-center border-secondary border-opacity-25" data-id="${item.id}">
                <div class="d-flex align-items-center">
                    <i class="bi bi-list drag-handle text-secondary me-3 fs-5"></i>
                    <span class="text-truncate" style="max-width: 180px;">${item.name}</span>
                </div>
                <button class="btn btn-sm btn-outline-danger border-0 rounded-circle" onclick="removeFromVisit('${item.id}')">
                    <i class="bi bi-x-lg"></i>
                </button>
            </li>
        `;
  });
}

// ------ salvataggio -----
async function submitVisit() {
  if (currentVisitCart.length === 0) {
    alert("Devi aggiungere almeno un'opera alla tua visita!");
    return;
  }
  if (!currentMuseumId) {
    alert("Errore critico: Nessun museo selezionato.");
    return;
  }

  // 2. Lettura dei valori dalla futura modale HTML
  const titleInput = document.getElementById("visit-title");
  if (!titleInput || !titleInput.value.trim()) {
    alert("Il titolo della visita è obbligatorio.");
    return;
  }

  const description = document.getElementById("visit-desc")?.value || "";

  const priceInput = document.getElementById("visit-price");
  const price =
    priceInput && priceInput.value ? parseFloat(priceInput.value) : 0;

  const publicCheckbox = document.getElementById("visit-public");
  const isPublic = publicCheckbox ? publicCheckbox.checked : false;

  // 3. Estrazione degli ID delle opere
  // Il DB si aspetta un array di ObjectId (stringhe)
  const itemIds = currentVisitCart.map((item) => item.id);

  // TODO: aggiungere "salva come bozza"
  // 4. Costruzione del Payload (il pacchetto dati da inviare)
  const payload = {
    title: titleInput.value.trim(),
    description: description,
    museumId: currentMuseumId,
    items: itemIds,
    price: price,
    isPublic: isPublic,
    // Se isPublic è vero, non è una bozza. Altrimenti è una bozza.
    isDraft: !isPublic,
  };

  // Cambiamo il testo del bottone per far capire che stiamo caricando
  const submitBtn = document.getElementById("confirm-save-visit-btn");
  if (submitBtn) {
    submitBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm"></span> Salvataggio...';
    submitBtn.disabled = true;
  }

  // 5. La chiamata Fetch
  try {
    const response = await fetch(`${API_URL}/visits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Errore dal server durante il salvataggio.",
      );
    }

    // Successo!
    alert("Visita creata con successo!");

    // Svuotiamo il carrello e reindirizziamo l'utente alla pagina delle sue visite
    currentVisitCart = [];
    window.location.href = "/my-visits";
  } catch (error) {
    console.error("Errore salvataggio:", error);
    alert(error.message);

    // Ripristiniamo il bottone in caso di errore
    if (submitBtn) {
      submitBtn.innerHTML = "Salva Visita";
      submitBtn.disabled = false;
    }
  }
}
