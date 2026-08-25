// Aggiunto il parametro opzionale 'uploadOnly' (di default è falso)
function initImageWidget(containerId, hiddenInputId, labelText, uploadOnly = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let externalSearchHtml = "";
  let urlInputHtml = "";

  // Se NON è solo upload, mostriamo i bottoni Wiki e la barra URL
  if (!uploadOnly) {
    externalSearchHtml = `
      <span class="text-secondary small d-flex align-items-center">oppure</span>
      <button type="button" class="btn btn-sm btn-outline-info flex-grow-1" onclick="searchWikimediaForWidget('${hiddenInputId}')">
        <i class="bi bi-wikipedia"></i> Cerca Wiki
      </button>
    `;
    urlInputHtml = `
      <div class="input-group input-group-sm mb-2">
        <span class="input-group-text bg-transparent border-secondary text-secondary"><i class="bi bi-link"></i></span>
        <input type="text" id="${hiddenInputId}-url-input" class="form-control glass-input text-white" placeholder="Link web da salvare in locale...">
        <button class="btn btn-sm btn-outline-success" type="button" onclick="downloadExternalToLocal('${hiddenInputId}')">
          <i class="bi bi-download"></i> Salva
        </button>
      </div>
    `;
  }

  container.innerHTML = `
    <label class="form-label small text-secondary mb-1">${labelText}</label>
    <div class="card bg-dark border border-secondary border-opacity-25 p-2 mb-3">
      
      <input type="hidden" id="${hiddenInputId}">
      
      <div class="d-flex gap-2 mb-2">
        <div class="flex-grow-1">
          <input type="file" id="${hiddenInputId}-file" class="form-control form-control-sm glass-input text-white" accept="image/*" onchange="handleImageUpload(this, '${hiddenInputId}')">
        </div>
        ${externalSearchHtml}
      </div>

      ${urlInputHtml}

      <div id="${hiddenInputId}-wiki-results" class="d-flex gap-2 overflow-auto py-2 d-none custom-scrollbar" style="max-height: 120px;"></div>

      <div id="${hiddenInputId}-preview-container" class="text-center mt-2 d-none position-relative">
         <span class="badge bg-success mb-1">Immagine pronta</span><br>
         <img id="${hiddenInputId}-preview" src="" class="rounded border border-secondary" style="max-height: 120px; object-fit: contain;">
         <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0 mt-4 me-2" onclick="clearImageWidget('${hiddenInputId}')" title="Rimuovi immagine"><i class="bi bi-trash"></i></button>
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
  // Sfruttiamo un prompt nativo per scollegare la logica dai vari ID del form
  const query = prompt("Cosa vuoi cercare su Wikimedia? (es. La Gioconda Leonardo)");
  if (!query || query.trim() === "") return;

  const resultsContainer = document.getElementById(`${targetId}-wiki-results`);
  resultsContainer.innerHTML = `<div class="spinner-border spinner-border-sm text-info m-auto"></div>`;
  resultsContainer.classList.remove("d-none");

  try {
    const res = await fetch(`${API_BASE_URL}/search-wikimedia?q=${encodeURIComponent(query)}`);
    const urls = await res.json();

    if (urls.length === 0) {
      resultsContainer.innerHTML = `<span class="small text-secondary m-auto">Nessun risultato.</span>`;
      return;
    }

    resultsContainer.innerHTML = urls.map(url => `
      <img src="${url}" class="rounded border border-secondary cursor-pointer hover-scale" 
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
  
  // Aggiorna l'input testuale visibile all'utente
  const urlInput = document.getElementById(`${targetId}-url-input`);
  if (urlInput) {
    urlInput.value = finalUrl;
  }

  // Mostra l'anteprima
  const previewContainer = document.getElementById(`${targetId}-preview-container`);
  const previewImg = document.getElementById(`${targetId}-preview`);
  
  if (previewContainer && previewImg) {
    previewImg.src = finalUrl;
    previewContainer.classList.remove("d-none");
  }
}

function clearImageWidget(targetId) {
  document.getElementById(targetId).value = "";
  document.getElementById(`${targetId}-file`).value = "";
  
  // Controlla se la barra URL esiste prima di svuotarla (utile per le sezioni uploadOnly)
  const urlInput = document.getElementById(`${targetId}-url-input`);
  if (urlInput) urlInput.value = "";
  
  document.getElementById(`${targetId}-preview-container`).classList.add("d-none");
}