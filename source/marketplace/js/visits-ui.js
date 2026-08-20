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

    renderVisitsList(cachedVisits, "managed-visits-area");
  } catch (error) {
    console.error(error);
    container.innerHTML = `<div class="alert alert-danger bg-transparent text-danger border-danger">Errore caricamento dati. Il server è attivo?</div>`;
  }
}

function renderVisitsList(visits, containerId = "managed-visits-area") {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  const targetMap = { kids: 'Bambini', families: 'Famiglie', adults: 'Adulti', schools: 'Scuole' };
  const accMap = { wheelchair_accessible: '♿', blind_friendly: '👁️', deaf_friendly: '👂', dsa_friendly: '🧠', sensory_friendly: '🧘' };

  visits.forEach((visit) => {
    if (!visit) return;

    let statusBadge = "";
    let actionButton = "";

    if (visit.isDraft) {
      statusBadge = `<span class="badge bg-warning text-dark border border-warning mb-2"><i class="bi bi-pencil-square me-1"></i> Bozza</span>`;
      actionButton = `<a href="/create-visit?editId=${visit._id}" class="btn btn-sm btn-gradient flex-grow-1">Continua Bozza</a>`;
    } else if (visit.isPublic) {
      statusBadge = `<span class="badge bg-success bg-opacity-25 text-success border border-success mb-2"><i class="bi bi-globe me-1"></i> Pubblicata</span>`;
      actionButton = `<a href="/visit-details?id=${visit._id}" class="btn btn-sm btn-glass flex-grow-1">Vedi Dettagli</a>`;
    } else {
      statusBadge = `<span class="badge bg-secondary bg-opacity-25 text-light border border-secondary mb-2"><i class="bi bi-lock me-1"></i> Privata</span>`;
      actionButton = `<a href="/visit-details?id=${visit._id}" class="btn btn-sm btn-glass flex-grow-1">Vedi Dettagli</a>`;
    }

    let extraTagsHtml = "";
    if (visit.targetAudience && visit.targetAudience.length > 0) {
      visit.targetAudience.forEach(t => {
        if (t !== 'all' && targetMap[t]) extraTagsHtml += `<span class="badge bg-info bg-opacity-25 text-info border border-info me-1">${targetMap[t]}</span>`;
      });
    }
    if (visit.accessibility && visit.accessibility.length > 0) {
      visit.accessibility.forEach(a => {
        if (a !== 'none' && accMap[a]) extraTagsHtml += `<span class="badge bg-warning bg-opacity-25 text-warning border border-warning me-1">${accMap[a]}</span>`;
      });
    }

    let missingWarning = "";
    const hasMissingWorks = visit.works && visit.works.some(work => {
      if (!work) return false;
      const adoption = work.adoptionId || work.adoption;
      return adoption && (adoption.status === 'accepted' || adoption.status === 'active');
    });

    if (hasMissingWorks) {
      missingWarning += `
        <div class="mt-2 text-warning small fw-bold">
          <i class="bi bi-exclamation-triangle-fill me-1"></i> Contiene opere in prestito
        </div>`;
    }

    const hasDeletedWorks = visit.works && visit.works.some(work => work === null);
    if (hasDeletedWorks) {
      missingWarning += `
        <div class="mt-2 text-danger small fw-bold">
          <i class="bi bi-trash-fill me-1"></i> Alcune opere sono state rimosse dal sistema
        </div>`;
    }

    const museumName = visit.museumId ? visit.museumId.name : "<span class='text-danger fw-bold'><i class='bi bi-exclamation-octagon-fill'></i> Museo Chiuso/Eliminato</span>";

    container.innerHTML += `
      <div class="col">
        <div class="card h-100 custom-card" onclick="window.location.href='/visit-details?id=${visit._id}'">
          <div class="card-body d-flex flex-column" style="cursor: pointer">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div>${statusBadge}</div>
              <div class="text-end">
                <span class="d-block fw-bold text-light">${visit.price > 0 ? `€ ${visit.price.toFixed(2)}` : 'Gratis'}</span>
                <small class="text-secondary">${visit.duration || 0} min</small>
              </div>
            </div>
            
            <h5 class="card-title text-truncate">${visit.title}</h5>
            <h6 class="card-subtitle mb-2 text-muted museum-name-custom text-truncate">
              <i class="bi bi-bank me-1"></i> ${museumName}
            </h6>
            
            <div class="mb-2 line-clamp-1">${extraTagsHtml}</div>
            
            <p class="card-text small text-secondary flex-grow-1 text-truncate-3">${visit.description || ""}</p>
            
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

// 1. Ora deleteVisit è correttamente ASINCRONA
async function deleteVisit(visitId) {
  const isConfirmed = await window.showCustomConfirm(
    "Conferma Eliminazione",
    "Sei sicuro di voler eliminare definitivamente questa visita o bozza? Questa azione non può essere annullata."
  );
  if (!isConfirmed) return;

  try {
    const response = await fetch(`${API_BASE_URL}/visits/${visitId}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Errore durante l'eliminazione");
    }

    alert("Visita o bozza eliminata con successo!");
    getMyVisits();
  } catch (error) {
    console.error("Errore eliminazione visita:", error);
    alert("Impossibile eliminare la visita: " + error.message);
  }
}