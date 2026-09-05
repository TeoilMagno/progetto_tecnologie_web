// set delle immagini inserite ma il cui contenitore non e' salvato (es opera prima di salva)
// serve per tenere traccia del fatto che l'utente scelga di annullare l'operazione oppure ricarichi la pagina
window._pendingUploads = window._pendingUploads || new Set();

window.addEventListener("pagehide", () => {
  window._pendingUploads.forEach(url => {
    const blob = new Blob([JSON.stringify({ imageUrl: url })], { type: 'application/json' });
    navigator.sendBeacon(`${API_BASE_URL}/delete-image-beacon`, blob);
  });
});

function markImageConfirmed(url) {
  window._pendingUploads.delete(url);
}

async function discardImage(url) {
  if (!url || !window._pendingUploads.has(url)) return; // già salvata o mai caricata da noi: non tocchiamo nulla
  window._pendingUploads.delete(url);
  try {
    await fetch(`${API_BASE_URL}/delete-image`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: url })
    });
  } catch (e) {
    console.error("Errore pulizia immagine orfana:", e);
  }
}

// Aggiunto il parametro opzionale 'uploadOnly' (di default è falso)
function initImageWidget(containerId, hiddenInputId, labelText, uploadOnly = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let externalSearchHtml = "";
  let urlInputHtml = "";

  // Se NON è solo upload, mostriamo i bottoni Wiki e la barra URL
  if (!uploadOnly) {
    externalSearchHtml = `
      <button type="button" class="btn btn-sm btn-glass text-info px-3 d-flex align-items-center justify-content-center" onclick="searchWikimediaForWidget('${hiddenInputId}')" title="Cerca immagine su Wikimedia">
        <i class="bi bi-wikipedia me-2"></i> Cerca su Wikimedia
      </button>
      <button type="button" class="btn btn-sm btn-glass text-info px-3 d-flex align-items-center justify-content-center" onclick="promptForImageUrl('${hiddenInputId}')" title="Inserisci link URL immagine diretto">
        <i class="bi bi-link-45deg me-2"></i> Inserisci URL
      </button>
    `;
  }

  container.innerHTML = `
    <label class="form-label small text-secondary mb-1"><i class="bi bi-image me-1"></i>${labelText}</label>
    <div class="card custom-card bg-dark bg-opacity-25 border-secondary border-opacity-25 mb-3" style="border-radius: 12px; transition: all 0.3s ease;">
      
      <input type="hidden" id="${hiddenInputId}">
      
      <div class="card-body p-3">
        
        <!-- SEZIONE INPUT -->
        <div id="${hiddenInputId}-input-section">
          <div class="d-flex flex-column flex-md-row gap-2">
            <div class="flex-grow-1 position-relative">
              <input type="file" id="${hiddenInputId}-file" class="d-none" accept="image/*" onchange="handleImageUpload(this, '${hiddenInputId}')">
              
              <label for="${hiddenInputId}-file" class="btn btn-sm btn-glass text-white w-100 border border-secondary border-opacity-50 py-2 d-flex align-items-center justify-content-center gap-2 mb-0 shadow-sm" style="cursor: pointer; border-radius: 8px; transition: all 0.2s;">
                <i class="bi bi-cloud-arrow-up text-info fs-5"></i>
                <span class="small fw-bold">Scegli un'immagine dal dispositivo</span>
              </label>
            </div>
            ${externalSearchHtml}
          </div>

          <!-- Contenitore Risultati Wiki -->
          <div id="${hiddenInputId}-wiki-results" class="d-flex gap-2 overflow-auto py-2 d-none custom-scrollbar mt-2" style="max-height: 110px;"></div>
        </div>

        <!-- SEZIONE ANTEPRIMA -->
        <div id="${hiddenInputId}-preview-container" class="d-none text-center">
          <div class="position-relative d-inline-block rounded-3 overflow-hidden shadow-lg border border-secondary border-opacity-50 bg-dark">
            <img id="${hiddenInputId}-preview" src="" class="img-fluid" style="max-height: 180px; object-fit: contain;">
          </div>
          <div class="mt-2 d-flex justify-content-center gap-2">
            <button type="button" class="btn btn-sm btn-outline-info px-3" onclick="triggerReplaceImage('${hiddenInputId}')">
              <i class="bi bi-arrow-repeat me-1"></i> Cambia
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger px-3" onclick="clearImageWidget('${hiddenInputId}')">
              <i class="bi bi-trash me-1"></i> Rimuovi
            </button>
          </div>
          <div class="mt-1 text-success small fw-bold"><i class="bi bi-check-circle-fill me-1"></i>Immagine acquisita</div>
        </div>

      </div>
    </div>
  `;
}

async function handleImageUpload(fileInput, targetId) {
  const file = fileInput.files[0];
  if (!file) return;

  // Mostra il nome del file scelto nel bottone
  const labelEl = document.querySelector(`label[for="${targetId}-file"] span`);
  if (labelEl) labelEl.innerText = file.name;

  const formData = new FormData();
  formData.append("image", file);

  try {
    const res = await fetch(`${API_BASE_URL}/upload-image`, { method: "POST", body: formData });
    if (res.ok) {
      const data = await res.json();
      setFinalImage(targetId, data.url);
      window._pendingUploads.add(data.url);
    } else {
      alert("Errore durante il caricamento del file.");
      if (labelEl) labelEl.innerText = "Scegli un'immagine dal dispositivo";
    }
  } catch (error) { 
    console.error(error); 
    if (labelEl) labelEl.innerText = "Scegli un'immagine dal dispositivo";
  }
}

async function searchWikimediaForWidget(targetId) {
  const query = await window.showCustomPrompt("Cerca su Wikimedia", "Es. La Gioconda Leonardo...");
  if (!query || query.trim() === "") return;

  const resultsContainer = document.getElementById(`${targetId}-wiki-results`);
  resultsContainer.innerHTML = `<div class="spinner-border spinner-border-sm text-info m-auto"></div>`;
  resultsContainer.classList.remove("d-none");

  try {
    const res = await fetch(`${API_BASE_URL}/search-wikimedia?q=${encodeURIComponent(query)}`);
    const urls = await res.json();

    if (urls.length === 0) {
      resultsContainer.innerHTML = `<span class="small text-secondary m-auto">Nessun risultato. Riprova con altre parole chiave.</span>`;
      return;
    }

    resultsContainer.innerHTML = urls.map(url => `
      <img src="${url}" class="rounded border border-info cursor-pointer hover-scale shadow-sm" 
           style="height: 80px; object-fit: cover; cursor: pointer; transition: transform 0.2s;" 
           onclick="selectWikiImage('${url}', '${targetId}')" title="Clicca per scegliere">
    `).join('');
  } catch (error) { resultsContainer.innerHTML = `<span class="small text-danger m-auto">Errore ricerca.</span>`; }
}

async function promptForImageUrl(targetId) {
  const url = await window.showCustomPrompt("Inserisci URL Immagine", "Es. https://upload.wikimedia.org/wikipedia/commons/... o /uploads/...", "bi-link-45deg");
  if (!url || url.trim() === "") return;

  const trimmedUrl = url.trim();
  if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://") && !trimmedUrl.startsWith("/")) {
    alert("Inserisci un URL valido (deve iniziare con http://, https:// o /)");
    return;
  }

  setFinalImage(targetId, trimmedUrl);
}

function selectWikiImage(url, targetId) {
  document.getElementById(`${targetId}-wiki-results`).classList.add("d-none");
  setFinalImage(targetId, url); // Salviamo direttamente l'URL di Wiki senza scaricare!
}

function setFinalImage(targetId, finalUrl) {
  document.getElementById(targetId).value = finalUrl;
  
  const previewContainer = document.getElementById(`${targetId}-preview-container`);
  const previewImg = document.getElementById(`${targetId}-preview`);
  const inputSection = document.getElementById(`${targetId}-input-section`);
  
  if (previewContainer && previewImg) {
    previewImg.src = finalUrl;
    previewContainer.classList.remove("d-none");
  }
  if (inputSection) {
    inputSection.classList.add("d-none");
  }
}

async function clearImageWidget(targetId) {
  const hiddenInput = document.getElementById(targetId);
  const imageUrl = hiddenInput.value;

  if (imageUrl && imageUrl.startsWith('/uploads/')) {
    try {
      await fetch(`${API_BASE_URL}/delete-image`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: imageUrl })
      });
    } catch (error) {
      console.error("Errore pulizia file:", error);
    }
  }

  hiddenInput.value = "";
  const fileInput = document.getElementById(`${targetId}-file`);
  if (fileInput) fileInput.value = "";
  
  const previewContainer = document.getElementById(`${targetId}-preview-container`);
  const inputSection = document.getElementById(`${targetId}-input-section`);
  
  if (previewContainer) previewContainer.classList.add("d-none");
  if (inputSection) inputSection.classList.remove("d-none");
}

// Permette di riaprire la sezione di input per sostituire l'immagine esistente
function triggerReplaceImage(targetId) {
  const inputSection = document.getElementById(`${targetId}-input-section`);
  const previewContainer = document.getElementById(`${targetId}-preview-container`);
  
  if (inputSection) inputSection.classList.remove("d-none");
  if (previewContainer) previewContainer.classList.add("d-none");
}
