let currentMuseumId = null;
let currentMuseumData = null;
let museumSections = [];
let workModalInstance = null;
let sectionModalInstance = null;
let roomModalInstance = null;
let deleteMuseumModalInstance = null;

// Cache globale per tenere in memoria i dati
let worksCache = {};
let roomsCache = {};

document.addEventListener("DOMContentLoaded", async () => {
  if (document.getElementById("workModal")) workModalInstance = new bootstrap.Modal(document.getElementById("workModal"));
  if (document.getElementById("sectionModal")) sectionModalInstance = new bootstrap.Modal(document.getElementById("sectionModal"));
  if (document.getElementById("roomModal")) roomModalInstance = new bootstrap.Modal(document.getElementById("roomModal"));
  if (document.getElementById("deleteMuseumModal")) deleteMuseumModalInstance = new bootstrap.Modal(document.getElementById("deleteMuseumModal"));
  if (document.getElementById("authorDataModal")) authorDataModalInstance = new bootstrap.Modal(document.getElementById("authorDataModal"));

  await fetchCurrentUser();

  const urlParams = new URLSearchParams(window.location.search);
  currentMuseumId = urlParams.get("id");

  if (!currentMuseumId) {
    window.location.href = "/my-museums";
    return;
  }

  await loadMuseumDetails();
});

async function loadMuseumDetails() {
  try {
    const res = await fetch(`${API_BASE_URL}/museums`);
    const museums = await res.json();
    currentMuseumData = museums.find((m) => m._id === currentMuseumId);

    if (!currentMuseumData) { alert("Museo non trovato."); return; }

    document.getElementById("museum-name").value = currentMuseumData.name || "";
    document.getElementById("museum-address").value = currentMuseumData.address || "";
    document.getElementById("museum-email").value = currentMuseumData.contact_email || "";
    document.getElementById("museum-phone").value = currentMuseumData.contact_phone || "";
    document.getElementById("museum-image").value = currentMuseumData.image || "";
    document.getElementById("museum-tags").value = (currentMuseumData.tags || []).join(", ");
    document.getElementById("editor-title").innerText = `Modifica: ${currentMuseumData.name}`;

    await loadSectionsAndWorks();
  } catch (error) {
    console.error("Errore caricamento:", error);
  }
}

// CARICAMENTO GERARCHICO: Sezioni -> Stanze -> Opere
async function loadSectionsAndWorks() {
  const container = document.getElementById("sectionsAccordion");
  container.innerHTML = "";
  worksCache = {};
  roomsCache = {};

  try {
    const res = await fetch(`${API_BASE_URL}/museums/${currentMuseumId}/sections`);
    museumSections = await res.json();

    if (museumSections.length === 0) {
      container.innerHTML = `<div class="text-center py-4 text-secondary">Nessuna sezione presente. Inizia creando una sezione!</div>`;
      return;
    }

    for (let index = 0; index < museumSections.length; index++) {
      const section = museumSections[index];
      
      // Carichiamo le opere della sezione
      const worksRes = await fetch(`${API_BASE_URL}/sections/${section._id}/works`);
      const works = await worksRes.json();
      works.forEach(w => worksCache[w._id] = w);

      // Le stanze sono subdocumenti già presenti in section.rooms!
      if (section.rooms) {
        section.rooms.forEach(r => roomsCache[r._id] = r);
      }

      container.innerHTML += renderSectionAccordionItem(section, works, index);
    }
  } catch (error) {
    console.error("Errore sezioni:", error);
    container.innerHTML = `<div class="alert alert-danger">Errore caricamento struttura.</div>`;
  }
}

function renderSectionAccordionItem(section, works, index) {
  const collapseId = `collapseSection${index}`;
  const headingId = `headingSection${index}`;
  const safeSectionName = (section.name || "").replace(/'/g, "\\'");
  const safeSectionImage = (section.image || "").replace(/'/g, "\\'");

  let roomsHtml = "";
  const rooms = section.rooms || [];
  
  if (rooms.length === 0) {
    roomsHtml = `<div class="alert alert-warning bg-transparent border-warning text-warning small p-2 mb-0">Nessuna stanza creata. Devi creare almeno una stanza per poter inserire le opere.</div>`;
  } else {
    rooms.forEach(room => {
      // Filtriamo le opere che appartengono a questa specifica stanza
      const roomWorks = works.filter(w => w.roomId === room._id);
      const safeRoomName = (room.name || "").replace(/'/g, "\\'");

      // HTML delle opere dentro la stanza
      let worksHtml = roomWorks.length === 0 ? `<p class="small text-secondary mb-0">Stanza vuota.</p>` : `
        <div class="row row-cols-1 row-cols-md-2 g-2 mt-2">
          ${roomWorks.map(w => `
            <div class="col">
              <div class="card bg-dark bg-opacity-50 border-secondary border-opacity-50 h-100 p-2 d-flex flex-row align-items-center">
                <img src="${w.image || '/img/fallback-work.jpg'}" class="rounded me-2" style="width: 40px; height: 40px; object-fit: cover;">
                <div class="flex-grow-1 text-truncate">
                  <h6 class="mb-0 text-white text-truncate small">${w.name}</h6>
                </div>
                <div>
                  <button class="btn btn-sm text-warning p-1 border-0" onclick="openWorkModal('${section._id}', '${room._id}', '${w._id}')"><i class="bi bi-pencil"></i></button>
                  <button class="btn btn-sm text-danger p-1 border-0" onclick="deleteWork('${section._id}', '${w._id}')"><i class="bi bi-trash"></i></button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>`;

      // HTML della singola Stanza
      roomsHtml += `
        <div class="card bg-transparent border border-secondary border-opacity-25 mb-3">
          <div class="card-header bg-dark bg-opacity-75 d-flex justify-content-between align-items-center py-2 border-bottom border-secondary border-opacity-25">
            <h6 class="mb-0 text-white"><i class="bi bi-door-open me-2 text-warning"></i>${room.name}</h6>
            <div>
              <button class="btn btn-sm btn-link text-info p-0 me-2" onclick="openWorkModal('${section._id}', '${room._id}')"><i class="bi bi-plus-circle me-1"></i>Aggiungi Opera</button>
              <button class="btn btn-sm btn-link text-secondary p-0 me-2" onclick="openRoomModal('${section._id}', '${room._id}', '${safeRoomName}')"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-sm btn-link text-danger p-0" onclick="deleteRoom('${section._id}', '${room._id}')"><i class="bi bi-trash"></i></button>
            </div>
          </div>
          <div class="card-body py-2">
            ${worksHtml}
          </div>
        </div>`;
    });
  }

  return `
    <div class="accordion-item custom-accordion-item mb-3 rounded border border-secondary border-opacity-25 overflow-hidden">
      <h2 class="accordion-header" id="${headingId}">
        <button class="accordion-button collapsed bg-transparent text-white" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}">
          <i class="bi bi-folder2-open me-2 text-info"></i> ${section.name}
          <span class="badge badge-tag ms-auto me-3">${rooms.length} stanze</span>
        </button>
      </h2>
      <div id="${collapseId}" class="accordion-collapse collapse" data-bs-parent="#sectionsAccordion">
        <div class="accordion-body border-top border-secondary border-opacity-25 bg-dark bg-opacity-50">
          <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary border-opacity-25">
            <div>
              <button class="btn btn-sm btn-outline-warning me-2" onclick="openSectionModal('${section._id}', '${safeSectionName}', '${safeSectionImage}')">
                <i class="bi bi-pencil"></i> Modifica Sezione
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick="deleteSection('${section._id}')">
                <i class="bi bi-trash"></i> Elimina Sezione
              </button>
            </div>
            <button class="btn btn-sm btn-info" onclick="openRoomModal('${section._id}')">
              <i class="bi bi-plus-lg me-1"></i> Aggiungi Stanza
            </button>
          </div>
          ${roomsHtml}
        </div>
      </div>
    </div>`;
}

// ------------------- GESTIONE SEZIONI (Invariata) -------------------
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

  if (!sectionName) { alert("Il nome è obbligatorio."); return; }

  try {
    let res;
    if (sectionId) {
      // 1. MODIFICA SEZIONE ESISTENTE
      res = await fetch(`${API_BASE_URL}/sections/${sectionId}`, {
        method: "PUT", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: sectionName, image: sectionImage, museumId: currentMuseumId })
      });
      
      if (res.ok) {
        sectionModalInstance.hide();
        // Aggiorniamo lo stato in memoria locale
        const secIndex = museumSections.findIndex(s => s._id === sectionId);
        if (secIndex !== -1) {
          museumSections[secIndex].name = sectionName;
          museumSections[secIndex].image = sectionImage;
        }
        // MODIFICA LIVE DEL DOM: Cambiamo solo il testo del bottone dell'accordion senza ricaricare nulla!
        const accordionButton = document.querySelector(`#headingSection${secIndex} .accordion-button`);
        if (accordionButton) {
          accordionButton.innerHTML = `<i class="bi bi-folder2-open me-2 text-info"></i> ${sectionName} <span class="badge badge-tag ms-auto me-3">${museumSections[secIndex].rooms?.length || 0} stanze</span>`;
        }
      }
    } else {
      // 2. CREAZIONE NUOVA SEZIONE
      res = await fetch(`${API_BASE_URL}/save-section`, {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rsection: { name: sectionName, image: sectionImage, rooms: [] }, museumId: currentMuseumId })
      });
      
      if (res.ok) {
        const newSectionId = await res.json();
        sectionModalInstance.hide();
        
        // Pushiamo la nuova sezione nello stato locale
        const newSectionObj = { _id: newSectionId, name: sectionName, image: sectionImage, rooms: [] };
        museumSections.push(newSectionObj);
        
        // Appendiamo l'HTML della nuova sezione in fondo all'accordion esistente
        const container = document.getElementById("sectionsAccordion");
        // Se c'era il messaggio "Nessuna sezione", lo puliamo
        if (container.innerHTML.includes("Nessuna sezione presente")) container.innerHTML = "";
        
        const newIndex = museumSections.length - 1;
        container.insertAdjacentHTML('beforeend', renderSectionAccordionItem(newSectionObj, [], newIndex));
      }
    }
  } catch (error) { 
    console.error("Errore salvataggio sezione:", error); 
  }
}

async function deleteSection(sectionId) {
  if (!confirm("Attenzione: Eliminerai la sezione, tutte le stanze e le opere! Sei sicuro?")) return;
  try {
    const res = await fetch(`${API_BASE_URL}/sections/${sectionId}`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ museumId: currentMuseumId })
    });
    if (res.ok) loadSectionsAndWorks();
  } catch (error) { console.error(error); }
}

// ------------------- NUOVO: GESTIONE STANZE -------------------
function openRoomModal(sectionId, roomId = null, currentName = "") {
  document.getElementById("room-section-id").value = sectionId;
  document.getElementById("room-id-input").value = roomId || "";
  document.getElementById("room-name-input").value = currentName;
  document.getElementById("roomModalLabel").innerText = roomId ? "Rinomina Stanza" : "Nuova Stanza";
  roomModalInstance.show();
}

async function saveRoomFromModal() {
  const sectionId = document.getElementById("room-section-id").value;
  const roomId = document.getElementById("room-id-input").value;
  const roomName = document.getElementById("room-name-input").value.trim();

  if (!roomName) { alert("Il nome della stanza è obbligatorio."); return; }

  try {
    let res;
    if (roomId) {
      // MODIFICA STANZA (Rinomina)
      res = await fetch(`${API_BASE_URL}/sections/${sectionId}/rooms/${roomId}`, {
        method: "PUT", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomData: { name: roomName }, museumId: currentMuseumId })
      });
      
      if (res.ok) {
        roomModalInstance.hide();
        // Aggiorniamo la cache locale
        if (roomsCache[roomId]) roomsCache[roomId].name = roomName;
        
        // Aggiorniamo live l'intestazione H6 della stanza nel DOM
        const targetTitle = document.querySelector(`[onclick*="${roomId}"][onclick*="deleteRoom"]`);
        if (targetTitle) {
          const headerContainer = targetTitle.closest('.card-header');
          if (headerContainer) {
            headerContainer.querySelector('h6').innerHTML = `<i class="bi bi-door-open me-2 text-warning"></i>${roomName}`;
          }
        }
      }
    } else {
      // CREAZIONE STANZA
      res = await fetch(`${API_BASE_URL}/sections/${sectionId}/rooms`, {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomData: { name: roomName, shape: { type: 'polygon', points: '' } }, museumId: currentMuseumId })
      });
      
      if (res.ok) {
        const savedRoom = await res.json();
        roomModalInstance.hide();
        
        // Inseriamo la nuova stanza nella cache
        roomsCache[savedRoom._id] = savedRoom;
        
        // Troviamo l'indice della sezione nello stato per poter fare il rendering corretto
        const secIndex = museumSections.findIndex(s => s._id === sectionId);
        if (secIndex !== -1) {
          if (!museumSections[secIndex].rooms) museumSections[secIndex].rooms = [];
          museumSections[secIndex].rooms.push(savedRoom);
          
          // Invece di ricostruire tutto l'accordion, ricarichiamo solo le sezioni e le opere di QUELLA specifica sezione
          const worksRes = await fetch(`${API_BASE_URL}/sections/${sectionId}/works`);
          const works = await worksRes.json();
          
          const collapseBody = document.querySelector(`#collapseSection${secIndex} .accordion-body`);
          if (collapseBody) {
            // Ricostruiamo solo il contenuto interno della sezione lasciando l'accordion aperto!
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = renderSectionAccordionItem(museumSections[secIndex], works, secIndex);
            const newBodyContent = tempDiv.querySelector('.accordion-body').innerHTML;
            collapseBody.innerHTML = newBodyContent;
          }
        }
      }
    }
  } catch (error) { 
    console.error("Errore salvataggio stanza:", error); 
  }
}

async function deleteRoom(sectionId, roomId) {
  if (!confirm("Attenzione: Eliminando la stanza verranno eliminate (o perse) le opere contenute in essa. Procedere?")) return;
  try {
    const res = await fetch(`${API_BASE_URL}/sections/${sectionId}/rooms/${roomId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" }, // Aggiunto header per il body
      // Inviamo il museumId anche nella DELETE
      body: JSON.stringify({ museumId: currentMuseumId }) 
    });
    
    if (res.ok) loadSectionsAndWorks();
  } catch (error) { console.error(error); }
}

// ------------------- GESTIONE OPERE (Aggiornata per includere RoomId) -------------------
async function openWorkModal(sectionId, roomId, workId = null) {
  document.getElementById("work-section-id").value = sectionId;
  document.getElementById("work-room-id").value = roomId;
  document.getElementById("work-id").value = workId || "";

  if (workId && worksCache[workId]) {
    const w = worksCache[workId];
    document.getElementById("workModalLabel").innerText = "Modifica Opera";
    document.getElementById("save-work-btn").innerText = "Aggiorna Opera";
    document.getElementById("work-name").value = w.name || "";
    document.getElementById("work-author-id").value = w.author?._id || w.author || "";
    document.getElementById("work-author-search").value = w.author?.name || "Autore Selezionato";
    document.getElementById("work-technique").value = w.technique || "";
    document.getElementById("work-year").value = w.year || "";
    document.getElementById("work-style").value = w.style || "";
    document.getElementById("work-image").value = w.image || "";
    
    let desc = "";
    if (w.description && w.description.simple && w.description.simple.medium) {
      desc = w.description.simple.medium;
    }
    document.getElementById("work-description").value = desc;
  } else {
    document.getElementById("workModalLabel").innerText = "Nuova Opera";
    document.getElementById("save-work-btn").innerText = "Crea Opera";
    document.getElementById("work-form").reset();
    document.getElementById("work-author-id").value = "";
  }
  workModalInstance.show();
}

async function saveWorkFromModal() {
  const sectionId = document.getElementById("work-section-id").value;
  const roomId = document.getElementById("work-room-id").value;
  const workId = document.getElementById("work-id").value;
  
  const workData = {
    name: document.getElementById("work-name").value.trim(),
    author: document.getElementById("work-author-id").value.trim(),
    technique: document.getElementById("work-technique").value.trim(),
    year: document.getElementById("work-year").value.trim(),
    // style: document.getElementById("work-style").value.trim(),
    image: document.getElementById("work-image").value.trim(),
    description: {
      simple: {
        medium: document.getElementById("work-description").value.trim()
      }
    },
    roomId: roomId
  };

  if (!workData.name || !workData.author || !workData.technique) { 
    alert("Titolo, Autore (da selezionare dalla tendina) e Tecnica sono campi obbligatori!"); 
    return; 
  }

  try {
    let res;
    if (workId) {
      res = await fetch(`${API_BASE_URL}/works/${workId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...workData, museumId: currentMuseumId })
      });
    } else {
      res = await fetch(`${API_BASE_URL}/add-work`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work: workData, sectionId: sectionId, museumId: currentMuseumId })
      });
    }

    if (res.ok) {
      workModalInstance.hide();
      
      // Ricarichiamo SOLTANTO le opere di questa sezione specifica per aggiornare il DOM localmente
      const worksRes = await fetch(`${API_BASE_URL}/sections/${sectionId}/works`);
      const works = await worksRes.json();
      works.forEach(w => worksCache[w._id] = w);
      
      const secIndex = museumSections.findIndex(s => s._id === sectionId);
      if (secIndex !== -1) {
        const collapseBody = document.querySelector(`#collapseSection${secIndex} .accordion-body`);
        if (collapseBody) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = renderSectionAccordionItem(museumSections[secIndex], works, secIndex);
          collapseBody.innerHTML = tempDiv.querySelector('.accordion-body').innerHTML;
        }
      }
    } else {
      const errorData = await res.json();
      alert("Errore salvataggio: " + (errorData.error || "Riprova."));
    }
  } catch (error) { console.error(error); }
}

async function deleteWork(sectionId, workId) {
  if (!confirm("Sei sicuro di voler eliminare questa opera?")) return;
  try {
    const res = await fetch(`${API_BASE_URL}/works/${workId}`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId: sectionId, museumId: currentMuseumId })
    });
    if (res.ok) loadSectionsAndWorks();
  } catch (error) { console.error(error); }
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

  // Generiamo la stringa formattata (es. "delete luovre" o "delete musei-vaticani")
  const targetName = currentMuseumData.name.toLowerCase().replace(/\s+/g, '-');
  const targetString = `delete ${targetName}`;

  const targetLabel = document.getElementById("delete-target-text");
  const inputField = document.getElementById("delete-confirm-input");
  const deleteBtn = document.getElementById("confirm-delete-museum-btn");

  if (targetLabel) targetLabel.innerText = targetString;
  if (inputField) {
    inputField.value = "";
    inputField.dataset.target = targetString;
    // Ascoltiamo l'evento di digitazione in tempo reale
    inputField.addEventListener("input", checkDeleteConfirmationText);
  }
  if (deleteBtn) deleteBtn.disabled = true;

  deleteMuseumModalInstance.show();
}

// Controlla dinamicamente se l'utente ha scritto la stringa esatta
function checkDeleteConfirmationText(e) {
  const inputVal = e.target.value.trim();
  const targetVal = e.target.dataset.target;
  const deleteBtn = document.getElementById("confirm-delete-museum-btn");

  if (deleteBtn) {
    // Abilita il bottone SOLO se la stringa combacia al millimetro
    deleteBtn.disabled = (inputVal !== targetVal);
  }
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
      window.location.href = "/my-museums"; 
    } else {
      alert("Errore durante l'eliminazione del museo.");
    }
  } catch (error) {
    console.error(error);
  }
}

// ==========================================
// MODULO RICERCA AUTORI (Fuzzy Search & Debounce)
// ==========================================

let authorSearchTimeout = null;

// Ascoltatore per la barra di ricerca dell'autore
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("work-author-search");
  
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.trim();
      
      // Se l'utente cancella tutto, nascondiamo la tendina e svuotiamo le card
      if (query.length === 0) {
        hideAuthorDropdown();
        document.getElementById("author-cards-container").style.display = "none";
        document.getElementById("work-author-id").value = "";
        return;
      }

      // DEBOUNCING: Cancella il timer precedente se l'utente sta ancora digitando
      clearTimeout(authorSearchTimeout);
      
      // Imposta un nuovo timer di 300 millisecondi
      authorSearchTimeout = setTimeout(() => {
        fetchAuthors(query);
      }, 300);
    });
  }
});

// Chiamata API al Backend
async function fetchAuthors(query) {
  const resultsContainer = document.getElementById("author-search-results");
  
  try {
    const res = await fetch(`/api/authors/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error("Errore nella ricerca");
    
    const authors = await res.json();
    renderAuthorDropdown(authors, query);
  } catch (error) {
    console.error(error);
  }
}

// Stampa i risultati nella tendina
function renderAuthorDropdown(authors, query) {
  const resultsContainer = document.getElementById("author-search-results");
  resultsContainer.innerHTML = "";
  
  if (authors.length === 0) {
    resultsContainer.innerHTML = `
      <li class="px-3 py-2 small text-secondary">Nessun autore trovato.</li>
      <li><hr class="dropdown-divider border-secondary border-opacity-25"></li>
      <li><button type="button" class="dropdown-item text-info small" onclick="createNewAuthor('${query.replace(/'/g, "\\'")}')"><i class="bi bi-plus-circle me-1"></i> Crea nuovo autore: "${query}"</button></li>
    `;
  } else {
    authors.forEach(author => {
      const safeId = author._id;
      const safeName = author.name.replace(/'/g, "\\'");
      resultsContainer.innerHTML += `
        <li><button type="button" class="dropdown-item text-white small" onclick="selectAuthor('${safeId}', '${safeName}')">${author.name}</button></li>
      `;
    });
  }
  
  resultsContainer.style.display = "block";
}

function hideAuthorDropdown() {
  document.getElementById("author-search-results").style.display = "none";
}

// Quando il curatore clicca su un autore dalla tendina
async function selectAuthor(authorId, authorName) {
  document.getElementById("work-author-search").value = authorName;
  document.getElementById("work-author-id").value = authorId;
  hideAuthorDropdown();
  
  const container = document.getElementById("author-cards-container");
  const slider = document.getElementById("author-slider");
  container.style.display = "block";
  slider.innerHTML = `<div class="spinner-border spinner-border-sm text-info m-3"></div>`;
  
  try {
    const res = await fetch(`/api/authors/${authorId}`);
    if (!res.ok) throw new Error("Errore recupero dati autore");
    const author = await res.json();
    
    slider.innerHTML = "";
    
    // Generiamo una card per ogni voce nell'array 'data'
    if (author.data && author.data.length > 0) {
      author.data.forEach((d, index) => {
        // Estraiamo il nome del museo che ha scritto questa biografia (se popolato)
        const museumName = d.museumId && d.museumId[0] ? d.museumId[0].name : "Altro Museo";
        
        slider.innerHTML += `
          <div class="card bg-dark bg-opacity-50 border-secondary border-opacity-50 flex-shrink-0" style="width: 280px; scroll-snap-align: start;">
            <div class="card-body p-3">
              <span class="badge bg-secondary mb-2 bg-opacity-50 border border-secondary text-light" style="font-size: 0.65rem;">
                <i class="bi bi-bank me-1"></i> ${museumName}
              </span>
              <p class="small mb-1 text-info fw-bold">${d.bd || 'Date non specificate'}</p>
              <p class="small mb-2 text-white-50 text-truncate" title="${d.studies || ''}"><i class="bi bi-mortarboard me-1"></i>${d.studies || 'Formazione non specificata'}</p>
              <p class="small text-white mb-0" style="display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden;">
                ${d.bio || 'Nessuna biografia inserita.'}
              </p>
            </div>
          </div>
        `;
      });
    } else {
      slider.innerHTML = `<p class="small text-secondary m-2">Nessuna biografia presente.</p>`;
    }
  } catch (error) {
    console.error(error);
    slider.innerHTML = `<p class="small text-danger m-2">Impossibile caricare le biografie.</p>`;
  }
}

// ==========================================
// CREAZIONE E SALVATAGGIO AUTORE
// ==========================================

// Innescata dal bottone "Crea nuovo autore" nella tendina
function createNewAuthor(authorName) {
  hideAuthorDropdown();
  document.getElementById("work-author-search").value = authorName;
  document.getElementById("work-author-id").value = ""; // ID vuoto = nuovo autore
  
  // Impostiamo il campo hidden per ricordarci il nome
  document.getElementById("new-author-name-input").value = authorName;
  
  document.getElementById("authorDataModalLabel").innerText = `Crea Autore: ${authorName}`;
  document.getElementById("author-data-form").reset();
  authorDataModalInstance.show();
}

// Innescata dal bottone "Scrivi la tua" sopra lo slider
function openNewAuthorDataModal() {
  document.getElementById("new-author-name-input").value = ""; // Nome vuoto = autore esistente
  document.getElementById("authorDataModalLabel").innerText = "Aggiungi la tua Biografia";
  document.getElementById("author-data-form").reset();
  authorDataModalInstance.show();
}

// Salva i dati (capisce da sola se fare POST o PUT)
async function saveAuthorData() {
  const newName = document.getElementById("new-author-name-input").value;
  const existingAuthorId = document.getElementById("work-author-id").value;
  
  const payloadData = {
    museumId: currentMuseumId,
    bd: document.getElementById("author-bd").value.trim(),
    studies: document.getElementById("author-studies").value.trim(),
    bio: document.getElementById("author-bio").value.trim()
  };

  try {
    let res;
    if (newName && !existingAuthorId) {
      // 1. CREA NUOVO AUTORE (POST)
      res = await fetch('/api/authors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, data: payloadData })
      });
      if (!res.ok) throw new Error("Errore durante la creazione dell'autore");
      
      const savedAuthor = await res.json();
      // Selezioniamo automaticamente il nuovo autore
      selectAuthor(savedAuthor._id, savedAuthor.name);
      
    } else if (existingAuthorId) {
      // 2. AGGIUNGI DATI AD AUTORE ESISTENTE (PUT)
      res = await fetch(`/api/authors/${existingAuthorId}/data`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadData)
      });
      if (!res.ok) throw new Error("Errore durante l'aggiornamento dell'autore");
      
      const updatedAuthor = await res.json();
      // Ricarichiamo le card
      selectAuthor(updatedAuthor._id, updatedAuthor.name);
    }
    
    authorDataModalInstance.hide();
  } catch (error) {
    alert(error.message);
    console.error(error);
  }
}