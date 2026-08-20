let newAdoptionModalInstance = null;
let currentUserId = null;
let cachedIncoming = [];
let cachedOutgoing = [];

document.addEventListener("DOMContentLoaded", async () => {
  newAdoptionModalInstance = new bootstrap.Modal(document.getElementById("newAdoptionModal"));
  
  await fetchCurrentUser();
  if (currentUser) currentUserId = currentUser._id;

  await loadAdoptions();

  // --- INIZIALIZZAZIONE BARRA DI RICERCA ---
  const searchContainer = document.getElementById("search-container");
  const searchToggleBtn = document.getElementById("search-toggle-btn");
  const searchInput = document.getElementById("adoptions-search-input");

  if (searchToggleBtn && searchInput) {
    searchToggleBtn.addEventListener("click", () => {
      searchContainer.classList.toggle("active");
      if (searchContainer.classList.contains("active")) {
        searchInput.focus();
      } else {
        searchInput.value = "";
        // Ripristina tutto
        renderAdoptionsList(cachedIncoming, document.getElementById("incoming-container"), true);
        renderAdoptionsList(cachedOutgoing, document.getElementById("outgoing-container"), false);
      }
    });

    searchInput.addEventListener("input", (e) => {
      const query = e.target.value;
      
      // Funzione di filtro riutilizzabile per le adozioni
      const filterAdoptions = (adoption) => {
        const workName = adoption.workId ? adoption.workId.name : "";
        const fromMuseum = adoption.fromMuseumId ? adoption.fromMuseumId.name : "";
        const toMuseum = adoption.toMuseumId ? adoption.toMuseumId.name : "";
        
        return fuzzySearch(query, workName) || fuzzySearch(query, fromMuseum) || fuzzySearch(query, toMuseum);
      };

      // Filtra e renderizza simultaneamente entrambe le schede
      const filteredIncoming = cachedIncoming.filter(filterAdoptions);
      const filteredOutgoing = cachedOutgoing.filter(filterAdoptions);

      renderAdoptionsList(filteredIncoming, document.getElementById("incoming-container"), true);
      renderAdoptionsList(filteredOutgoing, document.getElementById("outgoing-container"), false);
    });
  }
});

// Carica tutte le adozioni dell'utente e le divide in Inviate e Ricevute
async function loadAdoptions() {
  const incomingContainer = document.getElementById("incoming-container");
  const outgoingContainer = document.getElementById("outgoing-container");

  try {
    const res = await fetch(`${API_BASE_URL}/my-adoptions`);
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }

    const adoptions = await res.json();

    // Filtro rigoroso basato esclusivamente sugli ID dei curatori
    cachedIncoming = adoptions.filter(a => String(a.fromCuratorId) === String(currentUserId));
    cachedOutgoing = adoptions.filter(a => String(a.toCuratorId) === String(currentUserId));

    // Renderizziamo le due sezioni
    renderAdoptionsList(cachedIncoming, incomingContainer, true);
    renderAdoptionsList(cachedOutgoing, outgoingContainer, false);
  } catch (error) {
    console.error("Errore caricamento adozioni:", error);
    incomingContainer.innerHTML = `<div class="alert alert-danger col-12">Errore nel caricamento delle adozioni.</div>`;
  }
}

function renderAdoptionsList(list, container, isIncoming) {
  if (list.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5 text-secondary col-12">
        <i class="bi bi-inbox fs-1 mb-2 opacity-50"></i>
        <p>Nessuna richiesta ${isIncoming ? 'ricevuta' : 'inviata'}.</p>
      </div>`;
    return;
  }

  container.innerHTML = "";

  list.forEach(a => {
    const workName = a.workId ? a.workId.name : "Opera non specificata";
    const workImg = a.workId ? (a.workId.image || "/img/fallback-work.jpg") : "/img/fallback-work.jpg";
    const fromMuseumName = a.fromMuseumId ? a.fromMuseumId.name : "Museo Originario";
    const toMuseumName = a.toMuseumId ? a.toMuseumId.name : "Museo Destinatario";

    const beginDate = new Date(a.beginDate).toLocaleDateString('it-IT');
    const endDate = new Date(a.endDate).toLocaleDateString('it-IT');

    // BADGE STATO
    let statusBadge = "";
    if (a.status === 'pending') {
      statusBadge = `<span class="badge bg-warning text-dark"><i class="bi bi-clock me-1"></i>In Attesa</span>`;
    } else if (a.status === 'accepted') {
      statusBadge = `<span class="badge bg-info text-dark"><i class="bi bi-truck me-1"></i>In Transito</span>`;
    } else if (a.status === 'active') {
      statusBadge = `<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>In Prestito (Attivo)</span>`;
    } else if (a.status === 'refused') {
      statusBadge = `<span class="badge bg-danger"><i class="bi bi-x-circle me-1"></i>Rifiutata</span>`;
    } else if (a.status === 'completed') {
      statusBadge = `<span class="badge bg-secondary"><i class="bi bi-flag me-1"></i>Completata (Restituita)</span>`;
    }

    // BOTTONI DI AZIONE
    let actionButtons = "";
    if (isIncoming && a.status === 'pending') {
      // 1. Chi RICEVE la richiesta (Proprietario) decide se accettare o rifiutare
      actionButtons = `
        <div class="d-flex gap-2 mt-3 pt-2 border-top border-secondary border-opacity-25">
          <button class="btn btn-sm btn-success flex-grow-1" onclick="respondAdoption('${a._id}', 'accepted')">
            <i class="bi bi-check-lg me-1"></i>Accetta
          </button>
          <button class="btn btn-sm btn-outline-danger flex-grow-1" onclick="respondAdoption('${a._id}', 'refused')">
            <i class="bi bi-x-lg me-1"></i>Rifiuta
          </button>
        </div>`;
    } else if (!isIncoming && a.status === 'accepted') {
      // 2. Chi ha INVIATO la richiesta (Richiedente), quando il proprietario accetta, conferma l'arrivo
      actionButtons = `
        <div class="mt-3 pt-2 border-top border-secondary border-opacity-25">
          <button class="btn btn-sm btn-info w-100 text-dark fw-bold" onclick="confirmArrival('${a._id}')">
            <i class="bi bi-box-arrow-in-down me-1"></i>Conferma Arrivo Opera
          </button>
        </div>`;
    } else if (a.status === 'active') {
      // 3. Quando è attiva, si può procedere alla restituzione
      actionButtons = `
        <div class="mt-3 pt-2 border-top border-secondary border-opacity-25">
          <button class="btn btn-sm btn-outline-info w-100" onclick="completeAdoption('${a._id}')">
            <i class="bi bi-arrow-return-left me-1"></i>Segna come Restituita
          </button>
        </div>`;
    }

    // CONTROLLO ELIMINAZIONI (HARD DELETE)
    let deletionWarning = "";
    if (!a.workId || !a.fromMuseumId || !a.toMuseumId) {
      let missingEntity = !a.workId ? "L'opera" : "Uno dei musei coinvolti";
      deletionWarning = `
        <div class="alert alert-danger mt-2 mb-0 py-2 px-2 small border-danger text-light d-flex align-items-center">
          <i class="bi bi-exclamation-octagon-fill fs-5 me-2 text-danger"></i> 
          <span><strong>Attenzione:</strong> ${missingEntity} è stata eliminata dal database. Questa adozione è corrotta.</span>
        </div>
      `;
      // Disabilitiamo i bottoni per evitare crash al backend
      actionButtons = ""; 
    }

    container.innerHTML += `
      <div class="col">
        <div class="card custom-card h-100 border border-secondary border-opacity-25">
          <div class="card-body p-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              ${statusBadge}
              <small class="text-secondary">${beginDate} - ${endDate}</small>
            </div>
            <div class="d-flex align-items-center mb-3">
              <img src="${workImg}" class="rounded me-3" style="width: 50px; height: 50px; object-fit: cover;">
              <div>
                <h6 class="mb-0 text-white">${workName}</h6>
                <small class="text-info">${isIncoming ? `Da: Te` : `Da: ${fromMuseumName}`}</small>
                <br>
                <small class="text-warning">${isIncoming ? `A: ${toMuseumName}` : `A: Un tuo museo`}</small>
              </div>
            </div>
            ${deletionWarning}
            ${actionButtons}
          </div>
        </div>
      </div>`;
  });
}

// Azione: Accetta / Rifiuta richiesta
async function respondAdoption(adoptionId, status) {
  const isConfirmed = await showCustomConfirm("Conferma Operazione", `Sei sicuro di voler impostare lo stato a: ${status}?`, false);
  if (!isConfirmed) return;

  try {
    const res = await fetch(`${API_BASE_URL}/adoptions/${adoptionId}/respond`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });

    if (res.ok) {
      loadAdoptions();
    } else {
      const err = await res.json();
      alert(err.error || "Errore durante l'operazione.");
    }
  } catch (error) { console.error(error); }
}

// Azione: Completa adozione (restituzione opera)
async function completeAdoption(adoptionId) {
  const isConfirmed = await showCustomConfirm("Restituzione Opera", "Confermi che l'opera è stata restituita e l'adozione è conclusa?", false);
  if (!isConfirmed) return;

  try {
    const res = await fetch(`${API_BASE_URL}/adoptions/${adoptionId}/complete`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" }
    });

    if (res.ok) {
      loadAdoptions();
    } else {
      const err = await res.json();
      alert(err.error || "Errore durante il completamento.");
    }
  } catch (error) { console.error(error); }
}

// ------------------- MODALE NUOVA ADOZIONE -------------------
async function openNewAdoptionModal() {
  const sourceSelect = document.getElementById("source-museum-select");
  const targetSelect = document.getElementById("target-museum-select");
  const roomSelect = document.getElementById("target-room-select");

  if(roomSelect) {
     roomSelect.innerHTML = `<option value="">Prima seleziona un tuo museo...</option>`;
     roomSelect.disabled = true;
  }

  targetSelect.onchange = onTargetMuseumChange;

  // Popoliamo i musei
  try {
    // 1. Musei totali per la fonte
    const allMuseumsRes = await fetch(`${API_BASE_URL}/museums`);
    const allMuseums = await allMuseumsRes.json();
    sourceSelect.innerHTML = `<option value="">Seleziona un museo...</option>` +
      allMuseums.map(m => `<option value="${m._id}">${m.name}</option>`).join('');

    // 2. I miei musei per la destinazione
    const myMuseumsRes = await fetch(`${API_BASE_URL}/my-museums`);
    const myMuseums = await myMuseumsRes.json();
    targetSelect.innerHTML = `<option value="">Seleziona un tuo museo...</option>` +
      myMuseums.map(m => `<option value="${m._id}">${m.name}</option>`).join('');

    newAdoptionModalInstance.show();
  } catch (error) { console.error(error); }
}

async function onTargetMuseumChange() {
  const toMuseumId = document.getElementById("target-museum-select").value;
  const roomSelect = document.getElementById("target-room-select");

  if (!toMuseumId) {
    roomSelect.disabled = true;
    roomSelect.innerHTML = `<option value="">Prima seleziona un tuo museo...</option>`;
    return;
  }

  roomSelect.innerHTML = `<option value="">Caricamento stanze...</option>`;

  try {
    const res = await fetch(`${API_BASE_URL}/museums/${toMuseumId}/sections`);
    const sections = await res.json();

    let optionsHtml = `<option value="">Seleziona la stanza in cui esporla...</option>`;
    let hasRooms = false;

    // Raggruppiamo le stanze per sezione usando <optgroup> (molto elegante visivamente)
    sections.forEach(sec => {
      if (sec.rooms && sec.rooms.length > 0) {
        hasRooms = true;
        optionsHtml += `<optgroup label="Sezione: ${sec.name}">`;
        sec.rooms.forEach(room => {
          optionsHtml += `<option value="${room._id}">${room.name}</option>`;
        });
        optionsHtml += `</optgroup>`;
      }
    });

    if (!hasRooms) {
      roomSelect.innerHTML = `<option value="">Nessuna stanza creata in questo museo!</option>`;
      roomSelect.disabled = true;
    } else {
      roomSelect.innerHTML = optionsHtml;
      roomSelect.disabled = false;
    }
  } catch (error) { 
    console.error(error); 
    roomSelect.innerHTML = `<option value="">Errore caricamento stanze</option>`;
  }
}

async function onSourceMuseumChange() {
  const sourceMuseumId = document.getElementById("source-museum-select").value;
  const workSelect = document.getElementById("work-select");

  if (!sourceMuseumId) {
    workSelect.disabled = true;
    workSelect.innerHTML = `<option value="">Prima seleziona un museo...</option>`;
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/museums/${sourceMuseumId}/works`);
    const works = await res.json();

    if (works.length === 0) {
      workSelect.disabled = true;
      workSelect.innerHTML = `<option value="">Nessuna opera disponibile in questo museo</option>`;
      return;
    }

    workSelect.disabled = false;
    workSelect.innerHTML = `<option value="">Seleziona l'opera...</option>` +
      works.map(w => `<option value="${w._id}">${w.name} (${w.author || 'Autore ignoto'})</option>`).join('');
  } catch (error) { console.error(error); }
}

async function submitAdoptionRequest() {
  const workId = document.getElementById("work-select").value;
  const toMuseumId = document.getElementById("target-museum-select").value;
  const targetRoomId = document.getElementById("target-room-select").value;
  const beginDate = document.getElementById("begin-date-input").value;
  const endDate = document.getElementById("end-date-input").value;

  if (!workId || !toMuseumId || !targetRoomId || !beginDate || !endDate) {
    alert("Tutti i campi sono obbligatori!");
    return;
  }

  // controlli sulle date
  const beginDateNr = new Date(beginDate);
  const endDateNr = new Date(endDate);
  
  // Creiamo la data di oggi e azzeriamo l'ora per un confronto equo (solo anno/mese/giorno)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (beginDateNr < today) {
    alert("Errore: La data di inizio non può essere nel passato.");
    return;
  }

  if (endDateNr <= beginDate) {
    alert("Errore: La data di fine prestito deve essere successiva alla data di inizio.");
    return;
  }

  const maxYear = today.getFullYear() + 50;
  if (endDateNr.getFullYear() > maxYear) {
    alert(`Errore: La data di fine non può superare l'anno ${maxYear}.`);
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/adoptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workId, toMuseumId, targetRoomId, beginDate, endDate })
    });

    if (res.ok) {
      newAdoptionModalInstance.hide();
      loadAdoptions();
      alert("Richiesta di adozione inviata con successo!");
    } else {
      const err = await res.json();
      alert(err.error || "Errore nell'invio della richiesta.");
    }
  } catch (error) { console.error(error); }
}

// Azione: Il richiedente conferma che l'opera è arrivata (Attiva l'adozione)
async function confirmArrival(adoptionId) {
  const isConfirmed = await showCustomConfirm("Conferma Arrivo", "Confermi di aver ricevuto fisicamente l'opera nel tuo museo? Questo aggiornerà i cataloghi.", false);
  if (!isConfirmed) return;
  
  try {
    const res = await fetch(`${API_BASE_URL}/adoptions/${adoptionId}/arrive`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" }
    });

    if (res.ok) {
      alert("Arrivo confermato! L'opera è ora esposta nel tuo museo.");
      loadAdoptions();
    } else {
      const err = await res.json();
      alert(err.error || "Errore durante la conferma dell'arrivo.");
    }
  } catch (error) { console.error(error); }
}