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
      actionButton = `<a href="/create-visit?editId=${visit._id}" class="btn btn-sm btn-gradient w-100">Continua Bozza</a>`;
    } else if (visit.isPublic) {
      // 2. PUBBLICA (Completata e visibile sul Marketplace)
      statusBadge = `<span class="badge bg-success bg-opacity-25 text-success border border-success mb-2"><i class="bi bi-globe me-1"></i> Pubblicata</span>`;
      actionButton = `<a href="/visit-details?id=${visit._id}" class="btn btn-sm btn-glass w-100">Vedi Dettagli</a>`;
    } else {
      // 3. PRIVATA (Completata, salvata, ma NON sul Marketplace)
      statusBadge = `<span class="badge bg-secondary bg-opacity-25 text-light border border-secondary mb-2"><i class="bi bi-lock me-1"></i> Privata</span>`;
      actionButton = `<a href="/visit-details?id=${visit._id}" class="btn btn-sm btn-glass w-100">Vedi Dettagli</a>`;
    }

    // TODO: (Inserisci statusBadge in cima alla card e actionButton nel footer della card)

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
              <i class="bi bi-bank me-1"></i> ${visit.museum ? visit.museum.name : "Senza museo"}
            </h6>
            <p class="card-text small text-secondary">${visit.description || ""}</p>
            <div class="d-flex justify-content-between mb-2">
              ${actionButton}
            </div>
          </div>
        </div>
      </div>`;
  });
}
