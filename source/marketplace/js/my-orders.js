let cachedOrders = [];

function renderOrdersList(ordersToRender) {
  const container = document.getElementById("orders-container");
  
  if (ordersToRender.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5 text-secondary glass-panel">
        <i class="bi bi-folder-x fs-1 mb-2"></i>
        <p>Non hai ancora effettuato nessun ordine.</p>
        <a href="/marketplace" class="btn btn-sm btn-gradient rounded-pill px-4 mt-2">Esplora il Marketplace</a>
      </div>`;
    return;
  }

  container.innerHTML = ""; // Svuotiamo il caricamento

  ordersToRender.forEach((order) => {
    const orderDate = new Date(order.createdAt).toLocaleDateString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit'
    });

    // Generiamo i blocchi interni solo se ci sono elementi comprati
    let visitsHtml = "";
    if (order.visits && order.visits.length > 0) {
      visitsHtml = `<h6 class="text-info mt-3 mb-2 small fw-bold text-uppercase"><i class="bi bi-collection me-1"></i>Visite Sbloccate</h6>`;
      order.visits.forEach(v => {
        visitsHtml += `
          <div class="d-flex align-items-center mb-2 bg-white bg-opacity-5 p-2 rounded">
            <img src="${v.image || '/img/fallback-visit.jpg'}" style="width: 50px; height: 50px; object-fit: cover;" class="rounded me-3">
            <div class="flex-grow-1 text-white small">${v.title}</div>
            <div class="text-white-50 small">€ ${v.price.toFixed(2)}</div>
          </div>`;
      });
    }

    let itemsHtml = "";
    if (order.items && order.items.length > 0) {
      itemsHtml = `<h6 class="text-warning mt-3 mb-2 small fw-bold text-uppercase"><i class="bi bi-bag me-1"></i>Articoli Bookshop</h6>`;
      order.items.forEach(i => {
        itemsHtml += `
          <div class="d-flex align-items-center mb-2 bg-white bg-opacity-5 p-2 rounded">
            <img src="${i.image || '/img/fallback.jpg'}" style="width: 50px; height: 50px; object-fit: cover;" class="rounded me-3">
            <div class="flex-grow-1 text-white small">
              ${i.name} <span class="text-secondary small">x${i.quantity}</span>
            </div>
            <div class="text-white-50 small">€ ${(i.price * i.quantity).toFixed(2)}</div>
          </div>`;
      });
    }

    // Mettiamo tutto insieme nella card dell'ordine
    container.innerHTML += `
      <div class="card custom-card glass-panel border border-secondary border-opacity-25">
        <div class="card-header bg-transparent border-bottom border-secondary border-opacity-25 d-flex justify-content-between align-items-center py-3">
          <div>
            <h5 class="mb-0 text-white fs-6 fw-bold">Ordine #${order._id.substring(order._id.length - 6).toUpperCase()}</h5>
            <small class="text-secondary">${orderDate}</small>
          </div>
          <span class="badge bg-success bg-opacity-75 rounded-pill px-3">Completato</span>
        </div>
        <div class="card-body py-2">
          ${visitsHtml}
          ${itemsHtml}
        </div>
        <div class="card-footer bg-transparent border-top border-secondary border-opacity-25 d-flex justify-content-between align-items-center py-3">
          <span class="text-secondary small">Metodo: Simulazione Carta</span>
          <div class="fs-5 fw-bold text-white">Totale: <span class="text-info">€ ${order.totalAmount.toFixed(2)}</span></div>
        </div>
      </div>`;
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  // Carica le informazioni sull'utente nella navbar
  await fetchCurrentUser();

  const searchContainer = document.getElementById("search-container");
  const searchToggleBtn = document.getElementById("search-toggle-btn");
  const searchInput = document.getElementById("orders-search-input");

  if (searchToggleBtn && searchInput) {
    searchToggleBtn.addEventListener("click", () => {
      searchContainer.classList.toggle("active");
      if (searchContainer.classList.contains("active")) {
        searchInput.focus();
      } else {
        searchInput.value = "";
        renderOrdersList(cachedOrders); // Sostituisci con il nome della tua funzione di render
      }
    });

    searchInput.addEventListener("input", (e) => {
      const query = e.target.value;
      if (!cachedOrders || cachedOrders.length === 0) return;

      const filtered = cachedOrders.filter(order => {
        // Cerca per ID dell'ordine (utile per cercare la ricevuta)
        if (fuzzySearch(query, order._id)) return true;
        
        // Cerca per nome della visita acquistata
        const hasVisit = order.visits && order.visits.some(v => fuzzySearch(query, v.title || v.name));
        
        // Cerca per nome dell'articolo bookshop
        const hasItem = order.items && order.items.some(i => fuzzySearch(query, i.name));
        
        return hasVisit || hasItem;
      });
      
      renderOrdersList(filtered); // Sostituisci con il nome della tua funzione di render
    });
  }

  try {
    // Chiamiamo l'API del backend creata nello step precedente
    const res = await fetch(`${API_BASE_URL}/my-orders`);
    
    if (res.status === 401) {
      window.location.href = "/login?msg=login_required";
      return;
    }

    cachedOrders = await res.json();

    renderOrdersList(cachedOrders);
  } catch (error) {
    console.error("Errore nel caricamento ordini frontend:", error);
    const container = document.getElementById("orders-container");
    if (container) {
      container.innerHTML = `<div class="text-danger text-center py-5">Impossibile caricare lo storico ordini.</div>`;
    }
  }
});