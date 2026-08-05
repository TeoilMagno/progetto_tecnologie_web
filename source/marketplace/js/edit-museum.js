let currentMuseumId = null;
let currentMuseumData = null;
let museumSections = [];
let workModalInstance = null;

document.addEventListener("DOMContentLoaded", async () => {
  const modalEl = document.getElementById("workModal");
  if (modalEl) {
    workModalInstance = new bootstrap.Modal(modalEl);
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

// carica le informazioni del museo e le sue sezioni
async function loadMuseumDetails() {
  try {
    const res = await fetch(`${API_BASE_URL}/museums`);
    const museums = await res.json();
    currentMuseumData = museums.find((m) => m._id === currentMuseumId);

    if (!currentMuseumData) {
      alert("Museo non trovato.");
      return;
    }

    // popola il form generale
    document.getElementById("museum-name").value = currentMuseumData.name || "";
    document.getElementById("museum-address").value = currentMuseumData.address || "";
    document.getElementById("museum-email").value = currentMuseumData.contact_email || "";
    document.getElementById("museum-phone").value = currentMuseumData.contact_phone || "";
    document.getElementById("museum-image").value = currentMuseumData.image || "";
    document.getElementById("museum-tags").value = (currentMuseumData.tags || []).join(", ");
    document.getElementById("editor-title").innerText = `Modifica: ${currentMuseumData.name}`;

    // carica Sezioni
    await loadSectionsAndWorks();
  } catch (error) {
    console.error("Errore caricamento museo:", error);
    alert("Errore nel caricamento del museo.");
  }
}

// carica sezioni ed opere
async function loadSectionsAndWorks() {
  const container = document.getElementById("sectionsAccordion");
  container.innerHTML = "";

  try {
    const res = await fetch(`${API_BASE_URL}/museums/${currentMuseumId}/sections`);
    museumSections = await res.json();

    if (museumSections.length === 0) {
      container.innerHTML = `<div class="text-center py-4 text-secondary">Nessuna sezione presente. Clicca su "Aggiungi Nuova Sezione" per iniziare.</div>`;
      return;
    }

    for (let index = 0; index < museumSections.length; index++) {
      const section = museumSections[index];
      
      // Fetch opere della sezione
      const worksRes = await fetch(`${API_BASE_URL}/sections/${section._id}/works`);
      const works = await worksRes.json();

      container.innerHTML += renderSectionAccordionItem(section, works, index);
    }
  } catch (error) {
    console.error("Errore sezioni:", error);
    container.innerHTML = `<div class="alert alert-danger">Errore nel caricamento delle sezioni.</div>`;
  }
}

// renderizza il singolo elemento
function renderSectionAccordionItem(section, works, index) {
  const collapseId = `collapseSection${index}`;
  const headingId = `headingSection${index}`;

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
              <button class="btn btn-sm btn-outline-warning border-0 me-1" onclick="openWorkModal('${section._id}', '${w._id}')">
                <i class="bi bi-pencil"></i>
              </button>
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
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="small text-secondary">Opere della sezione</span>
            <button class="btn btn-sm btn-gradient" onclick="openWorkModal('${section._id}')">
              <i class="bi bi-plus-lg me-1"></i> Aggiungi Opera
            </button>
          </div>
          ${worksHtml}
        </div>
      </div>
    </div>`;
}

// aggiungi nuova sezione al museo
async function addNewSectionPrompt() {
  const sectionName = prompt("Inserisci il nome della nuova sezione (es. 'Pittura del '500'):");
  if (!sectionName || !sectionName.trim()) return;

  try {
    const res = await fetch(`${API_BASE_URL}/save-section`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rsection: { title: sectionName.trim(), works: [] },
        museumId: currentMuseumId
      })
    });

    if (res.ok) {
      alert("Sezione creata!");
      loadSectionsAndWorks();
    }
  } catch (e) {
    alert("Errore nella creazione della sezione.");
  }
}

// creare/modificare un'opera
async function openWorkModal(sectionId, workId = null) {
  document.getElementById("work-section-id").value = sectionId;
  document.getElementById("work-id").value = workId || "";

  if (workId) {
    // Modalità Modifica: carica i dati esistenti dell'opera
    document.getElementById("workModalLabel").innerText = "Modifica Opera";
  } else {
    // Modalità Creazione
    document.getElementById("workModalLabel").innerText = "Nuova Opera";
    document.getElementById("work-form").reset();
    document.getElementById("work-section-id").value = sectionId;
  }

  workModalInstance.show();
}

// salvataggio dell'opera
async function saveWorkFromModal() {
  const sectionId = document.getElementById("work-section-id").value;
  const workData = {
    name: document.getElementById("work-name").value.trim(),
    author: document.getElementById("work-author").value.trim(),
    year: document.getElementById("work-year").value.trim(),
    style: document.getElementById("work-style").value.trim(),
    image: document.getElementById("work-image").value.trim(),
    description: [{ description: document.getElementById("work-description").value.trim() }],
    museumId: currentMuseumId
  };

  if (!workData.name) {
    alert("Il titolo dell'opera è obbligatorio!");
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/add-work`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ work: workData, sectionId: sectionId, museumId: currentMuseumId })
    });

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

// salva modifiche dati generali museo
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
      window.location.href = `#museum/${currentMuseumId}`;
    } else {
      alert("Errore nel salvataggio delle modifiche.");
    }
  } catch (e) {
    console.error(e);
  }
}