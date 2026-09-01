// author-style-picker.js — Ricerca, selezione e creazione di Autori e Stili
// per il modal "Opera" di edit-museum.js. Estratto dal core perché è un
// blocco autonomo (potenzialmente riusabile altrove) e piuttosto corposo.
//
// Dipende da: currentMuseumId (dichiarata in config.js o in edit-museum.js core),
// API_BASE_URL (config.js). Va caricato insieme a edit-museum.js nella pagina
// edit-museum.html; l'ordine relativo tra i due file non conta.
//
// NOTA: adoptAuthorCard() è stata rimossa in questo refactor perché morta:
// l'adozione della scheda autore/stile avviene già inline dentro
// saveWorkFromModal() (in edit-museum.js) al salvataggio dell'opera.

let currentFetchedAuthor = null;
let currentFetchedStyle = null;
let authorDataModalInstance = null;
let styleDataModalInstance = null;
let authorSearchTimeout = null;
let styleSearchTimeout = null;

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("authorDataModal")) authorDataModalInstance = new bootstrap.Modal(document.getElementById("authorDataModal"));
  if (document.getElementById("styleDataModal")) styleDataModalInstance = new bootstrap.Modal(document.getElementById("styleDataModal"));

  const authorInput = document.getElementById("work-author-search");
  if (authorInput) {
    authorInput.addEventListener("input", (e) => {
      const query = e.target.value.trim();

      if (query.length === 0) {
        hideAuthorDropdown();
        document.getElementById("author-cards-container").style.display = "none";
        document.getElementById("work-author-id").value = "";
        return;
      }

      clearTimeout(authorSearchTimeout);
      authorSearchTimeout = setTimeout(() => {
        fetchAuthors(query);
      }, 300);
    });
  }

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

// ==========================================
// MODULO RICERCA AUTORI (Fuzzy Search & Debounce)
// ==========================================

async function fetchAuthors(query) {  
  try {
    const res = await fetch(`${API_BASE_URL}/authors/search?q=${encodeURIComponent(query)}`);
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
      const authorDataInput = document.getElementById("work-author-data-id");
      authorDataInput.value = preselectedDataId;
      authorDataInput.dataset.original = preselectedDataId;

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
    bd: document.getElementById("author-bd").value.trim() || "Da definire",
    studies: document.getElementById("author-studies").value.trim() || "In elaborazione...",
    bio: document.getElementById("author-bio").value.trim() || "Generazione della biografia in corso...",
    mainWorks: "Generazione automatica in corso..."
  };

  try {
    let res;
    let finalAuthor; 

    if (newName && !existingAuthorId) {
      res = await fetch(`${API_BASE_URL}/authors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // BUG RISOLTO: Invio come oggetto puro, ci pensa il backend a farne un array
        body: JSON.stringify({ name: newName, data: payloadData }) 
      });
      if (!res.ok) throw new Error("Errore durante la creazione dell'autore");
      finalAuthor = await res.json();
      
    } else if (existingAuthorId) {
      res = await fetch(`${API_BASE_URL}/authors/${existingAuthorId}/data`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadData)
      });
      if (!res.ok) throw new Error("Errore durante l'aggiornamento dell'autore");
      finalAuthor = await res.json();
    }

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
            userDescription: payloadData.bio
          })
        });
      }

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
      const styleDataInput = document.getElementById("work-style-data-id");
      styleDataInput.value = preselectedDataId;
      styleDataInput.dataset.original = preselectedDataId;

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
    description: document.getElementById("style-description").value.trim() || "Generazione della definizione in corso..."
  };

  try {
    let res;
    let finalStyle; 

    if (newName && !existingStyleId) {
      // Creazione nuovo stile
      res = await fetch(`${API_BASE_URL}/styles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, data: [payloadData] })
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
      
      styleDataModalInstance.hide();
    }
  } catch (error) {
    alert(error.message);
    console.error(error);
  }
}

// ==========================================
// MODIFICA DATI ESISTENTI + GENERAZIONE AI (Autore/Stile)
// ==========================================

function editAuthorData(dataId) {
  if (!currentFetchedAuthor) return;
  const data = currentFetchedAuthor.data.find(d => d._id === dataId);
  if (!data) return;

  document.getElementById("new-author-name-input").value = ""; 
  document.getElementById("old-author-data-id").value = dataId; 
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

// 2. Genera e riempie tutti i campi dell'Autore
async function generateAuthorBioWithAI() {
  const bioTextarea = document.getElementById("author-bio");
  const authorName = currentFetchedAuthor ? currentFetchedAuthor.name : document.getElementById("new-author-name-input").value;
  const userContext = bioTextarea.value.trim();
  
  // Rimosso il prompt inutile per le mainWorks
  const prompt = `Crea scheda biografica per: "${authorName}". Appunti: "${userContext}". Istruzioni: 1. "bio": 2-3 paragrafi. 2. "bd": Date in formato "AAAA - AAAA". 3. "studies": Formazione. Restituisci SOLO un JSON valido: {"bio": "...", "bd": "...", "studies": "..."}. Non usare markdown.`;

  bioTextarea.value = "Compilazione scheda in corso...";
  try {
    const res = await fetch(`${API_BASE_URL}/ai/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
    if (res.ok) {
      const cleanText = (await res.json()).text.replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(cleanText);
      
      if(data.bd) document.getElementById("author-bd").value = data.bd;
      if(data.studies) document.getElementById("author-studies").value = data.studies;
      
      bioTextarea.value = data.bio || "";
    } else { 
      bioTextarea.value = "Errore API.";
    }
  } catch (e) { 
    bioTextarea.value = "Errore di parsing dati. Riprova."; 
    console.error(e); 
  }
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