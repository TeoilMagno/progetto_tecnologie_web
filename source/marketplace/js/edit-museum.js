let currentMuseumId = null;
let currentMuseumData = null;
let museumSections = [];
let workModalInstance = null;
let sectionModalInstance = null;
let deleteMuseumModalInstance = null;

// Cache globale per tenere in memoria i dati delle opere
let worksCache = {};

document.addEventListener("DOMContentLoaded", async () => {
  const wModalEl = document.getElementById("workModal");
  if (wModalEl) workModalInstance = new bootstrap.Modal(wModalEl);

  const sModalEl = document.getElementById("sectionModal");
  if (sModalEl) sectionModalInstance = new bootstrap.Modal(sModalEl);

  const dModalEl = document.getElementById("deleteMuseumModal");
  if (dModalEl) deleteMuseumModalInstance = new bootstrap.Modal(dModalEl);

  // Ascoltatore per il controllo dello stile GitHub durante la cancellazione
  const confirmInput = document.getElementById("delete-confirm-input");
  if (confirmInput) {
    confirmInput.addEventListener("input", checkDeleteConfirmationText);
  }

  await fetchCurrentUser();

  const urlParams = new URLSearchParams(window.location.search);
  currentMuseumId = urlParams.get("id");

  if (!currentMuseumId) {
    alert("Nessun museo specificato nell'URL.");
    window.location.href = "/my-museums";
    return;
  }

  await loadMuseumDetails();
});

// Carica le informazioni del museo e le sue sezioni
async function loadMuseumDetails() {
  try {
    const res = await fetch(`${API_BASE_URL}/museums`);
    const museums = await res.json();
    currentMuseumData = museums.find((m) => m._id === currentMuseumId);

    if (!currentMuseumData) {
      alert("Museo non trovato.");
      return;
    }

    // Popola il form generale
    document.getElementById("museum-name").value = currentMuseumData.name || "";
    document.getElementById("museum-address").value = currentMuseumData.address || "";
    document.getElementById("museum-email").value = currentMuseumData.contact_email || "";
    document.getElementById("museum-phone").value = currentMuseumData.contact_phone || "";
    document.getElementById("museum-image").value = currentMuseumData.image || "";
    document.getElementById("museum-tags").value = (currentMuseumData.tags || []).join(", ");
    document.getElementById("editor-title").innerText = `Modifica: ${currentMuseumData.name}`;

    // Carica Sezioni
    await loadSectionsAndWorks();
  } catch (error) {
    console.error("Errore caricamento museo:", error);
    alert("Errore nel caricamento del museo.");
  }
}

// Carica sezioni ed opere
async function loadSectionsAndWorks() {
  const container = document.getElementById("sectionsAccordion");
  container.innerHTML = "";
  worksCache = {};

  try {
    const res = await fetch(`${API_BASE_URL}/museums/${currentMuseumId}/sections`);
    museumSections = await res.json();

    if (museumSections.length === 0) {
      container.innerHTML = `<div class="text-center py-4 text-secondary">Nessuna sezione presente. Clicca su "Aggiungi Nuova Sezione" per iniziare.</div>`;
      return;
    }

    for (let index = 0; index < museumSections.length; index++) {
      const section = museumSections[index];
      
      const worksRes = await fetch(`${API_BASE_URL}/sections/${section._id}/works`);
      const works = await worksRes.json();

      works.forEach(w => worksCache[w._id] = w);

      container.innerHTML += renderSectionAccordionItem(section, works, index);
    }
  } catch (error) {
    console.error("Errore sezioni:", error);
    container.innerHTML = `<div class="alert alert-danger">Errore nel caricamento delle sezioni.</div>`;
  }
}

// Renderizza il singolo elemento dell'accordion
function renderSectionAccordionItem(section, works, index) {
  const collapseId = `collapseSection${index}`;
  const headingId = `headingSection${index}`;
  
  const safeSectionName = (section.name || section.title || "").replace(/'/g, "\\'");
  const safeSectionImage = (section.image || "").replace(/'/g, "\\'");

  let worksHtml = "";
  if (works.length === 0) {
    worksHtml = `<p class="small text-secondary italic mb-0 py-2">Nessuna opera presente in questa sezione.</p>`;
  } else {
    worksHtml = `
      <div class="row row-cols-1 row-cols-md-2 g-3 mt-1">
        ${works.map(w => `
          <div class="col">
            <div class="card custom-card h-100 p-2 d-flex flex-row align-items-center">
              <img src="${w.image || '/img/fallback-work.jpg'}" class="rounded me-3" style="width: 60px; height: 60px; object-fit: cover;">
              <div class="flex-grow-1 text-truncate">
                <h6 class="mb-0 text-white text-truncate">${w.name}</h6>
                <small class="text-secondary">${w.author || 'Autore sconosciuto'}</small>
              </div>
              <div>
                <button class="btn btn-sm btn-outline-warning border-0 me-1" onclick="openWorkModal('${section._id}', '${w._id}')">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger border-0" onclick="deleteWork('${section._id}', '${w._id}')">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>`;
  }

  return `
    <div class="accordion-item custom-accordion-item mb-3 rounded border border-secondary border-opacity-25 overflow-hidden">
      <h2 class="accordion-header" id="${headingId}">
        <button class="accordion-button collapsed bg-transparent text-white" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}">
          <i class="bi bi-folder2-open me-2 text-info"></i> ${section.name || section.title}
          <span class="badge badge-tag ms-auto me-3">${works.length} opere</span>
        </button>
      </h2>
      <div id="${collapseId}" class="accordion-collapse collapse" data-bs-parent="#sectionsAccordion">
        <div class="accordion-body border-top border-secondary border-opacity-25 bg-dark bg-opacity-50">
          <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary border-opacity-25">
            <div>
              <button class="btn btn-sm btn-outline-warning me-2" onclick="openSectionModal('${section._id}', '${safeSectionName}', '${safeSectionImage}')">
                <i class="bi bi-pencil"></i> Modifica Sezione
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick="deleteSection('${section._id}')">
                <i class="bi bi-trash"></i> Elimina Sezione
              </button>
            </div>
            <button class="btn btn-sm btn-gradient mt-2 mt-md-0" onclick="openWorkModal('${section._id}')">
              <i class="bi bi-plus-lg me-1"></i> Aggiungi Opera
            </button>
          </div>
          ${worksHtml}
        </div>
      </div>
    </div>`;
}

// ------------------- GESTIONE SEZIONI -------------------

function openSectionModal(sectionId = null, currentName = "", currentImage = "") {
  document.getElementById("section-id-input").value = sectionId || "";
  document.getElementById("section-name-input").value = currentName;
  document.getElementById("section-image-input").value = currentImage;
  document.getElementById("sectionModalLabel").innerText = sectionId ? "Modifica Sezione" : "Nuova Sezione";
  sectionModalInstance.show();
}

async function saveSectionFromModal() {
  const sectionId = document.getElementById("section-id-input").value;
  const sectionName = document.getElementById("section-name-input").value.trim();
  const sectionImage = document.getElementById("section-image-input").value.trim();

  if (!sectionName) {
    alert("Il nome della sezione è obbligatorio.");
    return;
  }

  try {
    if (sectionId) {
      // Modifica Sezione Esistente (PUT)
      const res = await fetch(`${API_BASE_URL}/sections/${sectionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: sectionName, image: sectionImage, museumId: currentMuseumId })
      });
      if (res.ok) {
        sectionModalInstance.hide();
        loadSectionsAndWorks();
      } else { alert("Errore modifica sezione."); }

    } else {
      // Crea Nuova Sezione (POST)
      const res = await fetch(`${API_BASE_URL}/save-section`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rsection: { name: sectionName, image: sectionImage, works: [] }, museumId: currentMuseumId })
      });
      if (res.ok) {
        sectionModalInstance.hide();
        loadSectionsAndWorks();
      } else { alert("Errore creazione sezione."); }
    }
  } catch (error) {
    console.error(error);
  }
}

async function deleteSection(sectionId) {
  if (!confirm("Attenzione: Eliminando questa sezione eliminerai anche tutte le opere al suo interno! Sei sicuro?")) return;

  try {
    const res = await fetch(`${API_BASE_URL}/sections/${sectionId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ museumId: currentMuseumId })
    });

    if (res.ok) {
      loadSectionsAndWorks();
    } else {
      alert("Errore durante l'eliminazione della sezione.");
    }
  } catch (error) {
    console.error(error);
  }
}

// ------------------- GESTIONE OPERE -------------------

async function openWorkModal(sectionId, workId = null) {
  document.getElementById("work-section-id").value = sectionId;
  document.getElementById("work-id").value = workId || "";

  if (workId && worksCache[workId]) {
    const w = worksCache[workId];
    document.getElementById("workModalLabel").innerText = "Modifica Opera";
    document.getElementById("save-work-btn").innerText = "Aggiorna Opera";
    
    document.getElementById("work-name").value = w.name || "";
    document.getElementById("work-author").value = w.author || "";
    document.getElementById("work-year").value = w.year || "";
    document.getElementById("work-style").value = w.style || "";
    document.getElementById("work-image").value = w.image || "";
    
    let desc = "";
    if (w.description && w.description.length > 0) {
      desc = w.description[0].description || "";
    }
    document.getElementById("work-description").value = desc;

  } else {
    document.getElementById("workModalLabel").innerText = "Nuova Opera";
    document.getElementById("save-work-btn").innerText = "Crea Opera";
    document.getElementById("work-form").reset();
    document.getElementById("work-section-id").value = sectionId;
  }

  workModalInstance.show();
}

async function saveWorkFromModal() {
  const sectionId = document.getElementById("work-section-id").value;
  const workId = document.getElementById("work-id").value;
  
  const workData = {
    name: document.getElementById("work-name").value.trim(),
    author: document.getElementById("work-author").value.trim(),
    year: document.getElementById("work-year").value.trim(),
    style: document.getElementById("work-style").value.trim(),
    image: document.getElementById("work-image").value.trim(),
    description: [{ description: document.getElementById("work-description").value.trim(), tone: "normal", length: 10 }],
  };

  if (!workData.name) {
    alert("Il titolo dell'opera è obbligatorio!");
    return;
  }

  try {
    let res;
    if (workId) {
      res = await fetch(`${API_BASE_URL}/works/${workId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...workData, museumId: currentMuseumId })
      });
    } else {
      res = await fetch(`${API_BASE_URL}/add-work`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work: workData, sectionId: sectionId, museumId: currentMuseumId })
      });
    }

    if (res.ok) {
      workModalInstance.hide();
      loadSectionsAndWorks();
    } else {
      alert("Errore durante il salvataggio dell'opera.");
    }
  } catch (error) {
    console.error(error);
  }
}

async function deleteWork(sectionId, workId) {
  if (!confirm("Sei sicuro di voler eliminare questa singola opera?")) return;

  try {
    const res = await fetch(`${API_BASE_URL}/works/${workId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId: sectionId, museumId: currentMuseumId })
    });

    if (res.ok) {
      loadSectionsAndWorks();
    } else {
      alert("Errore durante l'eliminazione dell'opera.");
    }
  } catch (error) {
    console.error(error);
  }
}

// ------------------- SALVA E ELIMINA MUSEO -------------------

async function saveAllMuseumChanges() {
  const tagsString = document.getElementById("museum-tags").value;
  const updatedMuseum = {
    name: document.getElementById("museum-name").value.trim(),
    address: document.getElementById("museum-address").value.trim(),
    contact_email: document.getElementById("museum-email").value.trim(),
    contact_phone: document.getElementById("museum-phone").value.trim(),
    image: document.getElementById("museum-image").value.trim(),
    tags: tagsString ? tagsString.split(",").map(t => t.trim()) : []
  };

  try {
    const res = await fetch(`${API_BASE_URL}/museums/${currentMuseumId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedMuseum)
    });

    if (res.ok) {
      alert("Museo aggiornato con successo!");
      // REDIRECT POST SALVATAGGIO
      window.location.href = "/my-museums"; 
    } else {
      alert("Errore nel salvataggio delle modifiche.");
    }
  } catch (e) {
    console.error(e);
  }
}

// Apri modale eliminazione stile GitHub
function openDeleteMuseumModal() {
  if (!currentMuseumData) return;

  const targetName = currentMuseumData.name.toLowerCase().replace(/\s+/g, '-');
  const targetString = `delete ${targetName}`;

  const targetLabel = document.getElementById("delete-target-text");
  const inputField = document.getElementById("delete-confirm-input");
  const deleteBtn = document.getElementById("confirm-delete-museum-btn");

  targetLabel.innerText = targetString;
  inputField.value = "";
  inputField.dataset.target = targetString;
  deleteBtn.disabled = true;

  deleteMuseumModalInstance.show();
}

// Controllo dinamicamente se l'utente ha scritto la stringa esatta
function checkDeleteConfirmationText(e) {
  const inputVal = e.target.value.trim();
  const targetVal = e.target.dataset.target;
  const deleteBtn = document.getElementById("confirm-delete-museum-btn");

  deleteBtn.disabled = (inputVal !== targetVal);
}

// Conferma eliminazione definitiva museo
async function confirmDeleteMuseum() {
  try {
    const res = await fetch(`${API_BASE_URL}/museums/${currentMuseumId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ museumId: currentMuseumId })
    });

    if (res.ok) {
      deleteMuseumModalInstance.hide();
      alert("Museo eliminato definitivamente.");
      // REDIRECT POST ELIMINAZIONE
      window.location.href = "/my-museums"; 
    } else {
      alert("Errore durante l'eliminazione del museo.");
    }
  } catch (error) {
    console.error(error);
  }
}