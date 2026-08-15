// Stato globale della visita in creazione
let currentVisitCart = []; // Array che conterrà gli ID (o gli oggetti) delle opere
let currentMuseumId = null;
let editingVisitId = null;
let isCurrentVisitDraft = true;
let currentMuseumCatalog = [];

document.addEventListener("DOMContentLoaded", async () => {
  // inizializza il drag & drop
  const cartListElement = document.getElementById("visit-cart-list");

  // Ascoltatori per l'autosalvataggio sui campi di testo
  document
    .getElementById("visit-title")
    ?.addEventListener("input", triggerAutoSave);
  document
    .getElementById("visit-desc")
    ?.addEventListener("input", triggerAutoSave);

  if (cartListElement) {
    new Sortable(cartListElement, {
      handle: ".drag-handle",
      animation: 150,
      ghostClass: "sortable-ghost",
      onEnd: function (evt) {
        const movedItem = currentVisitCart.splice(evt.oldIndex, 1)[0];
        currentVisitCart.splice(evt.newIndex, 0, movedItem);
        console.log("Nuovo ordine della visita:", currentVisitCart);

        triggerAutoSave();
        triggerDurationUpdate();
      },
    });
  }

  const urlParams = new URLSearchParams(window.location.search);
  const preselectedMuseumId = urlParams.get("museumId");

  // Assegniamo la variabile globale
  editingVisitId = urlParams.get("editId") || urlParams.get("edit");

  if (preselectedMuseumId) {
    currentMuseumId = preselectedMuseumId;
    loadMuseumWorks(preselectedMuseumId);
  } else if (!editingVisitId) {
    showMuseumSelector();
  }

  await checkUserRole();

  // Inizializzazione barra di ricerca
  const searchContainer = document.getElementById("search-container");
  const searchToggleBtn = document.getElementById("search-toggle-btn");
  const searchInput = document.getElementById("catalog-search-input");

  if (searchToggleBtn && searchInput) {
    searchToggleBtn.addEventListener("click", () => {
      searchContainer.classList.toggle("active");
      if (searchContainer.classList.contains("active")) {
        searchInput.focus();
      } else {
        searchInput.value = "";
        // Se la barra viene chiusa, mostriamo di nuovo tutto il catalogo
        if (currentMuseumCatalog.length > 0) renderCatalog(currentMuseumCatalog);
      }
    });

    searchInput.addEventListener("input", (e) => {
      const query = e.target.value;
      if (!currentMuseumId || currentMuseumCatalog.length === 0) return; 
      
      // Filtriamo usando la fuzzySearch condivisa (Cerca per nome opera o nome autore)
      const filtered = currentMuseumCatalog.filter(work => 
        fuzzySearch(query, work.name) || 
        (work.author && fuzzySearch(query, work.author))
      );
      renderCatalog(filtered);
    });
  }

  // Gestione bozza
  if (editingVisitId) {
    try {
      const res = await fetch(`${API_BASE_URL}/visits/${editingVisitId}`);
      if (res.ok) {
        const draft = await res.json();

        // TRASFORMAZIONE CORRETTIVA: Convertiamo gli _id del DB in id per il carrello del front-end
        currentVisitCart = (draft.works || []).map((work) => ({
          id: work._id, // Prende il trattino basso e lo uniforma
          name: work.name,
        }));

        // Se la bozza ha già un museo associato, lo impostiamo
        // TODO: magari uniformare back end e front end?
        currentMuseumId = draft.museumId?._id || draft.museumId;

        renderVisitCart();

        // Popoliamo i campi
        document.getElementById("visit-title").value = draft.title || "";
        document.getElementById("visit-desc").value = draft.description || "";
        document.getElementById("visit-price").value = draft.price || "";
        document.getElementById("visit-public").checked = draft.isPublic || false;

        isCurrentVisitDraft = draft.isDraft !== false;

        const saveVisitBtn = document.getElementById("save-visit-btn");
        const saveDraftBtn = document.getElementById("save-draft-btn");

        if (isCurrentVisitDraft) {
          if (saveVisitBtn) saveVisitBtn.innerText = "Aggiorna Bozza";
          if (saveDraftBtn) saveDraftBtn.classList.remove("d-none");
        } else {
          if (saveVisitBtn) saveVisitBtn.innerText = "Aggiorna Visita";
          // Nascondiamo il tasto Salva Bozza se è una visita definitiva
          if (saveDraftBtn) saveDraftBtn.classList.add("d-none"); 
        }

        const deleteVisitBtn = document.getElementById("delete-visit-btn");
        if (deleteVisitBtn) {
          deleteVisitBtn.classList.remove("d-none");
          deleteVisitBtn.innerHTML = isCurrentVisitDraft ? '<i class="bi bi-trash me-1"></i> Elimina Bozza' : '<i class="bi bi-trash me-1"></i> Elimina Visita';
        }

        if (currentMuseumId) {
          loadMuseumWorks(currentMuseumId);
        }

        triggerDurationUpdate();
      }
    } catch (e) {
      console.error("Errore nel caricamento della bozza", e);
    }
  }
});

// controlla se lo user e' un curatore o un visitatore
async function checkUserRole() {
  try {
    const response = await fetch(`${API_BASE_URL}/current-user`);
    if (response.ok) {
      const user = await response.json();
      // se lo user e' un curatore mostriamo le opzioni eslcusive per curatori
      if (user?.role === "curator" || user?.role === "admin") {
        document
          .getElementById("curator-options-area")
          .classList.remove("d-none");
      }
    }
  } catch (error) {
    console.error("Error checking user role:", error);
  }
}

async function loadMuseumWorks(museumId) {
  const catalogArea = document.getElementById("works-catalog-area");
  const museumNameLabel = document.getElementById("current-museum-name");

  catalogArea.innerHTML = `<div class="col-12 text-center mt-4"><div class="spinner-border text-info"></div></div>`;

  try {
    const worksRes = await fetch(`${API_BASE_URL}/museums/${museumId}/works`);
    currentMuseumCatalog = await worksRes.json(); // Salviamo i dati globalmente!

    museumNameLabel.innerText = "Catalogo caricato";
    
    // Chiamiamo la nuova funzione di render
    renderCatalog(currentMuseumCatalog);
    
  } catch (error) {
    console.error("Dettaglio errore intercettato:", error);
    catalogArea.innerHTML = `<p class="text-danger">Errore nel caricamento delle opere.</p>`;
  }
}

// Dedicata esclusivamente a renderizzare le opere
function renderCatalog(worksArray) {
  const catalogArea = document.getElementById("works-catalog-area");
  
  if (worksArray.length === 0) {
    catalogArea.innerHTML = `<p class="text-secondary text-center w-100 mt-4">Nessuna opera corrispondente trovata.</p>`;
    return;
  }

  catalogArea.innerHTML = "";
  worksArray.forEach((work) => {
    const workImage = work.image || "/img/fallback-work.jpg";
    const workAuthor = work.author || "Autore sconosciuto";

    catalogArea.innerHTML += `
      <div class="col">
          <div class="card custom-card h-100">
              <div class="row g-0 h-100">
                  <div class="col-4">
                      <img src="${workImage}" class="img-fluid rounded-start h-100" style="object-fit: cover; min-height: 120px; width: 100%;">
                  </div>
                  <div class="col-8">
                      <div class="card-body p-2 d-flex flex-column h-100">
                          <h6 class="card-title mb-1 text-truncate">${work.name}</h6>
                          <p class="small text-secondary mb-2" style="font-size: 0.75rem;">${workAuthor}</p>
                          <button class="btn btn-sm btn-outline-light mt-auto w-100" onclick="addToVisit('${work._id}', '${work.name.replace(/'/g, "\\'")}')">
                              <i class="bi bi-plus"></i> Aggiungi
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    `;
  });
}

async function showMuseumSelector() {
  const catalogArea = document.getElementById("works-catalog-area");
  const museumNameLabel = document.getElementById("current-museum-name");

  museumNameLabel.innerText = "Scelta del museo";
  catalogArea.innerHTML = `<div class="col-12 text-center mt-4"><div class="spinner-border text-info"></div></div>`;

  try {
    const res = await fetch(`${API_BASE_URL}/museums`);
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
    console.error("Motivo errore:", error);
    catalogArea.innerHTML = `<p class="text-danger">Errore nel caricamento dei musei.</p>`;
  }
}

function addToVisit(workId, workName) {
  if (currentVisitCart.some((work) => work.id === workId)) {
    alert("Quest'opera è già nella tua visita!");
    return;
  }
  currentVisitCart.push({ id: workId, name: workName });
  renderVisitCart();

  triggerAutoSave();
  triggerDurationUpdate();
}

function removeFromVisit(workId) {
  currentVisitCart = currentVisitCart.filter((work) => work.id !== workId);
  renderVisitCart();

  triggerAutoSave();
  triggerDurationUpdate();
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

// Aggiunto il parametro isSavingAsDraft (di default false)
async function submitVisit(isSavingAsDraft = false) {
  clearTimeout(autoSaveTimeout); // evita race conditions con il timer dell'auto-save

  if (currentVisitCart.length === 0) {
    alert("Devi aggiungere almeno un'opera alla tua visita!");
    return;
  }
  if (!currentMuseumId) {
    alert("Errore critico: Nessun museo selezionato.");
    return;
  }

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

  // LA MAGIA DEI 3 STATI:
  // Se premo "Salva Bozza", forziamo isPublic a false.
  // Altrimenti, dipende dalla spunta della checkbox.
  const isPublic = isSavingAsDraft
    ? false
    : publicCheckbox
      ? publicCheckbox.checked
      : false;
  const isDraft = isSavingAsDraft;

  const workIds = currentVisitCart.map((work) => work.id);

  const payload = {
    title: titleInput.value.trim(),
    description: description,
    museumId: currentMuseumId,
    works: workIds,
    price: price,
    isPublic: isPublic,
    isDraft: isDraft,
  };

  const submitBtn = document.getElementById("confirm-save-visit-btn");
  const draftBtn = document.getElementById("save-draft-btn");

  // Animazione di caricamento sul bottone cliccato
  if (submitBtn && draftBtn) {
    if (isSavingAsDraft) {
      draftBtn.innerHTML =
        '<span class="spinner-border spinner-border-sm"></span> Salvataggio...';
    } else {
      submitBtn.innerHTML =
        '<span class="spinner-border spinner-border-sm"></span> Salvataggio...';
    }
    submitBtn.disabled = true;
    draftBtn.disabled = true;
  }

  const method = editingVisitId ? "PUT" : "POST";
  const endpoint = editingVisitId
    ? `${API_BASE_URL}/visits/${editingVisitId}`
    : `${API_BASE_URL}/visits`;

  try {
    const response = await fetch(endpoint, {
      method: method,
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

    // Recuperiamo l'ID univoco della visita (sia in caso di modifica che di nuova creazione)
    const finalVisitId = editingVisitId || (data.visit ? data.visit._id : data._id);

    currentVisitCart = [];
    localStorage.setItem("visitsChanged", "true");

    if (isSavingAsDraft) {
      alert("Bozza salvata con successo!");
      window.location.href = "/my-visits"; // Le bozze rimangono nella lista "Le mie visite"
    } else {
      alert(
        isPublic
          ? "Visita pubblicata sul Marketplace!"
          : "Visita privata salvata con successo!"
      );
      // Reindirizza direttamente alla pagina di dettaglio della visita creata/modificata!
      window.location.href = `/visit-details?id=${finalVisitId}`;
    }
  } catch (error) {
    console.error("Errore salvataggio:", error);
    alert(error.message);

    // Ripristino bottoni in caso di errore
    if (submitBtn && draftBtn) {
      draftBtn.innerHTML =
        '<i class="bi bi-pencil-square me-1"></i> Salva Bozza';
      submitBtn.innerHTML = "Salva Definitivo";
      submitBtn.disabled = false;
      draftBtn.disabled = false;
    }
  }
}

// --- autosalvataggio ---
let autoSaveTimeout = null;

function triggerAutoSave() {
  clearTimeout(autoSaveTimeout);

  // Attendi 2 secondi dall'ultimo click o dall'ultima lettera digitata
  autoSaveTimeout = setTimeout(() => {
    autoSaveDraft();
  }, 2000);
}

async function autoSaveDraft() {
  // blocca l'autosalvataggio se la visita è definitiva (pubblica o privata) -> impedisce di caricare sul marketplace dati non definitivi
  if (!isCurrentVisitDraft) return;

  // Se non c'è un museo, non possiamo collegare la visita a nulla
  if (!currentMuseumId) return;

  const titleInput = document.getElementById("visit-title")?.value.trim();
  const descInput = document.getElementById("visit-desc")?.value.trim();
  const price = parseFloat(document.getElementById("visit-price")?.value) || 0;

  // CONDIZIONE: Se il carrello è vuoto E non ha scritto né titolo né descrizione, FERMATI.
  if (currentVisitCart.length === 0 && !titleInput && !descInput) {
    return;
  }

  const payload = {
    title: titleInput || "Bozza in corso...", // Fallback essenziale se non ha ancora aperto la modale
    description: descInput || "",
    museumId: currentMuseumId,
    works: currentVisitCart.map((work) => work.id),
    price: price,
    isPublic: false,
    isDraft: true, // È sempre una bozza
  };

  const method = editingVisitId ? "PUT" : "POST";
  const endpoint = editingVisitId
    ? `${API_BASE_URL}/visits/${editingVisitId}`
    : `${API_BASE_URL}/visits`;

  try {
    const response = await fetch(endpoint, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();

      // Se era la PRIMA volta che salvavamo in automatico (POST)...
      // CORREZIONE: Andiamo a leggere l'ID dentro data.visit._id !
      if (!editingVisitId && data.visit && data.visit._id) {
        editingVisitId = data.visit._id; // Aggiorniamo la variabile globale!

        // Aggiorniamo l'URL in alto senza ricaricare la pagina
        window.history.replaceState(
          null,
          "",
          `/create-visit?editId=${editingVisitId}`,
        );
      }

      localStorage.setItem("visitsChanged", "true");

      console.log(
        "Bozza salvata/aggiornata in automatico alle:",
        new Date().toLocaleTimeString(),
      );
    }
  } catch (error) {
    console.error("Errore nell'autosalvataggio in background", error);
  }
}

// funzione per eliminare definitivamente la visita/bozza
async function deleteVisit() {
  if (!editingVisitId) return; // Se non stiamo modificando nulla, esci
  
  const confirmMsg = isCurrentVisitDraft 
    ? "Sei sicuro di voler eliminare questa bozza?" 
    : "Attenzione: sei sicuro di voler eliminare definitivamente questa visita? Verrà rimossa dal marketplace.";
    
  if (!confirm(confirmMsg)) return;

  try {
    const response = await fetch(`${API_BASE_URL}/visits/${editingVisitId}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      alert("Eliminata con successo.");
      
      // Resettiamo il localStorage per forzare il refresh nella pagina "Le mie visite"
      localStorage.setItem("visitsChanged", "true");
      
      // Disattiviamo il timer di autosalvataggio per evitare che resusciti la bozza!
      clearTimeout(autoSaveTimeout); 
      
      window.location.href = "/my-visits";
    } else {
      const data = await response.json();
      alert(data.error || "Errore durante l'eliminazione.");
    }
  } catch (error) {
    console.error("Errore eliminazione:", error);
    alert("Errore di connessione con il server.");
  }
}

// Funzione chiamata dal menu a tendina o dai cambiamenti del carrello
function triggerDurationUpdate() {
  const currentPrefLength = document.getElementById("visit-pref-length")?.value || 'medium';
  // Estraiamo solo gli ID dal carrello attuale
  const workIds = currentVisitCart.map(work => work.id);
  
  updateUIEstimatedDuration(workIds, currentPrefLength);
}

// Chiamata API vera e propria
async function updateUIEstimatedDuration(workIds, currentPrefLength) {
  const durationBadge = document.getElementById("tour-duration-badge");
  if (!durationBadge) return;

  if (workIds.length === 0) {
    durationBadge.innerText = "0 min";
    return;
  }

  durationBadge.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span>`;

  try {
    const response = await fetch(`${API_BASE_URL}/visits/estimate-duration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workIds, preferredLength: currentPrefLength })
    });
    
    if (response.ok) {
      const data = await response.json();
      durationBadge.innerText = `${data.duration} min`;
    }
  } catch (error) {
    console.error("Impossibile calcolare il tempo stimato:", error);
    durationBadge.innerText = "Errore";
  }
}