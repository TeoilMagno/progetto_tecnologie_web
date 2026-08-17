// Variabile globale per salvare le visite e permettere la ricerca
let cachedPublicVisits = [];

// Funzione separata per renderizzare le card 
function renderVisitsList(visitsArray) {
  const container = document.getElementById("public-visits-area");
  container.innerHTML = "";

  if (visitsArray.length === 0) {
    container.innerHTML = `<p class="text-secondary w-100 text-center">Nessuna visita pubblica trovata.</p>`;
    return;
  }

  visitsArray.forEach((visit) => {
    const coverImg = visit.coverImage ||
      (visit.works && visit.works.length > 0 && visit.works[0].image
        ? visit.works[0].image
        : "/img/fallback-visit.jpg");

    const safeTitle = visit.title.replace(/'/g, "\\'");

    container.innerHTML += `
      <div class="col">
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

document.addEventListener("DOMContentLoaded", async () => {
  await fetchCurrentUser();

  // Inizializzazione barra di ricerca
  const searchContainer = document.getElementById("search-container");
  const searchToggleBtn = document.getElementById("search-toggle-btn");
  const searchInput = document.getElementById("public-visits-search-input");

  if (searchToggleBtn && searchInput) {
    searchToggleBtn.addEventListener("click", () => {
      searchContainer.classList.toggle("active");
      if (searchContainer.classList.contains("active")) {
        searchInput.focus();
      } else {
        searchInput.value = "";
        renderVisitsList(cachedPublicVisits); // Ripristina tutte le visite
      }
    });

    searchInput.addEventListener("input", (e) => {
      const query = e.target.value;
      if (!cachedPublicVisits || cachedPublicVisits.length === 0) return;

      // Cerca per titolo della visita o per nome del museo associato
      const filtered = cachedPublicVisits.filter(visit => 
        fuzzySearch(query, visit.title) || 
        (visit.museumId && fuzzySearch(query, visit.museumId.name))
      );
      renderVisitsList(filtered);
    });
  }

  // CARICAMENTO INIZIALE DAL DATABASE
  try {
    const res = await fetch(`${API_BASE_URL}/visits`);
    const visits = await res.json();
    
    // Assegniamo i dati alla variabile globale per la ricerca!
    cachedPublicVisits = visits.filter((v) => v.isPublic !== false);

    // Chiamiamo la funzione di rendering
    renderVisitsList(cachedPublicVisits);

  } catch (e) {
    document.getElementById("public-visits-area").innerHTML = `<p class="text-danger w-100 text-center">Errore di caricamento.</p>`;
  }
});