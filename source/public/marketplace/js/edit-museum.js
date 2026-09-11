// edit-museum.js — CORE della pagina di modifica museo.
// Contiene SOLO: anagrafica museo, sezioni e opere (CRUD + drag&drop) ed eliminazione museo.
//
// La ricerca/selezione/creazione di Autori e Stili (usata dal modal Opera) è in
// author-style-picker.js. La gestione dei testi multi-registro dell'opera
// ("Gestisci Testi") è in work-text-manager.js. Entrambi vanno caricati PRIMA
// o dopo questo file, l'ordine non conta: le funzioni sono tutte nello stesso
// scope globale e vengono chiamate solo dopo DOMContentLoaded.
//
// currentMuseumId: NON dichiarata qui di proposito. Se non è già una `let`/`var`
// in config.js, aggiungila lì (è condivisa anche da author-style-picker.js e
// work-text-manager.js) — non l'ho aggiunta qui per non rischiare una doppia
// dichiarazione a runtime se config.js la definisce già.

let currentMuseumData = null;
let museumSections = [];
let workModalInstance = null;
let sectionModalInstance = null;
let deleteMuseumModalInstance = null;

// Cache globale per tenere in memoria i dati delle opere della pagina corrente
let worksCache = {};
let isGlobalFilterMode = false;
let sectionPagination = {}; 
let globalWorkPage = 1;
let globalTotalWorkPages = 1;
let isFetchingGlobalWorks = false;

document.addEventListener("DOMContentLoaded", async () => {
  if (document.getElementById("workModal")) workModalInstance = new bootstrap.Modal(document.getElementById("workModal"));
  if (document.getElementById("sectionModal")) sectionModalInstance = new bootstrap.Modal(document.getElementById("sectionModal"));
  if (document.getElementById("deleteMuseumModal")) deleteMuseumModalInstance = new bootstrap.Modal(document.getElementById("deleteMuseumModal"));

  // pulizia immagine se la modale viene chiusa senza salvare
  document.getElementById("workModal")?.addEventListener('hidden.bs.modal', () => {
    discardImage(document.getElementById("work-image")?.value);
  });
  document.getElementById("sectionModal")?.addEventListener('hidden.bs.modal', () => {
    discardImage(document.getElementById("section-image-input")?.value);
  });

  await fetchCurrentUser();

  const urlParams = new URLSearchParams(window.location.search);
  currentMuseumId = urlParams.get("id");

  if (!currentMuseumId) {
    window.location.replace("/my-museums");
    return;
  }

  buildScheduleForm();

  initImageWidget("edit-museum-image-widget", "museum-image", "Immagine di Copertina del Museo");
  initImageWidget("edit-work-image-widget", "work-image", "Immagine dell'Opera *");
  initImageWidget("edit-section-image-widget", "section-image-input", "Mappa / Piantina della Sezione", true);

  const workNameInput = document.getElementById("work-name");
  if (workNameInput) {
    workNameInput.addEventListener("blur", async (e) => {
      const query = e.target.value.trim();
      const wikiInput = document.getElementById("work-wikidata-id");
      const feedbackEl = document.getElementById("wikidata-feedback");
      
      // Scatta solo se c'è un titolo e l'ID è ancora vuoto
      if (query && wikiInput) {
        if (feedbackEl) {
          feedbackEl.style.display = "block";
          feedbackEl.className = "text-info mt-1";
          feedbackEl.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" style="width: 0.7rem; height: 0.7rem;"></span>Ricerca ID in corso...`;
        }
        
        // La funzione searchWikidata deve essere accessibile (es. in author-style-picker.js)
        const wikiResults = await searchWikidata(query); 
        
        if (wikiResults && wikiResults.length > 0) {
           const foundId = wikiResults[0].id;
           wikiInput.value = foundId.replace('Q', ''); // Salviamo solo i numeri
           
           // Aggiorna dinamicamente il link nella descrizione sopra l'input
           const wikiLink = document.getElementById("work-wikidata-link");
           if (wikiLink) wikiLink.href = `https://www.wikidata.org/wiki/${foundId}`;

           if (feedbackEl) {
             feedbackEl.className = "text-success mt-1";
             // Inseriamo un link diretto anche nel messaggio di successo e RIMUOVIAMO il setTimeout per lasciarlo cliccabile
             feedbackEl.innerHTML = `<i class="bi bi-check-circle me-1"></i>Trovato: <strong>${wikiResults[0].label || foundId}</strong>. <a href="https://www.wikidata.org/wiki/${foundId}" target="_blank" class="text-success text-decoration-underline">Clicca per verificare</a>`;
           }
        } else {
           if (feedbackEl) {
             feedbackEl.className = "text-warning mt-1";
             feedbackEl.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i>Corrispondenza non trovata. Puoi cercarlo manualmente su <a href="https://www.wikidata.org" target="_blank" class="text-warning text-decoration-underline fw-bold">wikidata.org</a>`;
           }
        }
      }
    });
  }

  const wikiInput = document.getElementById("work-wikidata-id");
  if (wikiInput) {
    wikiInput.addEventListener("input", (e) => {
      const link = document.getElementById("work-wikidata-link");
      if (link) {
        const val = e.target.value.trim();
        // Se c'è un valore, costruisce il link aggiungendo la "Q", altrimenti torna alla home di Wikidata
        link.href = val ? `https://www.wikidata.org/wiki/Q${val}` : "https://www.wikidata.org";
      }
    });
  }

  populateFilters('works');

  await loadMuseumDetails();
});

async function loadMuseumDetails() {
  try {
    const res = await fetch(`${API_BASE_URL}/museums/${currentMuseumId}`);
    currentMuseumData = await res.json();

    if (!currentMuseumData) { alert("Museo non trovato."); return; }

    document.getElementById("museum-name").value = currentMuseumData.name || "";
    document.getElementById("museum-address").value = currentMuseumData.address || "";
    document.getElementById("museum-email").value = currentMuseumData.contact_email || "";
    document.getElementById("museum-phone").value = currentMuseumData.contact_phone || "";
    document.getElementById("museum-tags").value = (currentMuseumData.tags || []).join(", ");
    document.getElementById("editor-title").innerText = `Modifica: ${currentMuseumData.name}`;
    document.getElementById("museum-price").value = currentMuseumData.ticketPrice || "";
    
    if (currentMuseumData.image) {
      setFinalImage("museum-image", currentMuseumData.image);
    } else {
      clearImageWidget("museum-image");
    }

    // Spunta le checkbox dei servizi (Adattato al nuovo Schema Mongoose)
    if (currentMuseumData.services) {
      currentMuseumData.services.forEach(s => {
        // Estrae la stringa sia che arrivi come oggetto { services: 'cafe' } sia come stringa pura
        const serviceName = s.services || s; 
        const cb = document.querySelector(`.srv-cb[value="${serviceName}"]`);
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

// CARICAMENTO SEZIONI (Lazy Loading Opere)
async function loadSectionsAndWorks() {
  const container = document.getElementById("sectionsAccordion");
  worksCache = {};

  try {
    // 1. Chiediamo al backend solo la lista delle sezioni
    const res = await fetch(`${API_BASE_URL}/museums/${currentMuseumId}/sections`);
    museumSections = await res.json();

    if (museumSections.length === 0) {
      container.innerHTML = `<div class="text-center py-4 text-secondary">Nessuna sezione presente. Inizia creando una sezione!</div>`;
      return;
    }

    let html = "";
    museumSections.forEach((section, index) => {
      html += renderSectionAccordionItem(section, index);
    });
    container.innerHTML = html;

    // 2. Chiediamo al backend i metadati globali per i filtri (autori, stili, ecc.) a costo quasi zero
    fetch(`${API_BASE_URL}/museums/${currentMuseumId}/works?limit=1&fetchMetadata=true`)
      .then(r => r.json())
      .then(data => {
        if (data.metadata && typeof initializeWorkFiltersDataFromApi === 'function') {
          initializeWorkFiltersDataFromApi(data.metadata);
        }
      }).catch(e => console.error("Errore recupero metadati filtri:", e));

    // 3. LAZY LOADING & PAGINAZIONE PER STANZA (Modalità Default)
    container.addEventListener('show.bs.collapse', async (e) => {
      if (isGlobalFilterMode) return; // Disattiva il lazy load della stanza se i filtri globali sono attivi

      const sectionId = e.target.dataset.sectionId;
      if (!sectionId) return;
      
      const worksContainer = document.getElementById(`works-container-${sectionId}`);
      if (worksContainer.dataset.loaded === "true") return;

      // Inizializza stato paginazione locale
      if (!sectionPagination[sectionId]) {
        sectionPagination[sectionId] = { page: 1, totalPages: 1, isLoading: false };
      }
      await loadSectionWorksChunk(sectionId);
    });

  } catch (error) {
    console.error("Errore sezioni:", error);
    container.innerHTML = `<div class="alert alert-danger">Errore caricamento struttura.</div>`;
  }
}

function renderSectionAccordionItem(section, index) {
  const collapseId = `collapseSection${index}`;
  const headingId = `headingSection${index}`;
  const safeSectionName = (section.name || "").replace(/'/g, "\\'");
  const safeSectionImage = (section.image || "").replace(/'/g, "\\'");

  return `
    <div class="accordion-item bg-transparent mb-3 border-0 section-accordion-wrapper" id="wrapper-${section._id}">
      <h2 class="accordion-header" id="${headingId}">
        <button class="accordion-button collapsed custom-card text-white py-3 px-4 shadow-sm" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" style="border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); box-shadow: none;">
          <i class="bi bi-grid-1x2-fill me-3 text-info fs-5"></i> 
          <span class="fw-bold fs-6">${section.name}</span>
        </button>
      </h2>
      
      <div id="${collapseId}" class="accordion-collapse collapse mt-2" data-section-id="${section._id}">
        <div class="accordion-body p-4 custom-card border-secondary border-opacity-25 bg-dark bg-opacity-50" style="border-radius: 12px;">
          
          <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom border-secondary border-opacity-25">
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-glass text-white px-3" onclick="openSectionModal('${section._id}', '${safeSectionName}', '${safeSectionImage}')">
                <i class="bi bi-pencil me-1"></i> Modifica Sezione
              </button>
              <button class="btn btn-sm btn-glass text-danger px-3" onclick="deleteSection('${section._id}')">
                <i class="bi bi-trash me-1"></i> Elimina
              </button>
            </div>
            <button class="btn btn-sm btn-gradient px-4 rounded-pill shadow-sm" onclick="openWorkModal('${section._id}')">
              <i class="bi bi-plus-lg me-1"></i> Nuova Opera
            </button>
          </div>

          <!-- Contenitore Opere inizialmente vuoto (Verrà riempito all'apertura) -->
          <div class="row row-cols-1 row-cols-md-2 g-3 mt-1 sortable-works-container" id="works-container-${section._id}" data-section-id="${section._id}" data-loaded="false" style="min-height: 80px;">
            <div class="col-12 text-center text-secondary small py-3 fst-italic">Espandi la stanza per caricare le opere</div>
          </div>

        </div>
      </div>
    </div>`;
}

// Helper per generare le card interne
function renderWorksHTML(works, sectionId) {
  if (works.length === 0) {
    return `<div class="col-12 empty-section-placeholder"><p class="small text-white-50 mb-0 fst-italic">Nessuna opera in questa sezione. Trascinane una qui o aggiungine una!</p></div>`;
  }
  return works.map(w => `
    <div class="col sortable-work-item" data-work-id="${w._id}">
      <div class="card bg-transparent border border-secondary border-opacity-25 h-100 p-2 d-flex flex-row align-items-center rounded-3">
        <i class="bi bi-grip-vertical text-secondary me-2 drag-handle fs-5" style="cursor: grab;"></i>
        <img src="${w.image || '/img/fallback-work.jpg'}" class="rounded me-3 shadow-sm" style="width: 45px; height: 45px; object-fit: cover;">
        <div class="flex-grow-1 text-truncate">
          <h6 class="mb-0 text-white text-truncate small fw-bold">${w.name}</h6>
          <small class="text-white-50" style="font-size: 0.7rem;">${w.author?.name || w.authorName || w.author || 'Sconosciuto'}</small>
        </div>
        <div class="d-flex gap-1 ms-2">
          <button class="btn btn-sm btn-glass text-info p-1 px-2 border-0" onclick="openTextManager('${w._id}')"><i class="bi bi-card-text"></i></button>
          <button class="btn btn-sm btn-glass text-white p-1 px-2 border-0" onclick="openWorkModal('${sectionId}', '${w._id}')"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-glass text-danger p-1 px-2 border-0" onclick="deleteWork('${sectionId}', '${w._id}')"><i class="bi bi-trash"></i></button>
        </div>
      </div>
    </div>
  `).join('');
}

// ------------------- GESTIONE SEZIONI (Invariata) -------------------
function openSectionModal(sectionId = null, currentName = "", currentImage = "") {
  document.getElementById("section-id-input").value = sectionId || "";
  document.getElementById("section-name-input").value = currentName;
  document.getElementById("sectionModalLabel").innerText = sectionId ? "Modifica Sezione" : "Nuova Sezione";
  
  if (currentImage) {
    setFinalImage("section-image-input", currentImage);
  } else {
    clearImageWidget("section-image-input");
  }
  
  sectionModalInstance.show();
}

async function saveSectionFromModal() {
  const form = document.getElementById("section-form"); // Assicurati che gli input siano dentro un <form id="section-form">
  if (form) {
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
  }

  const sectionId = document.getElementById("section-id-input").value;
  const sectionName = document.getElementById("section-name-input").value.trim();
  const sectionImage = document.getElementById("section-image-input").value.trim();

  // Controllo manuale per l'immagine
  if (!sectionImage) { 
    showToast("La mappa / piantina della sezione è obbligatoria.", "error"); 
    return; 
  }

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
        markImageConfirmed(sectionImage);
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
          accordionButton.innerHTML = `<i class="bi bi-folder2-open me-2 text-info"></i> ${sectionName} <span class="badge badge-tag ms-auto me-3">${museumSections[secIndex].works?.length || 0} opere</span>`;
        }
      }
    } else {
      // 2. CREAZIONE NUOVA SEZIONE
      res = await fetch(`${API_BASE_URL}/save-section`, {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rsection: { name: sectionName, image: sectionImage }, museumId: currentMuseumId })
      });
      
      if (res.ok) {
        markImageConfirmed(sectionImage);
        const newSectionId = await res.json();
        sectionModalInstance.hide();
        
        // Pushiamo la nuova sezione nello stato locale
        const newSectionObj = { _id: newSectionId, name: sectionName, image: sectionImage };
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
    "Attenzione: Eliminerai la sezione e tutte le opere contenute! Sei sicuro?"
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

// ------------------- GESTIONE OPERE -------------------
async function openWorkModal(sectionId, workId = null) {
  // Helper di sicurezza: non crasha mai anche se rimuovi un id dall'HTML
  const safeSetValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  };

  safeSetValue("work-section-id", sectionId);
  safeSetValue("work-id", workId || "");

  if (workId && worksCache[workId]) {
    const w = worksCache[workId];
    
    const labelEl = document.getElementById("workModalLabel");
    if (labelEl) labelEl.innerText = "Modifica Opera";
    const btnEl = document.getElementById("save-work-btn");
    if (btnEl) btnEl.innerText = "Aggiorna Opera";
    
    safeSetValue("work-name", w.name || "");
    
    const authorId = w.author?._id || w.author || "";
    const authorName = w.author?.name || (authorId ? "Autore Selezionato" : ""); 
    safeSetValue("work-author-id", authorId);
    safeSetValue("work-author-search", authorName); 
    
    const styleId = w.style?._id || w.style || "";
    const styleName = w.style?.name || (styleId ? "Stile Selezionato" : ""); 
    safeSetValue("work-style-id", styleId);
    safeSetValue("work-style-search", styleName); 
    
    safeSetValue("work-technique", w.technique || "");
    safeSetValue("work-year", w.year || "");
    safeSetValue("work-image", w.image || "");
    safeSetValue("work-wikidata-id", w.wikidataId || "");
    safeSetValue("work-license", w.license || "CC BY-NC 4.0");
    
    let desc = "";
    if (w.description && w.description.simple && w.description.simple.medium) {
      desc = w.description.simple.medium;
    }
    safeSetValue("work-description", desc);

    if (authorId) selectAuthor(authorId, authorName);
    else {
      const authContainer = document.getElementById("author-cards-container");
      if (authContainer) authContainer.style.display = "none";
    }

    if (styleId) selectStyle(styleId, styleName);
    else {
      const styleContainer = document.getElementById("style-cards-container");
      if (styleContainer) styleContainer.style.display = "none";
    }

    if (w.image) {
      safeSetValue("work-image-url-input", w.image);
      if (typeof setFinalImage === 'function') setFinalImage("work-image", w.image);
    }
  } else {
    const labelEl = document.getElementById("workModalLabel");
    if (labelEl) labelEl.innerText = "Nuova Opera";
    const btnEl = document.getElementById("save-work-btn");
    if (btnEl) btnEl.innerText = "Crea Opera";
    
    const form = document.getElementById("work-form");
    if (form) form.reset();
    
    safeSetValue("work-author-id", "");
    safeSetValue("work-style-id", "");
    safeSetValue("work-author-data-id", "");
    safeSetValue("work-style-data-id", "");
    safeSetValue("work-wikidata-id", "");
    safeSetValue("work-license", "CC BY-NC 4.0");
    
    const authContainer = document.getElementById("author-cards-container");
    if (authContainer) authContainer.style.display = "none";
    
    const styleContainer = document.getElementById("style-cards-container");
    if (styleContainer) styleContainer.style.display = "none";

    if (typeof clearImageWidget === 'function') clearImageWidget("work-image"); 
  }
  
  if (workModalInstance) workModalInstance.show();
}

async function saveWorkFromModal() {
  const form = document.getElementById("work-form"); // Esiste già, l'hai usato per .reset()
  if (form) {
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
  }

  const sectionId = document.getElementById("work-section-id").value;
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
    wikidataId: document.getElementById("work-wikidata-id")?.value.trim() || undefined,
    license: document.getElementById("work-license")?.value.trim() || "CC BY-NC 4.0"
  };
  
  // Autore e Stile non sono input testuali nativi in HTML (di solito sono riempiti tramite una ricerca/tendina personalizzata)
  // Quindi manteniamo un controllo esplicito per l'ID dell'autore e dello stile.
  if (!workData.author) { 
    showToast("Autore non valido. Seleziona l'autore dal menu a tendina.", "error"); 
    return; 
  }
  
  if (!workData.style) {
    showToast("Stile non valido. Seleziona lo stile dal menu a tendina.", "error");
    return;
  }
  
  if (!workData.image) {
    showToast("L'immagine dell'opera è obbligatoria.", "error");
    return;
  }

  try {
    const authorId = workData.author;
    const authorDataInput = document.getElementById("work-author-data-id");
    const authorDataId = authorDataInput.value;
    const originalAuthorDataId = authorDataInput.dataset.original || "";
    
    // Eseguiamo l'adozione SOLO se c'è un ID valido e l'utente ha CAMBIATO la selezione 
    // (evitiamo put inutili e 500 se il museo aveva già adottato questa scheda)
    if (authorId && authorDataId && authorDataId !== originalAuthorDataId) {
      await fetch(`${API_BASE_URL}/authors/${authorId}/data/${authorDataId}/adopt`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ museumId: currentMuseumId })
      }).catch(e => console.error("Errore adozione autore ignorato:", e));
    }

    const styleDataInput = document.getElementById("work-style-data-id");
    const styleId = workData.style; 
    const styleDataId = styleDataInput.value;
    const originalStyleDataId = styleDataInput.dataset.original || "";
    
    if (styleId && styleDataId && styleDataId !== originalStyleDataId) {
      await fetch(`${API_BASE_URL}/styles/${styleId}/data/${styleDataId}/adopt`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ museumId: currentMuseumId })
      }).catch(e => console.error("Errore adozione stile ignorato:", e));
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
      markImageConfirmed(workData.image);

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
      // Aggiorniamo dinamicamente solo il contenitore delle opere della stanza interessata
      const worksRes = await fetch(`${API_BASE_URL}/sections/${sectionId}/works`);
      const works = await worksRes.json();
      works.forEach(w => worksCache[w._id] = w);

      const worksContainer = document.getElementById(`works-container-${sectionId}`);
      if (worksContainer) {
        worksContainer.innerHTML = renderWorksHTML(works, sectionId);
        worksContainer.dataset.loaded = "true";
        setTimeout(initSortableWorks, 100);
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
      method: "DELETE", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId: sectionId, museumId: currentMuseumId })
    });
    if (res.ok) loadSectionsAndWorks();
  } catch (error) { console.error(error); }
}

// ------------------- SALVA E ELIMINA MUSEO -------------------

async function saveAllMuseumChanges() {
  const updatedMuseum = getMuseumFormData();

  try {
    const res = await fetch(`${API_BASE_URL}/museums/${currentMuseumId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedMuseum)
    });

    if (res.ok) {
      markImageConfirmed(updatedMuseum.image);
      alert("Museo aggiornato con successo!");
      window.location.replace("/my-museums"); 
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
          `Attenzione! Hai ${activeImports.length} opere in prestito da altri musei.\n\nVuoi restituirle tutte automaticamente prima di eliminare il museo? (Se annulli, l'eliminazione verrà interrotta).`
        );

        if (!isConfirmed) {
          deleteMuseumModalInstance.hide();
          return;
        }

        // Le restituzioni sono indipendenti tra loro: eseguile in parallelo
        await Promise.all(
          activeImports.map(ad =>
            fetch(`${API_BASE_URL}/adoptions/${ad._id}/complete`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" }
            })
          )
        );
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
      window.location.replace("/my-museums"); 
    } else {
      alert("Errore durante l'eliminazione del museo.");
    }
  } catch (error) {
    console.error(error);
  }
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
  const selectedServices = Array.from(document.querySelectorAll('.srv-cb:checked')).map(cb => cb.value);
  const selectedAccessibility = Array.from(document.querySelectorAll('.acc-cb:checked')).map(cb => cb.value);

  const payload = {
    name: document.getElementById("museum-name").value.trim(),
    address: document.getElementById("museum-address").value.trim(),
    contact_email: document.getElementById("museum-email").value.trim(),
    contact_phone: document.getElementById("museum-phone").value.trim(),
    image: document.getElementById("museum-image").value.trim(),
    ticketPrice: parseFloat(document.getElementById("museum-price").value) || 0,
    tags: document.getElementById("museum-tags").value ? document.getElementById("museum-tags").value.split(",").map(t => t.trim()) : [],
    // Mappato come subdocumenti { services: string } per combaciare con servicesSchema
    services: selectedServices.map(val => ({ services: val })),
    accessibility: selectedAccessibility.length > 0 ? selectedAccessibility : ['none']
  };

  // Raccoglie SOLO i giorni in cui c'è la spunta
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

function initSortableWorks() {
  const containers = document.querySelectorAll('.sortable-works-container');
  
  containers.forEach(container => {
    // Evita doppie inizializzazioni se ricarichiamo la UI
    if (container.sortableInstance) {
      container.sortableInstance.destroy();
    }

    container.sortableInstance = new Sortable(container, {
      group: 'shared-works-group', // FONDAMENTALE: Dice a Sortable che le stanze possono scambiarsi le opere
      handle: '.drag-handle',
      animation: 150,
      ghostClass: 'bg-dark',
      fallbackOnBody: true,        // LA MAGIA: Fa galleggiare l'opera fuori dall'accordion!
      swapThreshold: 0.65,
      onEnd: async function (evt) {
        const itemEl = evt.item;
        const toContainer = evt.to;
        const fromContainer = evt.from;

        if (toContainer === fromContainer) return; 

        const workId = itemEl.dataset.workId;
        const newSectionId = toContainer.dataset.sectionId;
        const oldSectionId = fromContainer.dataset.sectionId;

        const placeholder = toContainer.querySelector('.empty-section-placeholder');
        if (placeholder) placeholder.remove();

        if (fromContainer.children.length === 0) {
          fromContainer.innerHTML = `<div class="col-12 empty-section-placeholder"><p class="small text-white-50 mb-0 fst-italic">Nessuna opera in questa stanza. Trascinane una qui!</p></div>`;
        }

        itemEl.style.opacity = '0.4';

        try {
          const res = await fetch(`${API_BASE_URL}/works/${workId}/move`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              museumId: currentMuseumId,
              oldSectionId: oldSectionId,
              newSectionId: newSectionId,
            })
          });
          
          if (!res.ok) throw new Error("Errore API spostamento");
                    
          itemEl.style.opacity = '1';
        } catch (error) {
          console.error(error);
          alert("Errore nello spostamento dell'opera.");
          loadSectionsAndWorks(); 
        }
      }
    });
  });
}

// ==========================================
// FUNZIONI DI SUPPORTO PAGINAZIONE E FILTRI
// ==========================================

// --- Modalità Locale (Accordion Default) ---
async function loadSectionWorksChunk(sectionId, isLoadMore = false) {
  const worksContainer = document.getElementById(`works-container-${sectionId}`);
  const state = sectionPagination[sectionId];

  if (state.isLoading) return;
  state.isLoading = true;

  if (!isLoadMore) {
    worksContainer.innerHTML = `<div class="col-12 text-center py-4"><div class="spinner-border spinner-border-sm text-info"></div> Caricamento opere...</div>`;
  } else {
    const btn = document.getElementById(`load-more-btn-${sectionId}`);
    if (btn) btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/sections/${sectionId}/works?page=${state.page}&limit=12`);
    const data = await res.json();
    
    // Supporto ibrido in base a cosa torna (Limitato -> Data Object, non Limitato -> Array)
    const works = Array.isArray(data) ? data : (data.works || []);
    state.totalPages = data.totalPages || 1;

    works.forEach(w => worksCache[w._id] = w);
    
    // Rimuove il vecchio pulsante prima di inserire le nuove opere
    const oldBtn = document.getElementById(`load-more-container-${sectionId}`);
    if (oldBtn) oldBtn.remove();

    const worksHTML = renderWorksHTML(works, sectionId);
    
    if (isLoadMore) {
       worksContainer.insertAdjacentHTML("beforeend", worksHTML);
    } else {
       worksContainer.innerHTML = worksHTML;
       worksContainer.dataset.loaded = "true";
    }

    if (state.page < state.totalPages) {
      worksContainer.insertAdjacentHTML("beforeend", `
        <div class="col-12 text-center mt-3" id="load-more-container-${sectionId}">
          <button class="btn btn-sm btn-outline-info" id="load-more-btn-${sectionId}" onclick="loadNextSectionPage('${sectionId}')">
            Carica altre opere della stanza
          </button>
        </div>
      `);
    }
    setTimeout(initSortableWorks, 100);
  } catch (err) {
    if (!isLoadMore) worksContainer.innerHTML = `<div class="col-12 text-danger">Errore caricamento.</div>`;
  } finally {
    state.isLoading = false;
  }
}

window.loadNextSectionPage = function(sectionId) {
  if (sectionPagination[sectionId] && sectionPagination[sectionId].page < sectionPagination[sectionId].totalPages) {
    sectionPagination[sectionId].page++;
    loadSectionWorksChunk(sectionId, true);
  }
};

// --- Modalità Globale (Filtri Attivati) ---
// Alias chiamati da filters.js
window.renderWorksList = function(works, append = false) { renderGlobalCatalog(works, append); };
window.fetchAndRenderWorks = async function(museumId, append) { await fetchGlobalCatalogChunk(museumId, append); };
window.updateWorksSentinelVisibility = function() { updateGlobalCatalogSentinel(); };

document.addEventListener('search-input', () => {
  if (!currentMuseumId) return;
  clearTimeout(window.worksSearchTimeout);
  window.worksSearchTimeout = setTimeout(() => {
    fetchGlobalCatalogChunk(currentMuseumId, false);
  }, 300);
});

document.addEventListener('search-cleared', () => {
  if (!currentMuseumId) return;
  
  // FIX ALLA RADICE 3: Uccidiamo il timer della search-bar prima di resettare
  clearTimeout(window.worksSearchTimeout); 
  
  isGlobalFilterMode = false;
  resetToLazyAccordion(); 
});

async function fetchGlobalCatalogChunk(museumId, isLoadMore = false) {
  if (isFetchingGlobalWorks) return;
  isFetchingGlobalWorks = true;
  isGlobalFilterMode = true; 

  const searchInput = document.getElementById("museum-search-input")?.value.trim().toLowerCase() || "";
  const authorCbs = Array.from(document.querySelectorAll('.author-cb:checked')).map(cb => cb.value);
  const techniqueCbs = Array.from(document.querySelectorAll('.technique-cb:checked')).map(cb => cb.value);
  const styleCbs = Array.from(document.querySelectorAll('.workstyle-cb:checked')).map(cb => cb.value);

  // FIX ALLA RADICE 1: Se tutti i filtri sono vuoti, blocchiamo la fetch globale 
  // e rimandiamo tutto allo stato base a stanze.
  if (!searchInput && authorCbs.length === 0 && techniqueCbs.length === 0 && styleCbs.length === 0) {
    isFetchingGlobalWorks = false;
    isGlobalFilterMode = false;
    resetToLazyAccordion();
    return;
  }

  if (!isLoadMore) {
    globalWorkPage = 1;
    document.querySelectorAll('.sortable-works-container').forEach(c => {
      c.innerHTML = "";
      c.dataset.loaded = "false";
    });
    document.querySelectorAll('.accordion-collapse').forEach(c => c.classList.remove('show'));
    
    // NOVITÀ: Nascondi di default tutte le sezioni dell'accordion quando parte la ricerca
    document.querySelectorAll('.section-accordion-wrapper').forEach(w => w.classList.add('d-none'));
  }

  const params = new URLSearchParams();
  params.append("page", globalWorkPage);
  params.append("limit", 24); 
  if (searchInput) params.append("search", searchInput);
  if (authorCbs.length > 0) params.append("author", authorCbs.join(","));
  if (techniqueCbs.length > 0) params.append("technique", techniqueCbs.join(","));
  if (styleCbs.length > 0) params.append("workstyle", styleCbs.join(","));

  try {
    const res = await fetch(`${API_BASE_URL}/museums/${museumId}/works?${params.toString()}`);
    const data = await res.json();
    
    globalTotalWorkPages = data.totalPages || 1;
    const fetchedWorks = data.works || [];
    
    fetchedWorks.forEach(w => worksCache[w._id] = w);
    renderGlobalCatalog(fetchedWorks, isLoadMore);

    // NOVITÀ: Scroll fluido alla prima stanza con risultati visibili
    if (!isLoadMore) {
      setTimeout(() => {
        const firstVisible = document.querySelector('.section-accordion-wrapper:not(.d-none)');
        if (firstVisible) {
          // Sottraiamo 100px per non far finire il titolo sotto l'header appiccicato in alto
          const y = firstVisible.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 150); // Piccolo ritardo per dare tempo al browser di espandere l'accordion
    }

  } catch (e) {
    console.error("Errore fetch globale:", e);
  } finally {
    isFetchingGlobalWorks = false;
    updateGlobalCatalogSentinel();
  }
}

function renderGlobalCatalog(works, isLoadMore) {
  if (works.length === 0 && !isLoadMore) return;

  const worksBySection = {};
  works.forEach(w => {
    const sId = w.sectionId || "unassigned";
    if (!worksBySection[sId]) worksBySection[sId] = [];
    worksBySection[sId].push(w);
  });

  for (const sId in worksBySection) {
    const container = document.getElementById(`works-container-${sId}`);
    if (container) {
      
      // NOVITÀ: Riaccendi la visibilità dell'intera sezione
      const wrapper = document.getElementById(`wrapper-${sId}`);
      if (wrapper) wrapper.classList.remove('d-none');

      const html = renderWorksHTML(worksBySection[sId], sId);
      container.insertAdjacentHTML("beforeend", html);
      
      const collapseEl = container.closest('.accordion-collapse');
      if (collapseEl && !collapseEl.classList.contains('show')) {
        // FIX ALLA RADICE 2: Apriamo la stanza istantaneamente manipolando le classi.
        // L'animazione di Bootstrap faceva accorciare la pagina facendo impazzire l'infinite scroll.
        collapseEl.classList.add('show');
        
        // Sistemiamo anche l'icona del bottone
        const btn = document.querySelector(`[data-bs-target="#${collapseEl.id}"]`);
        if (btn) btn.classList.remove('collapsed');
      }
    }
  }
  
  setTimeout(initSortableWorks, 100);
}

function updateGlobalCatalogSentinel() {
  let sentinel = document.getElementById("global-works-sentinel");
  if (!sentinel) {
    // Genera l'infinite-scroll in fondo a tutte le stanze (dopo l'accordion)
    sentinel = document.createElement("div");
    sentinel.id = "global-works-sentinel";
    sentinel.className = "text-center py-4 d-none w-100";
    sentinel.innerHTML = `<div class="spinner-border text-info spinner-border-sm"></div> Caricamento risultati della ricerca...`;
    
    const accordion = document.getElementById("sectionsAccordion");
    if (accordion) accordion.parentNode.appendChild(sentinel);
    
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isFetchingGlobalWorks && globalWorkPage < globalTotalWorkPages) {
        globalWorkPage++;
        fetchGlobalCatalogChunk(currentMuseumId, true);
      }
    }, { rootMargin: '100px' });
    observer.observe(sentinel);
  }

  if (globalWorkPage < globalTotalWorkPages) sentinel.classList.remove("d-none");
  else sentinel.classList.add("d-none");
}

function resetToLazyAccordion() {
  document.querySelectorAll('.sortable-works-container').forEach(c => {
    c.innerHTML = `<div class="col-12 text-center text-secondary small py-3 fst-italic">Espandi la stanza per caricare le opere</div>`;
    c.dataset.loaded = "false";
  });
  
  document.querySelectorAll('.accordion-collapse').forEach(c => {
    c.classList.remove('show');
    // Sistemiamo anche l'icona a freccia dei bottoni dell'accordion
    const btn = document.querySelector(`[data-bs-target="#${c.id}"]`);
    if (btn) btn.classList.add('collapsed');
  });
  
  document.querySelectorAll('.section-accordion-wrapper').forEach(w => w.classList.remove('d-none'));
  
  const sentinel = document.getElementById("global-works-sentinel");
  if (sentinel) sentinel.classList.add("d-none");
  
  sectionPagination = {};

  // FIX 1: Chiudi la sidebar dei filtri (se aperta)
  const sidebar = document.getElementById("filterSidebar");
  if (sidebar && sidebar.classList.contains('show')) {
    const bsOffcanvas = bootstrap.Offcanvas.getInstance(sidebar);
    if (bsOffcanvas) bsOffcanvas.hide();
  }

  // Scroll fluido verso l'inizio dell'area sezioni
  const accordion = document.getElementById("sectionsAccordion");
  if (accordion) {
    const y = accordion.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
}