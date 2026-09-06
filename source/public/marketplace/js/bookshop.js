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
  
  const backBtn = document.getElementById("back-to-museum-btn");
  if (backBtn) backBtn.href = `/edit-museum?id=${currentMuseumId}`;

  if (typeof initImageWidget === 'function') {
    initImageWidget("edit-item-image-widget", "item-image", "Immagine Articolo");
  }

  // 1. Popoliamo la barra dei filtri laterale sfruttando sidebar.js
  if (typeof populateFilters === 'function') populateFilters("items");

  // 2. Barra di ricerca in alto
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
        window.applyItemFilters(); // Rilancia i filtri passando per l'override
      }
    });
    
    // Ricerca live: sfrutta la funzione di filtro centralizzata
    searchInput.addEventListener("input", () => window.applyItemFilters());
  }

  // Chiamata iniziale
  currentItemsPage = 1;
  renderedItemsCount = 0;
  await fetchAndRenderItems(currentMuseumId, false);
});

// ==========================================
// OVERRIDE FILTRI E OTTIMIZZAZIONE CACHE
// ==========================================

// Intercettiamo i filtri di filters.js per supportare la paginazione e isEntireItemsDbInCache
window.applyItemFilters = async function() {
  const searchInput = document.getElementById("catalog-search-input")?.value.trim().toLowerCase() || "";
  const categoryCbs = Array.from(document.querySelectorAll('.item-category-checkbox:checked')).map(cb => cb.value);
  const selectedAge = document.getElementById("filter-age-select")?.value || "";
  const maxPrice = parseInt(document.getElementById("item-price-slider")?.value || 100);

  const hasFilters = searchInput !== "" || categoryCbs.length > 0 || selectedAge !== "" || maxPrice < 100;

  // 1. CACHE PULITA: Ripristino istantaneo se non ci sono filtri
  if (!hasFilters && pristineItemsCache.length > 0) {
    currentItems = [...pristineItemsCache];
    currentItemsPage = pristineItemsPage;
    totalItemsPages = pristineTotalItemsPages;

    renderedItemsCount = Math.min(ITEMS_RENDER_CHUNK, currentItems.length);
    renderCatalog(currentItems.slice(0, renderedItemsCount), false);
    updateItemsSentinelVisibility();
    return;
  }

  // 2. ADAPTIVE FETCHING: Filtraggio in RAM a latenza zero se il DB è in cache
  if (isEntireItemsDbInCache && hasFilters) {
    let filtered = pristineItemsCache.filter(item => {
      // Fuzzy search compatibile con search-bar.js
      if (searchInput && !fuzzySearch(searchInput, item.name) && !(item.description && fuzzySearch(searchInput, item.description))) return false;
      // Categoria
      if (categoryCbs.length > 0 && !categoryCbs.includes(item.category)) return false;
      // Età Target
      if (selectedAge && item.targetAge !== selectedAge && item.targetAge !== 'all') return false;
      // Prezzo
      if (maxPrice < 100 && item.price > maxPrice) return false;
      
      return true;
    });

    currentItems = filtered;
    renderedItemsCount = Math.min(ITEMS_RENDER_CHUNK, currentItems.length);
    renderCatalog(currentItems.slice(0, renderedItemsCount), false);
    updateItemsSentinelVisibility();
    return;
  }

  // 3. SERVER-SIDE FILTERING: Delega al backend se il DB non è interamente scaricato
  currentItemsPage = 1;
  renderedItemsCount = 0;
  await fetchAndRenderItems(currentMuseumId, false);
};

window.resetItemFilters = function() {
  document.querySelectorAll('.item-category-checkbox').forEach(cb => cb.checked = false);
  const ageSelect = document.getElementById("filter-age-select");
  if (ageSelect) ageSelect.value = "";
  const priceSlider = document.getElementById("item-price-slider");
  if (priceSlider) {
    priceSlider.value = 100;
    document.getElementById("item-price-value").innerText = "100+ €";
  }
  const searchInput = document.getElementById("catalog-search-input");
  if (searchInput) searchInput.value = "";
  
  window.applyItemFilters();
};

async function fetchAndRenderItems(museumId, isLoadMore = false) {
  if (isFetchingItems) return;
  isFetchingItems = true;

  const searchInput = document.getElementById("catalog-search-input")?.value.trim() || "";
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
      renderCatalog(nextChunk, true);
    } else {
      currentItems = fetchedArray;
      if (!hasFilters) {
        pristineItemsCache = [...currentItems];
        pristineItemsPage = currentItemsPage;
        pristineTotalItemsPages = totalItemsPages;
        isEntireItemsDbInCache = pristineItemsCache.length >= data.total;
      }

      renderedItemsCount = Math.min(ITEMS_RENDER_CHUNK, currentItems.length);
      renderCatalog(currentItems.slice(0, renderedItemsCount), false);
    }

    setupItemsInfiniteScroll(museumId);
  } catch (error) {
    console.error("Errore fetch items:", error);
    const catalogArea = document.getElementById("items-catalog-area");
    if (catalogArea && !isLoadMore) {
      catalogArea.innerHTML = `<p class="text-danger col-12 text-center mt-3">Errore di connessione.</p>`;
    }
  } finally {
    isFetchingItems = false;
    updateItemsSentinelVisibility();
  }
}

function renderCatalog(itemsToRender, append = false) {
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
    html += `
      <div class="col" id="item-card-${item._id}">
        <div class="card custom-card h-100 border-secondary border-opacity-25" style="background: rgba(255,255,255,0.02);">
          <img src="${img}" class="card-img-top object-fit-cover border-bottom border-secondary border-opacity-25" style="height: 180px;">
          <div class="card-body p-3 d-flex flex-column">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="badge bg-secondary text-white text-uppercase" style="font-size: 0.65rem;">${item.category || 'Altro'}</span>
              <span class="text-info fw-bold">€${item.price.toFixed(2)}</span>
            </div>
            <h6 class="card-title text-white mb-1 text-truncate">${item.name}</h6>
            <p class="small text-white-50 mb-3 text-truncate-3" style="font-size: 0.75rem;">${item.description || 'Nessuna descrizione'}</p>
            
            <div class="mt-auto bg-dark rounded-3 p-2 d-flex justify-content-between align-items-center border border-secondary border-opacity-50">
              <div class="text-center me-2">
                <span class="d-block small text-secondary" style="font-size: 0.65rem; line-height: 1;">Disponibili</span>
                <strong class="text-warning fs-6" id="stock-val-${item._id}">${item.quantity}</strong>
              </div>
              <div class="input-group input-group-sm" style="width: 120px;">
                <button class="btn btn-outline-danger px-2 border-secondary" type="button" onclick="updateStock('${item._id}', 'remove')"><i class="bi bi-dash"></i></button>
                <input type="number" class="form-control bg-transparent text-white text-center border-secondary px-1 shadow-none" id="qty-change-${item._id}" value="1" min="1">
                <button class="btn btn-outline-success px-2 border-secondary" type="button" onclick="updateStock('${item._id}', 'add')"><i class="bi bi-plus"></i></button>
              </div>
            </div>
            
            <div class="d-flex gap-2 mt-3 pt-3 border-top border-secondary border-opacity-25">
              <button class="btn btn-sm btn-outline-info w-50" onclick="openItemModal('${item._id}')"><i class="bi bi-pencil me-1"></i> Modifica</button>
              <button class="btn btn-sm btn-outline-danger w-50" onclick="deleteItem('${item._id}')"><i class="bi bi-trash me-1"></i> Elimina</button>
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
          renderCatalog(nextChunk, true);
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
    console.error("Errore aggiornamento stock:", e);
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

      renderCatalog(currentItems, false);
      if (typeof window.showToast === 'function') window.showToast("Articolo salvato con successo!", "success");

    } else {
      const errorData = await res.json();
      alert("Errore salvataggio: " + (errorData.error || "Riprova"));
    }
  } catch (error) { 
    console.error(error); 
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
      renderCatalog(currentItems, false);
      if (typeof window.showToast === 'function') window.showToast("Articolo eliminato.", "success");
    } else {
      if (cardEl) cardEl.style.opacity = '1';
      alert("Errore durante l'eliminazione.");
    }
  } catch (error) { 
    if (cardEl) cardEl.style.opacity = '1';
    console.error(error); 
  }
}