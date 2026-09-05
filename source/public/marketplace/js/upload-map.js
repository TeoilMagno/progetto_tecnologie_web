let sectionModalInstance = null;
let localSections = []; // Teniamo in memoria l'array delle sezioni!

document.addEventListener("DOMContentLoaded", async () => {
  const pathSegments = window.location.pathname.split('/');
  currentMuseumId = pathSegments[2];

  if (!currentMuseumId) return;

  if (document.getElementById("sectionModal")) {
    sectionModalInstance = new bootstrap.Modal(document.getElementById("sectionModal"));
  }

  // INIZIALIZZAZIONE WIDGETS
  if (typeof initImageWidget === "function") {
    // Il parametro 'true' nasconde il tasto Wikimedia
    initImageWidget("map-svg-widget-container", "map-svg-input", "Carica nuovo file Planimetria (SVG)", true);
    
    initImageWidget("edit-section-image-widget", "section-image-input", "Immagine della Sezione", true);
  }

  await loadCurrentMap(currentMuseumId);
  await loadMuseumSections(currentMuseumId);
});

// CARICA L'ANTEPRIMA DELLA MAPPA ESISTENTE
async function loadCurrentMap(museumId) {
  const container = document.getElementById("mapPreviewContainer");
  try {
    const response = await fetch(`/api/museums/${museumId}/map-svg`);
    
    if (response.status === 404) {
      container.innerHTML = `
        <div class="text-center text-white-50 p-4">
          <i class="bi bi-exclamation-circle fs-2 d-block mb-2 text-warning"></i>
          Nessuna mappa presente per questo museo. Carica un file SVG sottostante.
        </div>`;
      return;
    }
    if (!response.ok) throw new Error("Errore durante il recupero della mappa");

    container.innerHTML = await response.text();
  } catch (error) {
    container.innerHTML = `<div class="text-danger p-4"><i class="bi bi-x-octagon fs-2 d-block mb-2"></i>Impossibile caricare l'anteprima della mappa.</div>`;
  }
}

// CARICA LE SEZIONI DAL DATABASE NEL NOSTRO ARRAY LOCALE
async function loadMuseumSections(museumId) {
  try {
    const response = await fetch(`/api/museums/${museumId}/sections`);
    if (!response.ok) throw new Error("Errore nel recupero delle sezioni");
    
    localSections = await response.json();
    renderSectionsList(); // Renderizza la UI
  } catch (error) {
    console.error("Errore nel caricamento delle sezioni:", error);
  }
}

// RENDERIZZA LA LISTA COMPATTA DELLE SEZIONI
function renderSectionsList() {
  const container = document.getElementById("sectionsContainer");
  let html = "";

  if (localSections.length === 0) {
    container.innerHTML = `<div class="text-white-50 small mb-3">Nessuna sezione registrata. Clicca su "Aggiungi Sezione" per definirne una.</div>`;
    return;
  }

  localSections.forEach((sec, index) => {
    html += `
      <div class="glass-panel p-3 mb-3 d-flex align-items-center justify-content-between" style="border-radius: 12px;">
        <div class="d-flex align-items-center gap-3">
          <img src="${sec.image || '/img/default-section.jpg'}" alt="${sec.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;">
          <div>
            <h6 class="text-white mb-1">${sec.name}</h6>
            <div class="text-info small fw-bold">ID: <span class="text-white-50 fw-normal">${sec.svgGroupId}</span></div>
          </div>
        </div>
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-sm btn-glass text-white" onclick="openSectionModal(${index})"><i class="bi bi-pencil"></i> Modifica</button>
          <button type="button" class="btn btn-sm btn-glass text-danger" onclick="removeLocalSection(${index})"><i class="bi bi-trash"></i> Elimina</button>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

// APRE IL MODALE (Sia per creazione che per modifica)
function openSectionModal(index = -1) {
  const idInput = document.getElementById("section-id-input");
  idInput.dataset.index = index;

  if (index >= 0) {
    // MODIFICA SEZIONE ESISTENTE
    const sec = localSections[index];
    idInput.value = sec._id || `temp_${index}`;
    document.getElementById("section-name-input").value = sec.name || "";
    document.getElementById("section-svg-id-input").value = sec.svgGroupId || "";
    document.getElementById("sec-v-x").value = sec.viewBox?.x ?? 0;
    document.getElementById("sec-v-y").value = sec.viewBox?.y ?? 0;
    document.getElementById("sec-v-w").value = sec.viewBox?.width ?? 2000;
    document.getElementById("sec-v-h").value = sec.viewBox?.height ?? 1200;
    
    // Gestione Immagine nel Widget
    if (sec.image && typeof setFinalImage === 'function') {
      setFinalImage("section-image-input", sec.image);
    } else if (typeof clearImageWidget === 'function') {
      clearImageWidget("section-image-input");
    }
  } else {
    // NUOVA SEZIONE
    idInput.value = `temp_${Date.now()}`;
    document.getElementById("section-form").reset();
    document.getElementById("section-svg-id-input").value = "section-"; // Aiuto per la digitazione
    document.getElementById("sec-v-w").value = 2000;
    document.getElementById("sec-v-h").value = 1200;

    if (typeof clearImageWidget === 'function') clearImageWidget("section-image-input");
  }

  sectionModalInstance.show();
}

// SALVA I DATI DAL MODALE ALL'ARRAY LOCALE
function saveSectionFromModal() {
  const index = parseInt(document.getElementById("section-id-input").dataset.index);
  const name = document.getElementById("section-name-input").value.trim();
  const svgGroupId = document.getElementById("section-svg-id-input").value.trim();
  
  // L'Image Manager salva l'URL in questo input hidden
  const imageHiddenInput = document.getElementById("section-image-input");
  const image = imageHiddenInput ? imageHiddenInput.value.trim() : "default-section.jpg";

  if (!name || !svgGroupId) {
    alert("Compila i campi Nome e SVG Group ID!");
    return;
  }

  const sectionData = {
    _id: document.getElementById("section-id-input").value,
    name,
    svgGroupId,
    image: image || "default-section.jpg",
    museumId: currentMuseumId,
    viewBox: {
      x: parseFloat(document.getElementById("sec-v-x").value) || 0,
      y: parseFloat(document.getElementById("sec-v-y").value) || 0,
      width: parseFloat(document.getElementById("sec-v-w").value) || 2000,
      height: parseFloat(document.getElementById("sec-v-h").value) || 1200
    }
  };

  // Se è una modifica aggiorniamo, altrimenti pushiamo
  if (index >= 0) {
    localSections[index] = { ...localSections[index], ...sectionData };
  } else {
    localSections.push(sectionData);
  }

  sectionModalInstance.hide();
  renderSectionsList(); // Ridisegniamo la UI aggiornata
}

// RIMUOVE UNA SEZIONE DALLA LISTA LOCALE
function removeLocalSection(index) {
  if (confirm("Sei sicuro di voler rimuovere questa sezione dalla configurazione?")) {
    localSections.splice(index, 1);
    renderSectionsList();
  }
}

// SALVATAGGIO DEFINITIVO AL SERVER
async function handleSaveMapAndSections(event) {
  if (event) event.preventDefault();

  // ORA PRENDIAMO IL FILE DIRETTAMENTE DAL WIDGET!
  // Il widget genera automaticamente un id aggiungendo "-file" al nome che gli passiamo
  const fileInput = document.getElementById("map-svg-input-file");
  const svgFile = fileInput && fileInput.files.length > 0 ? fileInput.files[0] : null;

  const sectionsPayload = localSections.map(sec => {
    const cleanSec = { ...sec };
    if (cleanSec._id && cleanSec._id.startsWith("temp_")) {
      delete cleanSec._id;
    }
    return cleanSec;
  });

  try {
    // 1. Invio del file SVG (se fornito)
    if (svgFile) {
      const formData = new FormData();
      formData.append("mapSvg", svgFile);

      const uploadSvgRes = await fetch(`/api/museums/${currentMuseumId}/upload-map-svg`, {
        method: "POST",
        body: formData
      });

      if (!uploadSvgRes.ok) throw new Error("Errore durante l'upload del file SVG");
    }

    // 2. Invio dell'array delle sezioni al Database
    const updateSectionsRes = await fetch(`/api/museums/${currentMuseumId}/sections/bulk-update`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sections: sectionsPayload })
    });

    if (!updateSectionsRes.ok) throw new Error("Errore durante il salvataggio delle sezioni");

    alert("Configurazione mappa e sezioni salvata con successo!");
    window.location.reload();
  } catch (err) {
    console.error(err);
    alert(`Salvataggio fallito: ${err.message}`);
  }
}
