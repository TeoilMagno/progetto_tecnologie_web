let currentMuseumId = null;
let currentMuseumData = null;
let museumSections = [];
let workModalInstance = null;
let roomModalInstance = null;
let sectionModalInstance = null;
let deleteMuseumModalInstance = null;
let currentFetchedAuthor = null;
let currentFetchedStyle = null;

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

  buildScheduleForm();

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
    document.getElementById("museum-price").value = currentMuseumData.ticketPrice || "";

    // Spunta le checkbox dei servizi
    if (currentMuseumData.services) {
      currentMuseumData.services.forEach(s => {
        const cb = document.querySelector(`.srv-cb[value="${s}"]`);
        if (cb) cb.checked = true;
      });
    }

    // Spunta le checkbox di accessibilità
    if (currentMuseumData.accessibility) {
      currentMuseumData.accessibility.forEach(a => {
        const cb = document.querySelector(`.acc-cb[value="${a}"]`);
        if (cb) cb.checked = true;
      });
    }

    // Ricostruisci il calendario orari
    if (currentMuseumData.schedule) {
      currentMuseumData.schedule.forEach(s => {
        // Se il giorno è presente in questo array, significa che è aperto!
        const row = document.querySelector(`.schedule-row[data-day="${s.day}"]`);
        if (row) {
          const toggle = row.querySelector('.sch-toggle');
          const input = row.querySelector('.sch-hours');
          
          toggle.checked = true;
          input.value = s.hours || "";
          input.disabled = false;
        }
      });
    }
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
    roomsHtml = `
      <div class="alert bg-dark border border-warning border-opacity-50 text-warning small p-3 mb-0 rounded-3">
        <i class="bi bi-exclamation-triangle me-2"></i>Nessuna stanza creata. Crea una stanza per poter inserire le opere.
      </div>`;
  } else {
    rooms.forEach(room => {
      // Filtriamo le opere che appartengono a questa specifica stanza
      const roomWorks = works.filter(w => w.roomId === room._id);
      const safeRoomName = (room.name || "").replace(/'/g, "\\'");

      // HTML delle opere dentro la stanza
      let worksHtml = roomWorks.length === 0 ? `<p class="small text-white-50 mb-0 fst-italic">Nessuna opera in questa stanza.</p>` : `
        <div class="row row-cols-1 row-cols-md-2 g-3 mt-1">
          ${roomWorks.map(w => `
            <div class="col">
              <div class="card bg-transparent border border-secondary border-opacity-25 h-100 p-2 d-flex flex-row align-items-center rounded-3" style="transition: all 0.2s ease;">
                <img src="${w.image || '/img/fallback-work.jpg'}" class="rounded me-3 shadow-sm" style="width: 45px; height: 45px; object-fit: cover; border: 1px solid rgba(255,255,255,0.1);">
                <div class="flex-grow-1 text-truncate">
                  <h6 class="mb-0 text-white text-truncate small fw-bold">${w.name}</h6>
                  <small class="text-white-50" style="font-size: 0.7rem;">${w.author?.name || w.author || 'Autore Sconosciuto'}</small>
                </div>
                <div class="d-flex gap-1 ms-2">
                  <button class="btn btn-sm btn-glass text-info p-1 px-2 border-0" title="Gestisci Testi" onclick="openTextManager('${w._id}')"><i class="bi bi-card-text"></i></button>
                  <button class="btn btn-sm btn-glass text-white p-1 px-2 border-0" title="Modifica Opera" onclick="openWorkModal('${section._id}', '${room._id}', '${w._id}')"><i class="bi bi-pencil"></i></button>
                  <button class="btn btn-sm btn-glass text-danger p-1 px-2 border-0" title="Elimina Opera" onclick="deleteWork('${section._id}', '${w._id}')"><i class="bi bi-trash"></i></button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>`;

      // HTML della singola Stanza (in stile card scura)
      roomsHtml += `
        <div class="card custom-card mb-4 border-secondary border-opacity-25 bg-dark bg-opacity-25">
          <div class="card-header bg-transparent d-flex justify-content-between align-items-center py-3 border-bottom border-secondary border-opacity-10">
            <h6 class="mb-0 text-info fw-bold"><i class="bi bi-door-open me-2"></i>${room.name}</h6>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-info rounded-pill px-3 py-1" onclick="openWorkModal('${section._id}', '${room._id}')"><i class="bi bi-plus-lg me-1"></i>Opera</button>
              <button class="btn btn-sm btn-glass text-white px-2 py-1" title="Modifica Stanza" onclick="openRoomModal('${section._id}', '${room._id}', '${safeRoomName}')"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-sm btn-glass text-danger px-2 py-1" title="Elimina Stanza" onclick="deleteRoom('${section._id}', '${room._id}')"><i class="bi bi-trash"></i></button>
            </div>
          </div>
          <div class="card-body">
            ${worksHtml}
          </div>
        </div>`;
    });
  }

  return `
    <div class="accordion-item bg-transparent mb-3 border-0">
      <h2 class="accordion-header" id="${headingId}">
        <button class="accordion-button collapsed custom-card text-white py-3 px-4 shadow-sm" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" style="border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); box-shadow: none;">
          <i class="bi bi-grid-1x2-fill me-3 text-info fs-5"></i> 
          <span class="fw-bold fs-6">${section.name}</span>
          <span class="badge bg-info bg-opacity-25 text-info border border-info ms-auto me-3 rounded-pill px-3 py-2">${rooms.length} Stanze</span>
        </button>
      </h2>
      
      <div id="${collapseId}" class="accordion-collapse collapse mt-2" data-bs-parent="#sectionsAccordion">
        <div class="accordion-body p-4 custom-card border-secondary border-opacity-25 bg-dark bg-opacity-50" style="border-radius: 12px;">
          
          <!-- Header Azioni Sezione -->
          <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom border-secondary border-opacity-25">
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-glass text-white px-3" onclick="openSectionModal('${section._id}', '${safeSectionName}', '${safeSectionImage}')">
                <i class="bi bi-pencil me-1"></i> Modifica Sezione
              </button>
              <button class="btn btn-sm btn-glass text-danger px-3" onclick="deleteSection('${section._id}')">
                <i class="bi bi-trash me-1"></i> Elimina
              </button>
            </div>
            <button class="btn btn-sm btn-gradient px-4 rounded-pill shadow-sm" onclick="openRoomModal('${section._id}')">
              <i class="bi bi-plus-lg me-1"></i> Nuova Stanza
            </button>
          </div>
          
          <!-- Contenuto Stanze -->
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
  const isConfirmed = await window.showCustomConfirm(
    "Conferma eliminazione",
    "Attenzione: Eliminerai la sezione, tutte le stanze e le opere! Sei sicuro?"
  );
  if(!isConfirmed) return;

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
  const isConfirmed = await window.showCustomConfirm(
    "Eliminazione stanza",
    "Attenzione: Eliminando la stanza verranno eliminate (o perse) le opere contenute in essa. Sei sicuro?"
  );
  if(!isConfirmed) return;

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
    
    // Recupero Dati Autore
    const authorId = w.author?._id || w.author || "";
    const authorName = w.author?.name || (authorId ? "Autore Selezionato" : ""); 
    document.getElementById("work-author-id").value = authorId;
    document.getElementById("work-author-search").value = authorName; 
    
    // Recupero Dati Stile
    const styleId = w.style?._id || w.style || "";
    const styleName = w.style?.name || (styleId ? "Stile Selezionato" : ""); 
    document.getElementById("work-style-id").value = styleId;
    document.getElementById("work-style-search").value = styleName; 
    
    document.getElementById("work-technique").value = w.technique || "";
    document.getElementById("work-year").value = w.year || "";
    document.getElementById("work-image").value = w.image || "";
    
    let desc = "";
    if (w.description && w.description.simple && w.description.simple.medium) {
      desc = w.description.simple.medium;
    }
    document.getElementById("work-description").value = desc;

    // --- LA MAGIA: Inneschiamo le card visive! ---
    if (authorId) selectAuthor(authorId, authorName);
    else document.getElementById("author-cards-container").style.display = "none";

    if (styleId) selectStyle(styleId, styleName);
    else document.getElementById("style-cards-container").style.display = "none";
    // ---------------------------------------------

  } else {
    document.getElementById("workModalLabel").innerText = "Nuova Opera";
    document.getElementById("save-work-btn").innerText = "Crea Opera";
    document.getElementById("work-form").reset();
    
    // Pulizia campi nascosti
    document.getElementById("work-author-id").value = "";
    document.getElementById("work-style-id").value = "";
    document.getElementById("work-author-data-id").value = "";
    document.getElementById("work-style-data-id").value = "";
    
    // Nascondiamo gli slider delle card se l'opera è nuova
    document.getElementById("author-cards-container").style.display = "none";
    document.getElementById("style-cards-container").style.display = "none";
  }
  
  workModalInstance.show();
}

async function saveWorkFromModal() {
  const sectionId = document.getElementById("work-section-id").value;
  const roomId = document.getElementById("work-room-id").value;
  const workId = document.getElementById("work-id").value;
  const workDesc = document.getElementById("work-description").value.trim();
  
  const workData = {
    name: document.getElementById("work-name").value.trim(),
    author: document.getElementById("work-author-id").value.trim(),
    authorName: document.getElementById("work-author-search").value.trim(), // NUOVO!
    technique: document.getElementById("work-technique").value.trim(),
    year: document.getElementById("work-year").value.trim(),
    style: document.getElementById("work-style-id").value.trim() || undefined,
    styleName: document.getElementById("work-style-search").value.trim() || undefined, // NUOVO!
    image: document.getElementById("work-image").value.trim(),
    roomId: roomId
  };
  
  if (!workData.name || !workData.author || !workData.technique) { 
    alert("Titolo, Autore (da selezionare dalla tendina) e Tecnica sono campi obbligatori!"); 
    return; 
  }

  try {
    const authorId = workData.author;
    const authorDataId = document.getElementById("work-author-data-id").value;
    
    // Se l'utente ha selezionato un autore e una specifica card, eseguiamo l'adozione al volo
    if (authorId && authorDataId) {
      await fetch(`${API_BASE_URL}/authors/${authorId}/data/${authorDataId}/adopt`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ museumId: currentMuseumId })
      });
    }

    const styleId = workData.style; // (Preso dall'hidden input)
    const styleDataId = document.getElementById("work-style-data-id").value;
    
    if (styleId && styleDataId) {
      await fetch(`${API_BASE_URL}/styles/${styleId}/data/${styleDataId}/adopt`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ museumId: currentMuseumId })
      });
    }

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
      // Estraiamo la risposta del server (che contiene i dati salvati dal DB)
      const responseData = await res.json();
      
      // 2. Troviamo l'ID finale: 
      // Se avevamo workId usiamo quello (modifica). Se non lo avevamo, lo peschiamo dalla risposta (nuova creazione).
      const finalWorkId = workId || responseData.work?._id;

      // 3. ORA lanciamo l'IA in background usando l'ID corretto e sicuro
      if (!workId) {
        console.log(`Nuova opera salvata con ID: ${finalWorkId}. Inizio generazione IA in background...`);
        fetch(`${API_BASE_URL}/ai/generate-work-desc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workId: finalWorkId, 
            workName: workData.name,
            userDescription: workDesc
          })
        });
      }

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
  const isConfirmed = await window.showCustomConfirm(
    "Eliminazione opera",
    "Sei sicuro di voler eliminare questa opera?"
  );
  if(!isConfirmed) return;

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
  const updatedMuseum = getMuseumFormData();

  try {
    const res = await fetch(`${API_BASE_URL}/museums/${currentMuseumId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedMuseum)
    });

    if (res.ok) {
      alert("Museo aggiornato con successo!");
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
  const deleteBtn = document.getElementById("confirm-delete-museum-btn");
  if (deleteBtn) {
    deleteBtn.innerText = "Controllo in corso...";
    deleteBtn.disabled = true;
  }
  
  try {
    const adoptionsRes = await fetch(`${API_BASE_URL}/my-adoptions`);
    if (adoptionsRes.ok) {
      const allAdoptions = await adoptionsRes.json();
      
      // Filtriamo le adozioni ATTIVE in cui questo museo è il DESTINATARIO (ha ricevuto l'opera)
      const activeImports = allAdoptions.filter(a => 
        a.status === 'active' && 
        (a.toMuseumId?._id === currentMuseumId || a.toMuseumId === currentMuseumId)
      );

      if (activeImports.length > 0) {
        const isConfirmed = await window.showCustomConfirm(
          "Eliminazione museo",
          "Attenzione! Hai ${activeImports.length} opere in prestito da altri musei.\n\nVuoi restituirle tutte automaticamente prima di eliminare il museo? (Se annulli, l'eliminazione verrà interrotta)."
        );
        if(!isConfirmed) return;

        if (!wantsToReturn) {
          deleteMuseumModalInstance.hide();
          return; // Interrompiamo tutto
        }

        // Restituiamo le opere una per una
        for (let ad of activeImports) {
          await fetch(`${API_BASE_URL}/adoptions/${ad._id}/complete`, { 
            method: "PUT",
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    }

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
    currentFetchedAuthor = author;

    document.getElementById("work-author-search").value = author.name;
    slider.innerHTML = "";
    
    // Cerchiamo se il nostro museo ha già una descrizione pre-selezionata
    let preselectedDataId = "";
    if (author.data && author.data.length > 0) {
      
      // 1. ORDINAMENTO DECRESCENTE per popolarità (numero di adozioni)
      author.data.sort((a, b) => {
        const countA = a.museumId ? a.museumId.length : 0;
        const countB = b.museumId ? b.museumId.length : 0;
        return countB - countA;
      });

      author.data.forEach(d => {
        if (d.museumId && d.museumId.some(m => (m._id || m).toString() === currentMuseumId)) {
          preselectedDataId = d._id;
        }
      });

      // Impostiamo il campo nascosto con l'ID della descrizione già in uso (se esiste)
      document.getElementById("work-author-data-id").value = preselectedDataId;

      author.data.forEach((d, index) => {
        const adoptionCount = d.museumId ? d.museumId.length : 0;
        const museumName = d.museumId && adoptionCount > 0 && d.museumId[0].name ? d.museumId[0].name : "Altro Museo";
        const isSelected = preselectedDataId === d._id;
        
        // La prima card in lista si prende il badge "Popolare" se è usata da almeno 2 musei
        const isPopular = index === 0 && adoptionCount > 1; 
        const popularBadge = isPopular ? `<span class="badge bg-danger bg-opacity-25 border border-danger text-danger"><i class="bi bi-fire"></i> Più scelto</span>` : "";
        const extraCountText = adoptionCount > 1 ? ` (+${adoptionCount - 1})` : "";

        // Classi dinamiche per l'highlight
        const borderClass = isSelected ? "border-success bg-success bg-opacity-25" : "border-secondary bg-dark bg-opacity-50";
        const checkIcon = isSelected ? `<i class="bi bi-check-circle-fill text-success position-absolute top-0 end-0 m-2 fs-5 author-check-icon"></i>` : "";

        slider.innerHTML += `
          <div class="card ${borderClass} author-card-item flex-shrink-0 position-relative" 
               style="width: 280px; scroll-snap-align: start; cursor: pointer; transition: all 0.2s;" 
               id="author-card-${d._id}"
               onclick="highlightAuthorCard('${d._id}')">
            ${checkIcon}
            <div class="card-body p-3 d-flex flex-column">
              <div class="d-flex gap-1 mb-2 align-items-center flex-wrap" style="font-size: 0.65rem;">
                <span class="badge bg-secondary bg-opacity-50 border border-secondary text-light w-auto">
                  <i class="bi bi-bank me-1"></i> ${museumName}${extraCountText}
                </span>
                ${popularBadge}
              </div>
              <p class="small mb-1 text-info fw-bold">${d.bd || 'Date non specificate'}</p>
              <p class="small mb-2 text-white-50 text-truncate" title="${d.studies || ''}"><i class="bi bi-mortarboard me-1"></i>${d.studies || 'Formazione non specificata'}</p>
              <p class="small text-white mb-0" style="display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden;">
                ${d.bio || 'Nessuna biografia inserita.'}
              </p>
              <div class="mt-auto pt-3 text-end">
                <button class="btn btn-sm btn-outline-warning py-0 px-2" onclick="event.stopPropagation(); editAuthorData('${d._id}')"><i class="bi bi-pencil"></i> Modifica</button>
              </div>
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

// Gestisce il click visivo sulla card dell'autore
function highlightAuthorCard(dataId) {
  // 1. Salviamo la scelta nel campo nascosto
  document.getElementById("work-author-data-id").value = dataId;
  
  // 2. Resettiamo tutte le card togliendo il verde
  document.querySelectorAll('.author-card-item').forEach(card => {
    card.classList.remove('border-success', 'bg-success', 'bg-opacity-25');
    card.classList.add('border-secondary', 'bg-dark', 'bg-opacity-50');
    const icon = card.querySelector('.author-check-icon');
    if (icon) icon.remove();
  });

  // 3. Illuminiamo solo la card cliccata
  const selectedCard = document.getElementById(`author-card-${dataId}`);
  if (selectedCard) {
    selectedCard.classList.remove('border-secondary', 'bg-dark', 'bg-opacity-50');
    selectedCard.classList.add('border-success', 'bg-success', 'bg-opacity-25');
    selectedCard.insertAdjacentHTML('afterbegin', `<i class="bi bi-check-circle-fill text-success position-absolute top-0 end-0 m-2 fs-5 author-check-icon"></i>`);
  }
}

async function adoptAuthorCard(authorId, dataId) {
  try {
    const res = await fetch(`/api/authors/${authorId}/data/${dataId}/adopt`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ museumId: currentMuseumId })
    });
    
    if (!res.ok) throw new Error("Errore durante l'adozione della biografia");
    
    const updatedAuthor = await res.json();
    // Ricarichiamo le card per far apparire il badge verde!
    selectAuthor(updatedAuthor._id, updatedAuthor.name); 
  } catch (error) {
    alert(error.message);
    console.error(error);
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
  document.getElementById("old-author-data-id").value = "";
  
  // Impostiamo il campo hidden per ricordarci il nome
  document.getElementById("new-author-name-input").value = authorName;
  
  document.getElementById("authorDataModalLabel").innerText = `Crea Autore: ${authorName}`;
  document.getElementById("author-data-form").reset();

  document.getElementById("btn-ai-author").classList.add("d-none");

  authorDataModalInstance.show();
}

// Innescata dal bottone "Scrivi la tua" sopra lo slider
function openNewAuthorDataModal() {
  document.getElementById("new-author-name-input").value = ""; // Nome vuoto = autore esistente
  document.getElementById("old-author-data-id").value = "";
  document.getElementById("authorDataModalLabel").innerText = "Aggiungi la tua Biografia";
  document.getElementById("author-data-form").reset();
  document.getElementById("btn-ai-author").classList.add("d-none");
  authorDataModalInstance.show();
}

// Salva i dati (capisce da sola se fare POST o PUT)
async function saveAuthorData() {
  const newName = document.getElementById("new-author-name-input").value.trim();
  const existingAuthorId = document.getElementById("work-author-id").value;
  
  const payloadData = {
    museumId: currentMuseumId,
    oldDataId: document.getElementById("old-author-data-id").value,
    bd: document.getElementById("author-bd").value.trim(),
    studies: document.getElementById("author-studies").value.trim(),
    bio: document.getElementById("author-bio").value.trim()
  };

  try {
    let res;
    let finalAuthor; // Usiamo una variabile unificata per la risposta

    if (newName && !existingAuthorId) {
      // Caso creazione nuovo autore
      res = await fetch(`${API_BASE_URL}/authors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, data: payloadData })
      });
      if (!res.ok) throw new Error("Errore durante la creazione dell'autore");
      finalAuthor = await res.json();
      
    } else if (existingAuthorId) {
      // Caso modifica autore esistente
      res = await fetch(`${API_BASE_URL}/authors/${existingAuthorId}/data`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadData)
      });
      if (!res.ok) throw new Error("Errore durante l'aggiornamento dell'autore");
      finalAuthor = await res.json();
    }

    // Se tutto e' andato bene generiamo le descrizioni con l'ia
    if (finalAuthor) {
      if(!existingAuthorId) {
        console.log("Inizio generazione IA per l'autore in background...");
        fetch(`${API_BASE_URL}/ai/generate-author-desc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            authorId: finalAuthor._id, 
            museumId: currentMuseumId,
            authorName: finalAuthor.name || newName,
            userDescription: payloadData.bio // Usiamo il testo del form come contesto!
          })
        });
      }

      // Selezioniamo automaticamente il nuovo autore e ricarichiamo le card
      selectAuthor(finalAuthor._id, finalAuthor.name || newName);
      authorDataModalInstance.hide();
    }
  } catch (error) {
    alert(error.message);
    console.error(error);
  }
}

// ==========================================
// MODULO RICERCA STILI (Fuzzy Search)
// ==========================================

let styleSearchTimeout = null;
let styleDataModalInstance = null;

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("styleDataModal")) styleDataModalInstance = new bootstrap.Modal(document.getElementById("styleDataModal"));

  const styleInput = document.getElementById("work-style-search");
  if (styleInput) {
    styleInput.addEventListener("input", (e) => {
      const query = e.target.value.trim();
      if (query.length === 0) {
        hideStyleDropdown();
        document.getElementById("style-cards-container").style.display = "none";
        document.getElementById("work-style-id").value = "";
        return;
      }
      clearTimeout(styleSearchTimeout);
      styleSearchTimeout = setTimeout(() => { fetchStyles(query); }, 300);
    });
  }
});

async function fetchStyles(query) {
  try {
    const res = await fetch(`/api/styles/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error("Errore ricerca stile");
    const styles = await res.json();
    renderStyleDropdown(styles, query);
  } catch (error) { console.error(error); }
}

function renderStyleDropdown(styles, query) {
  const container = document.getElementById("style-search-results");
  container.innerHTML = "";
  if (styles.length === 0) {
    container.innerHTML = `
      <li class="px-3 py-2 small text-secondary">Nessuno stile trovato.</li>
      <li><hr class="dropdown-divider border-secondary border-opacity-25"></li>
      <li><button type="button" class="dropdown-item text-info small" onclick="createNewStyle('${query.replace(/'/g, "\\'")}')"><i class="bi bi-plus-circle me-1"></i> Crea nuovo: "${query}"</button></li>
    `;
  } else {
    styles.forEach(s => {
      const safeName = s.name.replace(/'/g, "\\'");
      container.innerHTML += `<li><button type="button" class="dropdown-item text-white small" onclick="selectStyle('${s._id}', '${safeName}')">${s.name}</button></li>`;
    });
  }
  container.style.display = "block";
}

function hideStyleDropdown() { document.getElementById("style-search-results").style.display = "none"; }

async function selectStyle(styleId, styleName) {
  document.getElementById("work-style-search").value = styleName;
  document.getElementById("work-style-id").value = styleId;
  hideStyleDropdown();
  
  const container = document.getElementById("style-cards-container");
  const slider = document.getElementById("style-slider");
  container.style.display = "block";
  slider.innerHTML = `<div class="spinner-border spinner-border-sm text-info m-3"></div>`;
  
  try {
    const res = await fetch(`/api/styles/${styleId}`);
    if (!res.ok) throw new Error("Errore recupero dati");
    const style = await res.json();
    currentFetchedStyle = style;

    document.getElementById("work-style-search").value = style.name;
    slider.innerHTML = "";

    // Troviamo se c'è una definizione già selezionata dal nostro museo
    let preselectedDataId = "";
    if (style.data && style.data.length > 0) {
      
      // 1. ORDINAMENTO DECRESCENTE per popolarità
      style.data.sort((a, b) => {
        const countA = a.museumId ? a.museumId.length : 0;
        const countB = b.museumId ? b.museumId.length : 0;
        return countB - countA;
      });

      style.data.forEach(d => {
        if (d.museumId && d.museumId.some(m => (m._id || m).toString() === currentMuseumId)) {
          preselectedDataId = d._id;
        }
      });

      // Salviamo l'id nel form nascosto (che avevamo inserito nell'html prima)
      document.getElementById("work-style-data-id").value = preselectedDataId;

      style.data.forEach((d, index) => {
        const adoptionCount = d.museumId ? d.museumId.length : 0;
        const museumName = d.museumId && adoptionCount > 0 && d.museumId[0].name ? d.museumId[0].name : "Altro Museo";
        const isSelected = preselectedDataId === d._id;
        
        // Logica Badge "Popolare"
        const isPopular = index === 0 && adoptionCount > 1; 
        const popularBadge = isPopular ? `<span class="badge bg-danger bg-opacity-25 border border-danger text-danger"><i class="bi bi-fire"></i> Più scelto</span>` : "";
        const extraCountText = adoptionCount > 1 ? ` (+${adoptionCount - 1})` : "";

        const borderClass = isSelected ? "border-success bg-success bg-opacity-25" : "border-secondary bg-dark bg-opacity-50";
        const checkIcon = isSelected ? `<i class="bi bi-check-circle-fill text-success position-absolute top-0 end-0 m-2 fs-5 style-check-icon"></i>` : "";

        slider.innerHTML += `
          <div class="card ${borderClass} style-card-item flex-shrink-0 position-relative" 
               style="width: 280px; scroll-snap-align: start; cursor: pointer; transition: all 0.2s;" 
               id="style-card-${d._id}"
               onclick="highlightStyleCard('${d._id}')">
            ${checkIcon}
            <div class="card-body p-3 d-flex flex-column">
              <div class="d-flex gap-1 mb-2 align-items-center flex-wrap" style="font-size: 0.65rem;">
                <span class="badge bg-secondary bg-opacity-50 border border-secondary text-light w-auto">
                  <i class="bi bi-bank me-1"></i> ${museumName}${extraCountText}
                </span>
                ${popularBadge}
              </div>
              <p class="small text-white mb-0" style="display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden;">
                ${d.description || 'Nessuna descrizione.'}
              </p>
              <div class="mt-auto pt-3 text-end">
                <button class="btn btn-sm btn-outline-warning py-0 px-2" onclick="event.stopPropagation(); editStyleData('${d._id}')"><i class="bi bi-pencil"></i> Modifica</button>
              </div>
            </div>
          </div>
        `;
      });
    } else {
      slider.innerHTML = `<p class="small text-secondary m-2">Nessuna definizione presente.</p>`;
    }
  } catch (error) {
    slider.innerHTML = `<p class="small text-danger m-2">Errore caricamento.</p>`;
  }
}

// Gestisce il click visivo sulla card dello stile
function highlightStyleCard(dataId) {
  document.getElementById("work-style-data-id").value = dataId;
  
  document.querySelectorAll('.style-card-item').forEach(card => {
    card.classList.remove('border-success', 'bg-success', 'bg-opacity-25');
    card.classList.add('border-secondary', 'bg-dark', 'bg-opacity-50');
    const icon = card.querySelector('.style-check-icon');
    if (icon) icon.remove();
  });

  const selectedCard = document.getElementById(`style-card-${dataId}`);
  if (selectedCard) {
    selectedCard.classList.remove('border-secondary', 'bg-dark', 'bg-opacity-50');
    selectedCard.classList.add('border-success', 'bg-success', 'bg-opacity-25');
    selectedCard.insertAdjacentHTML('afterbegin', `<i class="bi bi-check-circle-fill text-success position-absolute top-0 end-0 m-2 fs-5 style-check-icon"></i>`);
  }
}

function createNewStyle(styleName) {
  hideStyleDropdown();
  document.getElementById("work-style-search").value = styleName;
  document.getElementById("work-style-id").value = ""; 
  document.getElementById("old-style-data-id").value = "";
  document.getElementById("new-style-name-input").value = styleName;
  document.getElementById("styleDataModalLabel").innerText = `Crea Stile: ${styleName}`;
  document.getElementById("style-data-form").reset();
  document.getElementById("btn-ai-style").classList.add("d-none");
  styleDataModalInstance.show();
}

function openNewStyleDataModal() {
  document.getElementById("new-style-name-input").value = ""; 
  document.getElementById("old-style-data-id").value = "";
  document.getElementById("styleDataModalLabel").innerText = "Aggiungi la tua Definizione";
  document.getElementById("style-data-form").reset();
  document.getElementById("btn-ai-style").classList.add("d-none");
  styleDataModalInstance.show();
}

async function saveStyleData() {
  const newName = document.getElementById("new-style-name-input").value.trim();
  const existingStyleId = document.getElementById("work-style-id").value;
  
  const payloadData = {
    museumId: currentMuseumId,
    oldDataId: document.getElementById("old-style-data-id").value,
    description: document.getElementById("style-description").value.trim() 
  };

  try {
    let res;
    let finalStyle; 

    if (newName && !existingStyleId) {
      // Creazione nuovo stile
      res = await fetch(`${API_BASE_URL}/styles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, data: payloadData })
      });
      if (!res.ok) throw new Error("Errore durante la creazione dello stile");
      finalStyle = await res.json();
      
    } else if (existingStyleId) {
      // Modifica stile esistente
      res = await fetch(`${API_BASE_URL}/styles/${existingStyleId}/data`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadData)
      });
      if (!res.ok) throw new Error("Errore durante l'aggiornamento dello stile");
      finalStyle = await res.json();
    }

    // Generazione testo con ia (solo se lo stile e' nuovo)
    if (finalStyle) {
      if(!existingStyleId) {
        console.log("Inizio generazione IA per lo stile in background...");
        fetch(`${API_BASE_URL}/ai/generate-style-desc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            styleId: finalStyle._id, 
            museumId: currentMuseumId,
            styleName: finalStyle.name || newName,
            userDescription: payloadData.description
          })
        });
      }

      selectStyle(finalStyle._id, finalStyle.name || newName);
      
      // Ipotetica istanza della modale
      if (typeof styleDataModalInstance !== 'undefined') {
        styleDataModalInstance.hide();
      }
    }
  } catch (error) {
    alert(error.message);
    console.error(error);
  }
}

let textManagerModalInstance = null;

// Inizializza la modale quando la pagina si carica
document.addEventListener("DOMContentLoaded", () => {
  const tmModalEl = document.getElementById("textManagerModal");
  if (tmModalEl) {
    textManagerModalInstance = new bootstrap.Modal(tmModalEl);
  }
});

// Apre la modale ricevendo l'ID dell'opera
function openTextManager(workId) {
  // Peschiamo l'opera direttamente dalla cache usando l'ID come chiave!
  tmCurrentWork = worksCache[workId];
  
  if (!tmCurrentWork) {
    alert("Errore: Opera non trovata.");
    return;
  }

  document.getElementById("tm-work-name").innerText = tmCurrentWork.name;
  
  // Impostiamo i valori di default coerenti con il nuovo HTML
  document.getElementById("tm-audience").value = "medium";
  document.getElementById("tm-length").value = "medium";

  handleTextTypeChange();

  loadSpecificText();
  textManagerModalInstance.show();
}

// Gestisce il blocco e lo stile della tendina "Lunghezza" per Curiosità e Parafrasi
function handleTextTypeChange() {
  const aud = document.getElementById("tm-audience").value;
  const lenSelect = document.getElementById("tm-length");
  
  if (aud === 'funFact' || aud === 'paraphrase') {
    lenSelect.disabled = true;
    // Aggiungiamo le classi Bootstrap per farlo diventare grigino e semi-trasparente
    lenSelect.classList.add("opacity-50", "text-muted");
    lenSelect.classList.remove("text-light");
  } else {
    lenSelect.disabled = false;
    // Ripristiniamo l'aspetto originale
    lenSelect.classList.remove("opacity-50", "text-muted");
    lenSelect.classList.add("text-light");
  }
  
  loadSpecificText();
}

// 1. Cerca la stringa corretta nel database e la stampa
function loadSpecificText() {
  const aud = document.getElementById("tm-audience").value; // simple, medium, professional, expert, funFact, paraphrase
  const len = document.getElementById("tm-length").value;   // short, medium, long, exhaustive
  const textarea = document.getElementById("tm-textarea");

  textarea.value = "";

  if (tmCurrentWork) {
    if (aud === 'funFact' || aud === 'paraphrase') {
      // Se stiamo cercando Curiosità o Parafrasi, peschiamo dal primo livello dell'oggetto!
      if (tmCurrentWork[aud]) textarea.value = tmCurrentWork[aud];
    } else {
      // Altrimenti peschiamo dal registro nidificato (description.simple.short)
      if (tmCurrentWork.description && tmCurrentWork.description[aud] && tmCurrentWork.description[aud][len]) {
        textarea.value = tmCurrentWork.description[aud][len];
      } else if (typeof tmCurrentWork.description === 'string' && aud === 'medium' && len === 'medium') {
        textarea.value = tmCurrentWork.description;
      }
    }
  }
}

// 2. Salva la modifica manuale nel database (accetta tutte le opzioni)
async function saveSpecificText() {
  const aud = document.getElementById("tm-audience").value;
  const len = document.getElementById("tm-length").value;
  const newText = document.getElementById("tm-textarea").value.trim();

  if (!tmCurrentWork) return;

  // Costruiamo il payload dinamico da spedire al server
  let updatePayload = { museumId: currentMuseumId };

  if (aud === 'funFact' || aud === 'paraphrase') {
    // Aggiorna la cache e prepara il payload per i campi di primo livello
    tmCurrentWork[aud] = newText;
    updatePayload[aud] = newText; 
  } else {
    // Assicurati che l'oggetto descrizione esista e sia formattato bene
    if (!tmCurrentWork.description || typeof tmCurrentWork.description === 'string') {
      tmCurrentWork.description = { simple: {}, medium: {}, professional: {}, expert: {} };
    }
    if (!tmCurrentWork.description[aud]) tmCurrentWork.description[aud] = {};
    
    // Aggiorna la cache e prepara il payload per la descrizione nidificata
    tmCurrentWork.description[aud][len] = newText;
    updatePayload.description = tmCurrentWork.description;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/works/${tmCurrentWork._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatePayload)
    });

    if (res.ok) alert("Testo salvato con successo!");
    else alert("Errore durante il salvataggio.");
  } catch (error) {
    console.error(error);
  }
}

// 3. Genera il testo per UNA SINGOLA Cella (Risparmio Token!)
async function generateSpecificTextWithAI() {
  const aud = document.getElementById("tm-audience").value;
  const len = document.getElementById("tm-length").value;
  const textarea = document.getElementById("tm-textarea");

  if (!tmCurrentWork) return;

  // Peschiamo il contesto inserito nel form principale (se presente)
  const baseContext = document.getElementById("work-description")?.value || "Basati sulle tue conoscenze storiche.";
  let prompt = "";

  if (aud === 'funFact') {
    prompt = `Scrivi una curiosità divertente o un aneddoto poco noto (max 3 frasi) sull'opera d'arte "${tmCurrentWork.name}". Contesto del curatore: ${baseContext}. Restituisci SOLO ed ESCLUSIVAMENTE il testo finale, senza markdown e senza virgolette.`;
  } else if (aud === 'paraphrase') {
    prompt = `Scrivi una parafrasi (spiegazione molto semplificata, 2-3 frasi) del significato dell'opera d'arte "${tmCurrentWork.name}". Contesto del curatore: ${baseContext}. Restituisci SOLO ed ESCLUSIVAMENTE il testo finale, senza markdown e senza virgolette.`;
  } else {
    prompt = `
    Sei un esperto curatore d'arte e storico. Il tuo compito è generare una descrizoine per l'opera d'arte "${tmCurrentWork.name}".

    Considera che esistono questi 4 registri linguistici:
      - simple: per bambini o principianti assoluti (linguaggio molto semplice, concetti base).
      - medium: per il visitatore medio (divulgativo, coinvolgente).
      - professional: per appassionati o studenti d'arte (terminologia tecnica, cenni al movimento artistico).
      - expert: per storici dell'arte (analisi critica profonda, contesto socio-culturale, tecnica).
    E queste 4 lunghezze di descrizione:
      - short: 3 secondi (1 frase sintetica). NOTA BENE: Puoi usare la stessa identica frase "short" per tutti e 4 i registri per risparmiare tempo.
      - medium: 15 secondi (2-3 frasi).
      - long: 1 minuto (circa 2-3 paragrafi).
      - exhaustive: 4 minuti (analisi completa e lunghissima).

    Devi scrivere la descrizione basandoti sulle seguenti istruzioni:
      1. Tieni conto della contesto fornito dal curatore: ${baseContext}
      2. Usa il registro linguistico richiesto: ${aud} 
      3. Lunghezza richiesta: ${len} 

    Restituisci SOLO ed ESCLUSIVAMENTE il testo finale, senza virgolette iniziali/finali o formattazione markdown.
  `;
  }

  textarea.value = "Generazione in corso (attendi qualche secondo)...";
  
  try {
    const res = await fetch(`${API_BASE_URL}/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    
    if (res.ok) {
      const data = await res.json();
      textarea.value = data.text;
      // Nota: Il testo è stato inserito nella textarea, ma NON salvato nel DB. 
      // L'utente deve cliccare su "Salva Modifica Manuale" per confermare la scelta dell'IA.
    } else {
      textarea.value = "Errore durante la generazione. L'IA potrebbe essere offline.";
    }
  } catch (e) {
    textarea.value = "Errore di connessione al server.";
  }
}

function editAuthorData(dataId) {
  if (!currentFetchedAuthor) return;
  const data = currentFetchedAuthor.data.find(d => d._id === dataId);
  if (!data) return;

  document.getElementById("new-author-name-input").value = ""; // Lasciamo vuoto, autore esistente
  document.getElementById("old-author-data-id").value = dataId; // Salviamo il vecchio ID!
  document.getElementById("author-bd").value = data.bd || "";
  document.getElementById("author-studies").value = data.studies || "";
  document.getElementById("author-bio").value = data.bio || "";
  document.getElementById("btn-ai-author").classList.remove("d-none");
  document.getElementById("authorDataModalLabel").innerText = "Modifica Biografia";
  authorDataModalInstance.show();
}

function editStyleData(dataId) {
  if (!currentFetchedStyle) return;
  const data = currentFetchedStyle.data.find(d => d._id === dataId);
  if (!data) return;

  document.getElementById("new-style-name-input").value = ""; 
  document.getElementById("old-style-data-id").value = dataId;
  document.getElementById("style-description").value = data.description || "";
  document.getElementById("btn-ai-style").classList.remove("d-none");
  document.getElementById("styleDataModalLabel").innerText = "Modifica Definizione";
  styleDataModalInstance.show();
}

// 1. Genera testo specifico Opera (una singola cella)
async function generateSpecificTextWithAI() {
  const aud = document.getElementById("tm-audience").value, len = document.getElementById("tm-length").value;
  const textarea = document.getElementById("tm-textarea");
  if (!tmCurrentWork) return;

  const baseContext = document.getElementById("work-description")?.value || "Basati sulle tue conoscenze storiche.";
  const prompt = `Scrivi la descrizione per l'opera "${tmCurrentWork.name}". Contesto: ${baseContext}. Registro linguistico: ${aud}. Lunghezza: ${len}. Restituisci SOLO ed ESCLUSIVAMENTE il testo finale, senza markdown.`;

  textarea.value = "Generazione in corso...";
  try {
    const res = await fetch(`${API_BASE_URL}/ai/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
    if (res.ok) textarea.value = (await res.json()).text;
    else textarea.value = "Errore API.";
  } catch (e) { textarea.value = "Errore di connessione."; }
}

// 2. Genera e riempie tutti i campi dell'Autore
async function generateAuthorBioWithAI() {
  const bioTextarea = document.getElementById("author-bio");
  const authorName = currentFetchedAuthor ? currentFetchedAuthor.name : document.getElementById("new-author-name-input").value;
  const userContext = bioTextarea.value.trim();
  
  const prompt = `Crea scheda biografica per: "${authorName}". Appunti: "${userContext}". Istruzioni: 1. "bio": 2-3 paragrafi. 2. "bd": Date in formato "AAAA - AAAA". 3. "studies": Formazione. 4. "mainWorks": 2-3 frasi sulle opere principali. Restituisci SOLO un JSON valido: {"bio": "...", "bd": "...", "studies": "...", "mainWorks": "..."}. Non usare markdown.`;

  bioTextarea.value = "Compilazione scheda in corso...";
  try {
    const res = await fetch(`${API_BASE_URL}/ai/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
    if (res.ok) {
      // Puliamo eventuale markdown di formattazione di Gemini
      const cleanText = (await res.json()).text.replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(cleanText);
      
      // Riempiamo i vari input del form
      if(data.bd) document.getElementById("author-bd").value = data.bd;
      if(data.studies) document.getElementById("author-studies").value = data.studies;
      // Uniamo la bio alle opere principali
      bioTextarea.value = (data.bio || "") + (data.mainWorks ? "\n\nOpere principali: " + data.mainWorks : "");
    } else { bioTextarea.value = "Errore API."; }
  } catch (e) { bioTextarea.value = "Errore di parsing dati. Riprova."; console.error(e); }
}

// 3. Genera e riempie la descrizione dello Stile
async function generateStyleDescWithAI() {
  const descTextarea = document.getElementById("style-description");
  const styleName = currentFetchedStyle ? currentFetchedStyle.name : document.getElementById("new-style-name-input").value;
  const userContext = descTextarea.value.trim();
  
  const prompt = `Spiega lo stile artistico: "${styleName}". Appunti: "${userContext}". Spiega periodo storico e caratteristiche in 2-3 paragrafi. Restituisci SOLO un JSON con struttura {"description": "testo..."}. Niente markdown, usa solo apici singoli nel testo.`;

  descTextarea.value = "Generazione in corso...";
  try {
    const res = await fetch(`${API_BASE_URL}/ai/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
    if (res.ok) {
      const cleanText = (await res.json()).text.replace(/```json/g, '').replace(/```/g, '').trim();
      descTextarea.value = JSON.parse(cleanText).description || "";
    } else { descTextarea.value = "Errore API."; }
  } catch (e) { descTextarea.value = "Errore di parsing dati. Riprova."; }
}

// ==========================================
// FUNZIONI DI SUPPORTO FORM MUSEO
// ==========================================

// Genera le righe degli orari dinamicamente (con checkbox classica)
function buildScheduleForm() {
  const container = document.getElementById("schedule-container");
  if (!container) return;

  const days = [
    { id: 'monday', label: 'Lunedì' },
    { id: 'tuesday', label: 'Martedì' },
    { id: 'wednesday', label: 'Mercoledì' },
    { id: 'thursday', label: 'Giovedì' },
    { id: 'friday', label: 'Venerdì' },
    { id: 'saturday', label: 'Sabato' },
    { id: 'sunday', label: 'Domenica' }
  ];

  container.innerHTML = days.map(day => `
    <div class="col-12 col-lg-6 d-flex align-items-center schedule-row mb-2" data-day="${day.id}">
      <div class="form-check m-0 d-flex align-items-center me-3" style="width: 110px;">
        <input class="form-check-input sch-toggle me-2 mt-0 cursor-pointer" type="checkbox" id="sch-${day.id}" onchange="toggleScheduleInput(this)">
        <label class="form-check-label text-secondary small fw-bold cursor-pointer mb-0" for="sch-${day.id}">
          ${day.label}
        </label>
      </div>
      <input type="text" class="form-control form-control-sm glass-input text-white sch-hours flex-grow-1" placeholder="Es. 09-12, 15-18" disabled>
    </div>
  `).join('');
}

// Sblocca l'input quando la checkbox viene spuntata
function toggleScheduleInput(checkbox) {
  const row = checkbox.closest('.schedule-row');
  const input = row.querySelector('.sch-hours');
  
  if (input) {
    input.disabled = !checkbox.checked;
    if (!checkbox.checked) {
      input.value = ""; 
    } else {
      input.focus(); 
    }
  }
}

// Raccoglie tutti i dati dal form in un unico payload formattato per Mongoose
function getMuseumFormData() {
  const payload = {
    name: document.getElementById("museum-name").value.trim(),
    address: document.getElementById("museum-address").value.trim(),
    contact_email: document.getElementById("museum-email").value.trim(),
    contact_phone: document.getElementById("museum-phone").value.trim(),
    image: document.getElementById("museum-image").value.trim(),
    ticketPrice: parseFloat(document.getElementById("museum-price").value) || 0,
    tags: document.getElementById("museum-tags").value ? document.getElementById("museum-tags").value.split(",").map(t => t.trim()) : [],
    services: Array.from(document.querySelectorAll('.srv-cb:checked')).map(cb => cb.value),
    accessibility: Array.from(document.querySelectorAll('.acc-cb:checked')).map(cb => cb.value)
  };

  if (payload.accessibility.length === 0) payload.accessibility = ['none'];

  // Raccoglie SOLO i giorni in cui c'è la spunta!
  const schedule = [];
  document.querySelectorAll('.schedule-row').forEach(row => {
    const day = row.dataset.day;
    const isOpen = row.querySelector('.sch-toggle').checked;
    const hours = row.querySelector('.sch-hours').value.trim();
    
    if (isOpen) {
      schedule.push({ day, hours });
    }
  });
  
  payload.schedule = schedule;
  return payload;
}