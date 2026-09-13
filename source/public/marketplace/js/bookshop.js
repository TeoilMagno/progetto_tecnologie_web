let itemModalInstance = null;
let itemsObserver = null;

document.addEventListener("DOMContentLoaded", async () => {
  if (document.getElementById("itemModal")) itemModalInstance = new bootstrap.Modal(document.getElementById("itemModal"));

  const urlParams = new URLSearchParams(window.location.search);
  currentMuseumId = urlParams.get("id") || urlParams.get("museumId");

  if (!currentMuseumId) {
    window.location.replace("/my-museums");
    return;
  }

  currentView = 'items';
  
  const backBtns = document.querySelectorAll(".back-action-btn");
  
  backBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault(); // Fondamentale per evitare salti pagina se usi tag <a> con href="#"
      
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "/";
      }
    });
  });

  if (typeof initImageWidget === 'function') {
    initImageWidget("edit-item-image-widget", "item-image", "Immagine Articolo");
  }

  // 1. Popoliamo la barra dei filtri laterale sfruttando sidebar.js
  if (typeof populateFilters === 'function') populateFilters("items");

  // 2. Barra di ricerca (ora gestita dal web component <search-bar>)
  document.addEventListener('search-input', (e) => {
    clearTimeout(window.itemSearchTimeout);
    window.itemSearchTimeout = setTimeout(() => applyItemFilters(e.detail.query), 300);
  });

  document.addEventListener('search-cleared', () => {
    applyItemFilters('');
  });

  // Chiamata iniziale
  currentItemsPage = 1;
  renderedItemsCount = 0;
  await fetchAndRenderItems(currentMuseumId, false);
});

// ==========================================
// OTTIMIZZAZIONE CACHE
// ==========================================

async function fetchAndRenderItems(museumId, isLoadMore = false) {
  if (isFetchingItems) return;
  isFetchingItems = true;

  const searchInput = window.activeItemSearchQuery || "";
  const categoryCbs = Array.from(document.querySelectorAll('.item-category-checkbox:checked')).map(cb => cb.value);
  const selectedAge = document.getElementById("filter-age-select")?.value || "";
  const maxPrice = parseInt(document.getElementById("item-price-slider")?.value || 100);

  const hasFilters = searchInput !== "" || categoryCbs.length > 0 || selectedAge !== "" || maxPrice < 100;

  if (isLoadMore && globalSentinel) {
    globalSentinel.classList.remove("d-none");
  } else {
    const catalogArea = document.getElementById("items-catalog-area");
    if (catalogArea) catalogArea.innerHTML = `<div class="col-12 text-center mt-5"><div class="spinner-border text-info" role="status"></div></div>`;
  }

  const params = new URLSearchParams();
  params.append("page", currentItemsPage);
  params.append("limit", ITEMS_RENDER_CHUNK || 12);
  if (searchInput) params.append("search", searchInput);
  if (categoryCbs.length > 0) params.append("category", categoryCbs.join(','));
  if (selectedAge) params.append("targetAge", selectedAge);
  if (maxPrice < 100) params.append("maxPrice", maxPrice);

  try {
    const res = await fetch(`${API_BASE_URL}/museums/${museumId}/items?${params.toString()}`);
    const data = await res.json();
    
    const fetchedArray = data.items || [];
    totalItemsPages = data.totalPages || 1;

    if (isLoadMore) {
      currentItems = [...currentItems, ...fetchedArray];
      if (!hasFilters) {
        pristineItemsCache = [...currentItems];
        pristineItemsPage = currentItemsPage;
        isEntireItemsDbInCache = pristineItemsCache.length >= data.total;
      }

      const nextChunk = currentItems.slice(renderedItemsCount, renderedItemsCount + ITEMS_RENDER_CHUNK);
      renderedItemsCount += nextChunk.length;
      renderItemsList(nextChunk, true);
    } else {
      currentItems = fetchedArray;
      if (!hasFilters) {
        pristineItemsCache = [...currentItems];
        pristineItemsPage = currentItemsPage;
        pristineTotalItemsPages = totalItemsPages;
        isEntireItemsDbInCache = pristineItemsCache.length >= data.total;
      }

      renderedItemsCount = Math.min(ITEMS_RENDER_CHUNK, currentItems.length);
      renderItemsList(currentItems.slice(0, renderedItemsCount), false);
    }

    setupItemsInfiniteScroll(museumId);
  } catch (error) {
    alert("Errore impossibile caricare gli item, riporva più tardi", error);
    const catalogArea = document.getElementById("items-catalog-area");
    if (catalogArea && !isLoadMore) {
      catalogArea.innerHTML = `<p class="text-danger col-12 text-center mt-3">Errore di connessione.</p>`;
    }
  } finally {
    isFetchingItems = false;
    updateItemsSentinelVisibility();
  }
}

function renderItemsList(itemsToRender, append = false) {
  const catalogArea = document.getElementById("items-catalog-area");
  if (!catalogArea) return;

  if (!append) catalogArea.innerHTML = "";

  if (itemsToRender.length === 0 && !append) {
    catalogArea.innerHTML = `<p class="text-secondary col-12 text-center mt-5">Nessun articolo corrispondente trovato.</p>`;
    return;
  }

  let html = "";
  itemsToRender.forEach(item => {
    const img = item.image || "/img/fallback-work.jpg";
    
    // Rimuove le freccette native del browser dall'input numerico per permetterne la centratura
    const noSpinnersStyle = "appearance: none; -moz-appearance: textfield; margin: 0;";

    html += `
      <div class="col" id="item-card-${item._id}">
        <div class="card custom-card h-100 border-secondary border-opacity-25" style="background: rgba(255,255,255,0.02); border-radius: 12px;">
          
          <div class="position-relative">
            <img src="${img}" class="card-img-top object-fit-cover border-bottom border-secondary border-opacity-25" style="height: 180px; border-top-left-radius: 12px; border-top-right-radius: 12px;">
            <div class="position-absolute top-0 end-0 m-2">
              <span class="badge bg-dark bg-opacity-75 border border-secondary text-white fs-6 shadow-sm" style="backdrop-filter: blur(4px);">€${item.price.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="card-body p-3 d-flex flex-column">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="badge bg-secondary bg-opacity-25 text-secondary border border-secondary border-opacity-25 text-uppercase" style="font-size: 0.65rem; letter-spacing: 0.5px;">${item.category || 'Altro'}</span>
              
              <!-- Azioni Minimali (Modifica/Elimina) -->
              <div class="d-flex gap-1">
                <button class="btn btn-sm btn-glass text-info p-1 px-2 border-0" onclick="openItemModal('${item._id}')" title="Modifica"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-glass text-danger p-1 px-2 border-0" onclick="deleteItem('${item._id}')" title="Elimina"><i class="bi bi-trash"></i></button>
              </div>
            </div>
            
            <h6 class="card-title text-white mb-1 text-truncate">${item.name}</h6>
            <p class="small text-white-50 mb-3 text-truncate-3" style="font-size: 0.75rem;">${item.description || 'Nessuna descrizione'}</p>
            
            <!-- Gestione Scorte Elegante -->
            <div class="mt-auto border-top border-secondary border-opacity-25 pt-3 d-flex justify-content-between align-items-center">
              <div class="d-flex flex-column">
                <span class="small text-secondary mb-1" style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.5px;">Magazzino</span>
                <span class="fs-5 fw-bold text-white lh-1" id="stock-val-${item._id}">${item.quantity}</span>
              </div>
              
              <!-- Controlli +/- Centrati in stile pillola -->
              <div class="d-flex align-items-center rounded-pill" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 2px;">
                <button class="btn btn-link text-white text-decoration-none shadow-none p-0 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px;" type="button" onclick="updateStock('${item._id}', 'remove')">
                  <i class="bi bi-dash fs-5"></i>
                </button>
                
                <!-- Eliminato type="number", usato inputmode="numeric" per forzare la centratura senza freccette -->
                <input type="text" inputmode="numeric" pattern="[0-9]*" class="form-control bg-transparent text-white border-0 shadow-none p-0 text-center fw-bold lh-1" id="qty-change-${item._id}" value="1" style="width: 36px; height: 32px;">
                
                <button class="btn btn-link text-white text-decoration-none shadow-none p-0 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px;" type="button" onclick="updateStock('${item._id}', 'add')">
                  <i class="bi bi-plus fs-5"></i>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;
  });
  
  if (append) {
    catalogArea.insertAdjacentHTML('beforeend', html);
  } else {
    catalogArea.innerHTML = html;
  }

  if (globalSentinel) catalogArea.appendChild(globalSentinel);
}

// ---------------- GESTIONE INFINITE SCROLL ----------------

function setupItemsInfiniteScroll(museumId) {
  if (!globalSentinel) return;

  if (itemsObserver) itemsObserver.disconnect();

  itemsObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !isFetchingItems) {
       if (renderedItemsCount < currentItems.length) {
          const nextChunk = currentItems.slice(renderedItemsCount, renderedItemsCount + ITEMS_RENDER_CHUNK);
          renderedItemsCount += nextChunk.length;
          renderItemsList(nextChunk, true);
          updateItemsSentinelVisibility();
       } 
       else if (currentItemsPage < totalItemsPages) {
          currentItemsPage++;
          fetchAndRenderItems(museumId, true);
       }
    }
  }, { rootMargin: '100px' });

  itemsObserver.observe(globalSentinel);
}

function updateItemsSentinelVisibility() {
  if (!globalSentinel) return;
  if (renderedItemsCount < currentItems.length || currentItemsPage < totalItemsPages) {
    globalSentinel.classList.remove("d-none");
  } else {
    globalSentinel.classList.add("d-none");
  }
}

// ---------------- GESTIONE AZIONI ----------------

async function updateStock(itemId, action) {
  const inputEl = document.getElementById(`qty-change-${itemId}`);
  const amount = parseInt(inputEl.value) || 1;
  const changeAmount = action === 'add' ? amount : -amount;

  const stockValEl = document.getElementById(`stock-val-${itemId}`);
  const currentQty = parseInt(stockValEl.innerText) || 0;
  const newQty = Math.max(0, currentQty + changeAmount);

  // Optimistic UI update
  stockValEl.innerText = newQty;
  inputEl.value = 1; 
  
  const index = currentItems.findIndex(i => i._id === itemId);
  if (index !== -1) currentItems[index].quantity = newQty;

  try {
    const res = await fetch(`${API_BASE_URL}/items/${itemId}/add-stock`, {
      method: "PUT", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changeAmount })
    });
    
    if (!res.ok) throw new Error((await res.json()).error || "Errore server");
    
    // Assicuriamo la precisione rileggendo dal DB in background
    const data = await res.json();
    stockValEl.innerText = data.item.quantity;
    if (index !== -1) currentItems[index].quantity = data.item.quantity;

  } catch (e) { 
    alert("Errore aggiornamento stock:", e);
    // Rollback
    stockValEl.innerText = currentQty;
    if (index !== -1) currentItems[index].quantity = currentQty;
    if (typeof window.showToast === 'function') window.showToast("Errore di sincronizzazione.", "error");
  }
}

function openItemModal(itemId = null) {
  const form = document.getElementById("item-form");
  if (form) form.reset();
  
  if (itemId) {
    const item = currentItems.find(i => i._id === itemId);
    if (!item) return;
    
    document.getElementById("itemModalLabel").innerText = "Modifica Articolo";
    document.getElementById("save-item-btn").innerText = "Aggiorna";
    document.getElementById("item-id").value = item._id;
    document.getElementById("item-name").value = item.name;
    document.getElementById("item-price").value = item.price;
    document.getElementById("item-category").value = item.category || 'altro';
    document.getElementById("item-description").value = item.description || "";
    document.getElementById("qty-container").style.display = "none";
    
    if (item.image && typeof setFinalImage === 'function') {
      setFinalImage("item-image", item.image);
    } else if (typeof clearImageWidget === 'function') {
      clearImageWidget("item-image");
    }
  } else {
    document.getElementById("itemModalLabel").innerText = "Nuovo Articolo";
    document.getElementById("save-item-btn").innerText = "Salva";
    document.getElementById("item-id").value = "";
    document.getElementById("qty-container").style.display = "block";
    if (typeof clearImageWidget === 'function') clearImageWidget("item-image");
  }
  
  itemModalInstance.show();
}

async function saveItem() {
  const itemId = document.getElementById("item-id").value;
  const name = document.getElementById("item-name").value.trim();
  const price = parseFloat(document.getElementById("item-price").value);
  const category = document.getElementById("item-category").value;
  const description = document.getElementById("item-description").value.trim();
  const image = document.getElementById("item-image")?.value || "";
  
  if (!name || isNaN(price)) return alert("Nome e Prezzo sono obbligatori.");

  const payload = { name, price, category, description, image };
  if (!itemId) payload.quantity = parseInt(document.getElementById("item-qty").value) || 0;

  const btn = document.getElementById("save-item-btn");
  const originalText = btn.innerText;
  btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;
  btn.disabled = true;

  try {
    const url = itemId 
      ? `${API_BASE_URL}/items/${itemId}` 
      : `${API_BASE_URL}/museums/${currentMuseumId}/items`;
    
    const method = itemId ? "PUT" : "POST";
    
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      if (image && typeof markImageConfirmed === 'function') markImageConfirmed(image);
      itemModalInstance.hide();
      
      const data = await res.json();

      // RE-RENDERING MIRATO (Aggiorna array e cache per latenza 0)
      if (itemId) {
        const idx1 = currentItems.findIndex(i => i._id === itemId);
        if (idx1 !== -1) currentItems[idx1] = data.item;
        
        const idx2 = pristineItemsCache.findIndex(i => i._id === itemId);
        if (idx2 !== -1) pristineItemsCache[idx2] = data.item;
      } else {
        currentItems.unshift(data.item);
        pristineItemsCache.unshift(data.item);
        
        fetch(`${API_BASE_URL}/ai/generate-item-targetage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: data.item._id, itemName: name, itemDescription: description })
        });
      }

      renderItemsList(currentItems, false);
      if (typeof window.showToast === 'function') window.showToast("Articolo salvato con successo!", "success");

    } else {
      const errorData = await res.json();
      alert("Errore salvataggio: " + (errorData.error || "Riprova"));
    }
  } catch (error) { 
    alert(`Errore durante il salvataggio degli item: ${error}`); 
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

async function deleteItem(itemId) {
  const isConfirmed = await window.showCustomConfirm("Eliminazione", "Vuoi davvero rimuovere questo articolo dal catalogo?");
  if (!isConfirmed) return;
  
  const cardEl = document.getElementById(`item-card-${itemId}`);
  if (cardEl) cardEl.style.opacity = '0.4';

  try {
    const res = await fetch(`${API_BASE_URL}/items/${itemId}`, { 
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ museumId: currentMuseumId }) 
    });
    
    if (res.ok) {
      // Ottimizzazione locale
      currentItems = currentItems.filter(i => i._id !== itemId);
      pristineItemsCache = pristineItemsCache.filter(i => i._id !== itemId);
      renderItemsList(currentItems, false);
      if (typeof window.showToast === 'function') window.showToast("Articolo eliminato.", "success");
    } else {
      if (cardEl) cardEl.style.opacity = '1';
      alert("Errore durante l'eliminazione.");
    }
  } catch (error) { 
    if (cardEl) cardEl.style.opacity = '1';
    alert("Errore di connessione, impossibile eliminare l'item, riprovare più tardi" + error); 
  }
}
