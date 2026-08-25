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
        <i class="bi bi-wikipedia me-2"></i> Wiki
      </button>
    `;
    urlInputHtml = `
      <div class="input-group input-group-sm mt-2 shadow-sm">
        <span class="input-group-text bg-transparent border-secondary text-secondary"><i class="bi bi-link-45deg fs-5"></i></span>
        <input type="text" id="${hiddenInputId}-url-input" class="form-control glass-input text-white border-secondary" placeholder="Incolla un URL esterno e clicca Salva...">
        <button class="btn btn-sm btn-outline-success px-3" type="button" onclick="downloadExternalToLocal('${hiddenInputId}')">
          Salva
        </button>
      </div>
    `;
  }

  container.innerHTML = `
    <label class="form-label small text-info fw-bold mb-1"><i class="bi bi-image me-2"></i>${labelText}</label>
    <div class="card custom-card bg-dark bg-opacity-25 border-secondary border-opacity-25 mb-3" style="border-radius: 12px; transition: all 0.3s ease;">
      
      <input type="hidden" id="${hiddenInputId}">
      
      <div class="card-body p-3">
        
        <!-- SEZIONE INPUT (Scompare quando un'immagine è caricata) -->
        <div id="${hiddenInputId}-input-section">
          <div class="d-flex flex-column flex-md-row gap-2">
            <div class="flex-grow-1 position-relative shadow-sm">
              <input type="file" id="${hiddenInputId}-file" class="form-control form-control-sm glass-input text-white w-100 border-secondary" accept="image/*" onchange="handleImageUpload(this, '${hiddenInputId}')" style="padding-left: 2.2rem;">
              <i class="bi bi-cloud-arrow-up position-absolute text-info" style="top: 50%; left: 0.75rem; transform: translateY(-50%); pointer-events: none; font-size: 1.1rem;"></i>
            </div>
            ${externalSearchHtml}
          </div>
          
          ${urlInputHtml}

          <!-- Contenitore Risultati Wiki -->
          <div id="${hiddenInputId}-wiki-results" class="d-flex gap-2 overflow-auto py-2 d-none custom-scrollbar mt-2" style="max-height: 110px;"></div>
        </div>

        <!-- SEZIONE ANTEPRIMA (Appare solo ad immagine caricata) -->
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

  const formData = new FormData();
  formData.append("image", file);

  try {
    const res = await fetch(`${API_BASE_URL}/upload-image`, { method: "POST", body: formData });
    if (res.ok) {
      const data = await res.json();
      setFinalImage(targetId, data.url);
    } else {
      alert("Errore durante il caricamento del file.");
    }
  } catch (error) { console.error(error); }
}

async function searchWikimediaForWidget(targetId) {
  const query = prompt("Cosa vuoi cercare su Wikimedia? (es. La Gioconda Leonardo)");
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

function selectWikiImage(url, targetId) {
  document.getElementById(`${targetId}-url-input`).value = url;
  document.getElementById(`${targetId}-wiki-results`).classList.add("d-none");
  downloadExternalToLocal(targetId);
}

async function downloadExternalToLocal(targetId) {
  const urlInput = document.getElementById(`${targetId}-url-input`);
  const url = urlInput.value.trim();
  if (!url) return;

  urlInput.value = "Salvataggio sul server in corso...";
  urlInput.disabled = true;

  try {
    const res = await fetch(`${API_BASE_URL}/download-external-image`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url })
    });
    if (res.ok) {
      const data = await res.json();
      setFinalImage(targetId, data.url);
      urlInput.value = "Immagine salvata in locale!";
    } else {
      urlInput.value = url;
      alert("Impossibile scaricare. L'immagine potrebbe essere protetta o il link errato.");
    }
  } catch (error) { console.error(error); urlInput.value = url; } 
  finally { urlInput.disabled = false; }
}

function setFinalImage(targetId, finalUrl) {
  // Aggiorna l'input nascosto per il database
  document.getElementById(targetId).value = finalUrl;
  
  // Aggiorna la barra URL (anche se ora verrà nascosta, fa da backup)
  const urlInput = document.getElementById(`${targetId}-url-input`);
  if (urlInput) urlInput.value = finalUrl;

  // Elementi UI
  const previewContainer = document.getElementById(`${targetId}-preview-container`);
  const previewImg = document.getElementById(`${targetId}-preview`);
  const inputSection = document.getElementById(`${targetId}-input-section`);
  
  // Mostra l'anteprima e nasconde il form di input
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

  // Se c'è un'immagine caricata, la eliminiamo dal disco
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

  // Svuotamento campi dati
  hiddenInput.value = "";
  const fileInput = document.getElementById(`${targetId}-file`);
  if (fileInput) fileInput.value = "";
  const urlInput = document.getElementById(`${targetId}-url-input`);
  if (urlInput) urlInput.value = "";
  
  // Elementi UI: Nascondiamo l'anteprima e ripristiniamo il form
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