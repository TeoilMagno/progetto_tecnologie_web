document.addEventListener("DOMContentLoaded", async () => {
  const pathSegments = window.location.pathname.split('/');
  // Estrae l'ID museo dal percorso (es. /museums/:id/upload-map)
  currentMuseumId = pathSegments[2];

  if (!currentMuseumId) {
    console.error("Museum ID non trovato nell'URL");
    return;
  }

  await loadCurrentMap(currentMuseumId);
  await loadMuseumSections(currentMuseumId);
});

// 1. CARICA L'ANTEPRIMA DELLA MAPPA ESISTENTE
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

    const svgText = await response.text();
    container.innerHTML = svgText;
  } catch (error) {
    container.innerHTML = `
      <div class="text-center text-danger p-4">
        <i class="bi bi-x-octagon fs-2 d-block mb-2"></i>
        Impossibile caricare l'anteprima della mappa.
      </div>`;
    console.error(error);
  }
}

// 2. CARICA LE SEZIONI DAL DATABASE
async function loadMuseumSections(museumId) {
  const container = document.getElementById("sectionsContainer");
  try {
    const response = await fetch(`/api/museums/${museumId}/sections`);
    if (!response.ok) throw new Error("Errore nel recupero delle sezioni");
    
    const sections = await response.json();
    container.innerHTML = "";

    if (!sections || sections.length === 0) {
      container.innerHTML = `
        <div class="text-white-50 small mb-3">Nessuna sezione registrata. Clicca su "Aggiungi Sezione" per definirne una.</div>`;
      return;
    }

    sections.forEach(section => {
      renderSectionCard(section);
    });
  } catch (error) {
    console.error("Errore nel caricamento delle sezioni:", error);
    container.innerHTML = `<div class="text-danger small">Errore durante il caricamento delle sezioni.</div>`;
  }
}

// 3. RENDERIZZA LA CARD DI UNA SEZIONE
function renderSectionCard(section = {}) {
  const container = document.getElementById("sectionsContainer");
  const sectionId = section._id || `temp_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
  const isExisting = Boolean(section._id);

  const card = document.createElement("div");
  card.className = "section-card position-relative";
  card.dataset.sectionId = sectionId;
  card.dataset.isExisting = isExisting;

  const viewBox = section.viewBox || { x: 0, y: 0, width: 2000, height: 1200 };

  card.innerHTML = `
    <button type="button" class="btn-close btn-close-white position-absolute top-0 end-0 m-3" onclick="this.closest('.section-card').remove()" aria-label="Elimina"></button>
    <div class="row g-3">
      <div class="col-md-6">
        <label class="form-label text-white small">Nome Sezione</label>
        <input type="text" class="form-control input-aura sec-name" value="${section.name || ''}" placeholder="Es: Greek and Roman Art" required />
      </div>
      <div class="col-md-6">
        <label class="form-label text-white small">SVG Group ID (senza prefisso dettaglio)</label>
        <input type="text" class="form-control input-aura sec-svg-id" value="${section.svgGroupId || ''}" placeholder="Es: section-greek-and-roman-art" required />
      </div>

      <!-- VIEWBOX COORDINATES -->
      <div class="col-12 mt-2">
        <span class="text-info small fw-semibold">Coordinate ViewBox per Zoom:</span>
      </div>
      <div class="col-3">
        <label class="form-label text-white-50 small">X</label>
        <input type="number" class="form-control input-aura sec-v-x" value="${viewBox.x ?? 0}" required />
      </div>
      <div class="col-3">
        <label class="form-label text-white-50 small">Y</label>
        <input type="number" class="form-control input-aura sec-v-y" value="${viewBox.y ?? 0}" required />
      </div>
      <div class="col-3">
        <label class="form-label text-white-50 small">Larghezza (Width)</label>
        <input type="number" class="form-control input-aura sec-v-w" value="${viewBox.width ?? 2000}" required />
      </div>
      <div class="col-3">
        <label class="form-label text-white-50 small">Altezza (Height)</label>
        <input type="number" class="form-control input-aura sec-v-h" value="${viewBox.height ?? 1200}" required />
      </div>
    </div>
  `;

  container.appendChild(card);
}

function addNewSectionCard() {
  renderSectionCard({
    name: "",
    svgGroupId: "section-",
    viewBox: { x: 0, y: 0, width: 2000, height: 1200 }
  });
}

// 4. SALVATAGGIO CONFIGURAZIONE COMPLETA
async function handleSaveMapAndSections(event) {
  if (event) event.preventDefault();

  const fileInput = document.getElementById("svgFileInput");
  const svgFile = fileInput.files[0];

  // Raccogliamo le sezioni dal DOM
  const sectionCards = document.querySelectorAll(".section-card");
  const sectionsPayload = [];

  for (const card of sectionCards) {
    const name = card.querySelector(".sec-name").value.trim();
    const svgGroupId = card.querySelector(".sec-svg-id").value.trim();
    const x = parseFloat(card.querySelector(".sec-v-x").value);
    const y = parseFloat(card.querySelector(".sec-v-y").value);
    const width = parseFloat(card.querySelector(".sec-v-w").value);
    const height = parseFloat(card.querySelector(".sec-v-h").value);

    if (!name || !svgGroupId) {
      alert("Compila il nome e il Group ID per tutte le sezioni!");
      return;
    }

    const secObj = {
      name,
      svgGroupId,
      viewBox: { x, y, width, height },
      museumId: currentMuseumId,
      image: "default-section.jpg"
    };

    if (card.dataset.isExisting === "true" && !card.dataset.sectionId.startsWith("temp_")) {
      secObj._id = card.dataset.sectionId;
    }

    sectionsPayload.push(secObj);
  }

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

    // 2. Invio/Aggiornamento delle sezioni nel Database
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
