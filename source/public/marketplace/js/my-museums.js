// Pagina "I miei musei" (curatore/admin).
// Le variabili globali condivise (API_BASE_URL, RENDER_CHUNK, cachedMuseums,
// globalSentinel, isFetchingMuseums...) restano in config.js.
//
// NOTA: renderManagedMuseumsList è una versione volutamente semplificata di
// renderMuseumsList (marketplace.js): qui il click porta sempre alla pagina
// pubblica del museo (/marketplace?museumId=...), non apre la dashboard inline,
// quindi non serve gestire il branch "isMarketplace" né riposizionare la
// sentinella dentro alla lista (ci pensa loadManagedMuseums subito dopo).

async function loadManagedMuseums(isLoadMore = false) {
  const container = document.getElementById("managed-museums-area");
  if (!container) return;

  if (!isLoadMore) {
    container.innerHTML = `<div class="col-12 text-center mt-5"><div class="spinner-border text-info"></div></div>`;
    myMuseumsAdminPage = 1;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/my-museums?page=${myMuseumsAdminPage}&limit=${RENDER_CHUNK}`);
    const data = await response.json();

    const isPaginated = !Array.isArray(data);
    const fetchedMuseums = isPaginated ? data.museums : data;
    const totalPages = isPaginated ? data.totalPages : 1;

    if (fetchedMuseums.length === 0 && !isLoadMore) {
      container.innerHTML = `
        <div class="col-12 text-center py-5">
            <p class="text-secondary">Non hai ancora musei assegnati.</p>
            <a href="/add-museum" class="btn btn-primary">Aggiungi il tuo primo museo</a>
        </div>`;
      return;
    }

    // FIX CACHE: Iniettiamo i musei recuperati nella Cache Globale (condivisa con la home
    // del marketplace), così se l'utente clicca su un museo la dashboard non deve rifetchare.
    if (fetchedMuseums && fetchedMuseums.length > 0) {
      fetchedMuseums.forEach(newMus => {
        if (!newMus) return;
        const index = cachedMuseums.findIndex(m => m && m._id === newMus._id);
        if (index === -1) cachedMuseums.push(newMus);
        else cachedMuseums[index] = newMus; // Aggiorna dati se già presente
      });
    }

    renderManagedMuseumsList(fetchedMuseums, isLoadMore);

    if (isPaginated) {
      container.appendChild(globalSentinel);
      setupManagedMuseumsObserver(totalPages);
      
      if (myMuseumsAdminPage >= totalPages) {
        globalSentinel.classList.add("d-none");
      } else {
        globalSentinel.classList.remove("d-none");
      }
    }
  } catch (error) {
    if (!isLoadMore) container.innerHTML = `<div class="alert alert-danger">Errore nel caricamento dei tuoi musei.</div>`;
  }
}

// Versione semplificata di renderMuseumsList, ad uso esclusivo di questa pagina.
function renderManagedMuseumsList(museums, append = false) {
  const container = document.getElementById("managed-museums-area");
  if (!container) return;

  if (!append) {
    container.innerHTML = "";
  }

  if (museums.length === 0 && !append) {
    container.innerHTML = '<div class="col-12 text-center text-secondary py-5">Nessun museo trovato.</div>';
    return;
  }

  let htmlString = "";

  museums.forEach((museum) => {
    if (!museum) return;

    const tags = museum.tags || [];
    const tagsHtml = tags
        .map((tag) => `<span class="badge badge-tag">${tag}</span>`)
        .join("");

    htmlString += `
      <div class="col">
        <div class="card h-100 custom-card cursor-pointer" onclick="window.location.href='/marketplace?museumId=${museum._id}'" style="cursor: pointer;">
          <img src="${museum.image}" class="card-img-top" alt="${museum.name}" style="height: 200px; object-fit: cover; opacity: 0.9;">
          <div class="card-body">
            <h5 class="card-title">${museum.name}</h5>
            <p class="card-text small mb-3"><i class="bi bi-geo-alt me-1"></i> ${museum.address}</p>
            <div>${tagsHtml}</div>
          </div>
        </div>
      </div>`;
  });

  if (append) {
    container.insertAdjacentHTML('beforeend', htmlString);
  } else {
    container.innerHTML = htmlString;
  }
}

function setupManagedMuseumsObserver(totalPages) {
  if (!globalSentinel) return;
  if (managedMuseumObserver) managedMuseumObserver.disconnect();

  managedMuseumObserver = new IntersectionObserver((entries) => {
    // Impediamo doppie chiamate controllando isFetchingMuseums
    if (entries[0].isIntersecting && !isFetchingMuseums) {
       if (myMuseumsAdminPage < totalPages) {
          isFetchingMuseums = true;
          myMuseumsAdminPage++;
          loadManagedMuseums(true).finally(() => { isFetchingMuseums = false; });
       }
    }
  }, { rootMargin: '100px' });

  managedMuseumObserver.observe(globalSentinel);
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!document.getElementById("managed-museums-area")) return;
  await fetchCurrentUser();
  loadManagedMuseums();
});