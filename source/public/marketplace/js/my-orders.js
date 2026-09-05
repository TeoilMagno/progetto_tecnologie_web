let cachedOrders = [];

function renderOrdersList(ordersToRender) {
  const container = document.getElementById("orders-container");
  
  // Stato Vuoto con stile Glass
  if (ordersToRender.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5 text-secondary glass-modal rounded-4 border border-secondary border-opacity-25">
        <i class="bi bi-folder-x display-4 mb-3 text-white-50"></i>
        <p class="fs-5 text-light">Non hai ancora effettuato nessun ordine.</p>
        <a href="/marketplace" class="btn btn-gradient rounded-pill px-4 mt-2">Esplora il Marketplace</a>
      </div>`;
    return;
  }

  let html = ""; 

  ordersToRender.forEach((order) => {
    const orderDate = new Date(order.createdAt).toLocaleDateString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit'
    });

    let visitsHtml = "";
    if (order.visits && order.visits.length > 0) {
      visitsHtml = `<h6 class="text-info mt-3 mb-3 small fw-bold text-uppercase"><i class="bi bi-collection me-2"></i>Visite Guidate</h6>`;
      order.visits.forEach(v => {
        visitsHtml += `
          <div class="d-flex align-items-center mb-2 bg-dark bg-opacity-50 border border-secondary border-opacity-25 p-2 rounded-3 hover-scale-slight">
            <div class="d-flex align-items-center justify-content-center bg-info bg-opacity-10 rounded me-3 border border-info border-opacity-25" style="width: 60px; height: 60px;">
              <i class="bi bi-ticket-perforated display-6 text-info"></i>
            </div>
            <div class="flex-grow-1 text-light small fw-semibold">${v.title}</div>
            <div class="text-white fw-bold small px-2">€ ${v.price.toFixed(2)}</div>
          </div>`;
      });
    }

    let itemsHtml = "";
    if (order.items && order.items.length > 0) {
      itemsHtml = `<h6 class="text-warning mt-4 mb-3 small fw-bold text-uppercase"><i class="bi bi-bag me-2"></i>Articoli Bookshop</h6>`;
      order.items.forEach(i => {
        itemsHtml += `
          <div class="d-flex align-items-center mb-2 bg-dark bg-opacity-50 border border-secondary border-opacity-25 p-2 rounded-3 hover-scale-slight">
            <img src="${i.image || '/img/fallback.jpg'}" style="width: 60px; height: 60px; object-fit: cover;" class="rounded me-3 border border-secondary border-opacity-25">
            <div class="flex-grow-1 text-light small fw-semibold">
              ${i.name} <span class="badge bg-secondary bg-opacity-50 ms-2 text-white border border-secondary border-opacity-25">x${i.quantity}</span>
            </div>
            <div class="text-white fw-bold small px-2">€ ${(i.price * i.quantity).toFixed(2)}</div>
          </div>`;
      });
    }

    // Card Ordine con Glassmorphism
    html += `
      <div class="card mb-4 border-0" style="background: transparent;">
        <div class="glass-modal rounded-4 border border-secondary border-opacity-25 overflow-hidden shadow-lg">
          
          <div class="card-header bg-dark bg-opacity-75 border-bottom border-secondary border-opacity-25 d-flex justify-content-between align-items-center py-3 px-4">
            <div>
              <h5 class="mb-1 text-white fs-5 fw-bold">Ordine #${order._id.substring(order._id.length - 6).toUpperCase()}</h5>
              <small class="text-info"><i class="bi bi-calendar3 me-1"></i>${orderDate}</small>
            </div>
            <span class="badge bg-success border border-success border-opacity-50 rounded-pill px-3 py-2 shadow-sm">Completato</span>
          </div>
          
          <div class="card-body px-4 py-3">
            ${visitsHtml}
            ${itemsHtml}
          </div>
          
          <div class="card-footer bg-dark bg-opacity-50 border-top border-secondary border-opacity-25 d-flex justify-content-between align-items-center py-3 px-4">
            <span class="text-white-50 small"><i class="bi bi-credit-card me-1"></i>Carta Terminante in ****</span>
            <div class="fs-5 fw-bold text-white">Totale: <span class="text-warning ms-2">€ ${order.totalAmount.toFixed(2)}</span></div>
          </div>
          
        </div>
      </div>`;
  });
  container.innerHTML = html;
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