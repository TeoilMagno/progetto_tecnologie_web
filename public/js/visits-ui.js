let cachedVisits = [];
const API_BASE_URL = "http://localhost:3000/api";

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

    // Calcola il badge PRIMA di usare la stringa HTML
    const statusBadge = visit.isPublic
      ? '<span class="badge bg-success">Pubblica</span>'
      : '<span class="badge bg-secondary">Privata</span>';

    container.innerHTML += `
  <div class="col">
    <div class="card h-100 custom-card">
      <div class="card-body">
        <div class="d-flex justify-content-between mb-2">
           ${statusBadge}
           <small class="text-secondary">${visit.items ? visit.items.length : 0} opere</small>
        </div>
        <h5 class="card-title">${visit.title}</h5>
        <h6 class="card-subtitle mb-2 text-muted">
           <i class="bi bi-bank me-1"></i> ${visit.museum ? visit.museum.name : "Senza museo"}
        </h6>
        <p class="card-text small text-secondary">${visit.description || ""}</p>
      </div>
      </div>
  </div>`;
  });
}
