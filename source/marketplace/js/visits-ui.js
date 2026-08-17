let cachedVisits = [];

async function getMyVisits() {
  const container = document.getElementById("managed-visits-area");

  if (!container) return;

  const title = document.getElementById("page-title");
  const backBtn = document.getElementById("back-btn");

  if (backBtn) {
    backBtn.classList.add("d-none");
  }

  if (title) {
    title.innerHTML = "Visite disponibili";
  }

  container.innerHTML = `
    <div class="col-12 text-center mt-5">
      <div class="spinner-border text-light" role="status"></div>
      <p class="mt-2 text-secondary">Caricamento...</p>
    </div>`;

  try {
    const response = await fetch(`${API_BASE_URL}/my-visits`);
    if (!response.ok) throw new Error("Errore server");
    cachedVisits = await response.json();

    // Renderizza passandogli esplicitamente l'id (per evitare conflitti)
    renderVisitsList(cachedVisits, "managed-visits-area");
  } catch (error) {
    console.error(error);
    container.innerHTML = `<div class="alert alert-danger bg-transparent text-danger border-danger">Errore caricamento dati. Il server è attivo?</div>`;
  }
}

// Aggiungiamo 'containerId' come secondo parametro, con 'content-area' come default
function renderVisitsList(visits, containerId = "managed-visits-area") {
  const container = document.getElementById(containerId);

  if (!container) return;

  container.innerHTML = "";

  visits.forEach((visit) => {
    if (!visit) return;

    let statusBadge = "";
    let actionButton = "";

    // LOGICA A 3 STATI
    if (visit.isDraft) {
      // 1. BOZZA (Visita iniziata ma salvata a metà / uscita non salvata)
      statusBadge = `<span class="badge bg-warning text-dark border border-warning mb-2"><i class="bi bi-pencil-square me-1"></i> Bozza</span>`;
      actionButton = `<a href="/create-visit?editId=${visit._id}" class="btn btn-sm btn-gradient flex-grow-1">Continua Bozza</a>`;
    } else if (visit.isPublic) {
      // 2. PUBBLICA (Completata e visibile sul Marketplace)
      statusBadge = `<span class="badge bg-success bg-opacity-25 text-success border border-success mb-2"><i class="bi bi-globe me-1"></i> Pubblicata</span>`;
      actionButton = `<a href="/visit-details?id=${visit._id}" class="btn btn-sm btn-glass flex-grow-1">Vedi Dettagli</a>`;
    } else {
      // 3. PRIVATA (Completata, salvata, ma NON sul Marketplace)
      statusBadge = `<span class="badge bg-secondary bg-opacity-25 text-light border border-secondary mb-2"><i class="bi bi-lock me-1"></i> Privata</span>`;
      actionButton = `<a href="/visit-details?id=${visit._id}" class="btn btn-sm btn-glass flex-grow-1">Vedi Dettagli</a>`;
    }

    // TODO: (Inserisci statusBadge in cima alla card e actionButton nel footer della card)

    let missingWarning = "";
    const hasMissingWorks = visit.works && visit.works.some(work => {
      const adoption = work.adoptionId || work.adoption;
      return adoption && (adoption.status === 'accepted' || adoption.status === 'active');
    });

    if (hasMissingWorks) {
      missingWarning = `
        <div class="mt-2 text-warning small fw-bold">
          <i class="bi bi-exclamation-triangle-fill me-1"></i> Attenzione: contiene opere temporaneamente in prestito
        </div>`;
    }

    container.innerHTML += `
      <div class="col">
        <div class="card h-100 custom-card" onclick="window.location.href='/visit-details?id=${visit._id}'">
          <div class="card-body" style="cursor: pointer">
            <div class="d-flex justify-content-between mb-2">
              ${statusBadge}
              <small class="text-secondary">${visit.works ? visit.works.length : 0} opere</small>
            </div>
            <h5 class="card-title">${visit.title}</h5>
            <h6 class="card-subtitle mb-2 text-muted museum-name-custom">
              <i class="bi bi-bank me-1"></i> ${visit.museumId ? visit.museumId.name : "Senza museo"}
            </h6>
            <p class="card-text small text-secondary">${visit.description || ""}</p>
            ${missingWarning}
            <div class="d-flex justify-content-between align-items-center mt-3">
              ${actionButton}
              <button class="btn btn-sm btn-outline-danger ms-2" onclick="event.stopPropagation(); deleteVisit('${visit._id}')" title="Elimina visita o bozza">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>`;
  });
}

// Funzione asincrona per eliminare una visita o bozza
function deleteVisit(visitId) {
  showCustomConfirm(
    "Conferma Eliminazione",
    "Sei sicuro di voler eliminare definitivamente questa visita o bozza? Questa azione non può essere annullata.",
    async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/visits/${visitId}`, {
          method: "DELETE"
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Errore durante l'eliminazione");
        }

        // Mostra feedback di successo (verrà intercettato come toast!)
        alert("Visita o bozza eliminata con successo!");

        // Ricarica la lista aggiornata
        getMyVisits();
      } catch (error) {
        console.error("Errore eliminazione visita:", error);
        alert("Impossibile eliminare la visita: " + error.message);
      }
    }
  );
}

// Mostra un popup di conferma personalizzato in linea con lo stile dark glassmorphism
function showCustomConfirm(title, message, onConfirm) {
  // Rimuove eventuali istanze precedenti rimaste nel DOM
  const existingModal = document.getElementById("custom-confirm-modal");
  if (existingModal) {
    existingModal.remove();
  }

  const modalHTML = `
    <div class="modal fade" id="custom-confirm-modal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content glass-modal text-white" style="border: 1px solid rgba(255, 255, 255, 0.1); background-color: #18181b; box-shadow: 0 0 35px rgba(0, 0, 0, 0.7); border-radius: 16px;">
          <div class="modal-header border-bottom border-secondary border-opacity-25 p-3">
            <h5 class="modal-title d-flex align-items-center" style="font-weight: 700;">
              <i class="bi bi-exclamation-triangle-fill text-danger me-2 fs-5"></i>
              <span>${title}</span>
            </h5>
            <button type="button" class="btn-close custom-close" data-bs-dismiss="modal" aria-label="Chiudi"></button>
          </div>
          <div class="modal-body py-4 px-3">
            <p class="mb-0 text-secondary" style="font-size: 1rem; line-height: 1.5;">${message}</p>
          </div>
          <div class="modal-footer border-top border-secondary border-opacity-25 p-2 d-flex gap-2 justify-content-end">
            <button type="button" class="btn btn-sm btn-glass px-4 py-2" data-bs-dismiss="modal" style="font-weight: 600;">Annulla</button>
            <button type="button" id="custom-confirm-yes-btn" class="btn btn-sm btn-danger px-4 py-2" style="border-radius: 50px; font-weight: 600; background-color: #dc3545; border: none; box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3);">Elimina</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Appende la struttura HTML al termine del body
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  const modalElement = document.getElementById("custom-confirm-modal");
  const bsModal = new bootstrap.Modal(modalElement);

  const yesBtn = document.getElementById("custom-confirm-yes-btn");
  yesBtn.addEventListener("click", () => {
    bsModal.hide();
    onConfirm();
    
    // Rimuove l'elemento dal DOM una volta terminata la transizione di chiusura
    modalElement.addEventListener("hidden.bs.modal", () => {
      modalElement.remove();
    });
  });

  bsModal.show();
}
