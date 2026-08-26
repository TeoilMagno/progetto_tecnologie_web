// Stato globale della visita in creazione
let currentVisitCart = []; // Array che conterrà gli ID (o gli oggetti) delle opere
let currentMuseumId = null;
let editingVisitId = null;
let isCurrentVisitDraft = true;
let allMuseumWorks = [];
let allMuseumSections = [];
let currentQuiz = [];

document.addEventListener("DOMContentLoaded", async () => {
  // Inizializza il widget immagine
  initImageWidget("edit-visit-image-widget", "visit-image", "Scegli un'immagine di copertina per la visita");

  // inizializza il drag & drop
  const cartListElement = document.getElementById("visit-cart-list");

  // Ascoltatori per l'autosalvataggio sui campi di testo
  document
    .getElementById("visit-title")
    ?.addEventListener("input", triggerAutoSave);
  document
    .getElementById("visit-desc")
    ?.addEventListener("input", triggerAutoSave);

  if (cartListElement) {
    new Sortable(cartListElement, {
      handle: ".drag-handle",
      animation: 150,
      ghostClass: "sortable-ghost",
      onEnd: function (evt) {
        const movedItem = currentVisitCart.splice(evt.oldIndex, 1)[0];
        currentVisitCart.splice(evt.newIndex, 0, movedItem);
        console.log("Nuovo ordine della visita:", currentVisitCart);

        triggerAutoSave();
        triggerDurationUpdate();
      },
    });
  }

  const urlParams = new URLSearchParams(window.location.search);
  const preselectedMuseumId = urlParams.get("museumId");

  // Assegniamo la variabile globale
  editingVisitId = urlParams.get("editId") || urlParams.get("edit");

  if (preselectedMuseumId) {
    currentMuseumId = preselectedMuseumId;
    loadMuseumWorks(preselectedMuseumId);
  } else if (!editingVisitId) {
    showMuseumSelector();
  }

  await checkUserRole();

  // Inizializzazione barra di ricerca
  const searchContainer = document.getElementById("search-container");
  const searchToggleBtn = document.getElementById("search-toggle-btn");
  const searchInput = document.getElementById("catalog-search-input");

  if (searchToggleBtn && searchInput) {
    searchToggleBtn.addEventListener("click", () => {
      searchContainer.classList.toggle("active");
      if (searchContainer.classList.contains("active")) {
        searchInput.focus();
      } else {
        searchInput.value = "";
        // Se la barra viene chiusa, mostriamo di nuovo tutto il catalogo
        if (currentMuseumCatalog.length > 0) renderCatalog(currentMuseumCatalog);
      }
    });

    searchInput.addEventListener("input", (e) => {
      const query = e.target.value;
      if (!currentMuseumId || currentMuseumCatalog.length === 0) return; 
      
      // Filtriamo usando la fuzzySearch condivisa (Cerca per nome opera o nome autore)
      const filtered = currentMuseumCatalog.filter(work => 
        fuzzySearch(query, work.name) || 
        (work.author && fuzzySearch(query, work.author))
      );
      renderCatalog(filtered);
    });
  }

  // Gestione bozza
  if (editingVisitId) {
    try {
      const res = await fetch(`${API_BASE_URL}/visits/${editingVisitId}`);
      if (res.ok) {
        const responseData = await res.json();
        
        // Gestiamo in modo sicuro sia se l'API restituisce direttamente la visita, sia se la racchiude in { visit: ... }
        const draft = responseData.visit || responseData;

        // TRASFORMAZIONE CORRETTIVA: Convertiamo gli _id del DB in id per il carrello del front-end
        currentVisitCart = (draft.works || []).map((work) => ({
          id: work._id, // Prende il trattino basso e lo uniforma
          name: work.name,
        }));

        // Se la bozza ha già un museo associato, lo impostiamo
        // TODO: magari uniformare back end e front end?
        currentMuseumId = draft.museumId?._id || draft.museumId;

        renderVisitCart();

        // Ripristiniamo anche il select del ritmo (preferredLength) se presente
        if (draft.preferredLength) {
          const prefSelect = document.getElementById("visit-pref-length");
          if (prefSelect) prefSelect.value = draft.preferredLength;
        }

        // Ripristiniamo i minuti se erano stati impostati (> 0)
        if (draft.maxDuration && draft.maxDuration > 0) {
          const maxDurInput = document.getElementById("available-minutes-input");
          if (maxDurInput) maxDurInput.value = draft.maxDuration;
        }

        triggerDurationUpdate();

        // Popoliamo i campi
        document.getElementById("visit-title").value = draft.title || "";
        document.getElementById("visit-desc").value = draft.description || "";
        document.getElementById("visit-price").value = draft.price || "";
        document.getElementById("visit-public").checked = draft.isPublic || false;

        // Gestione immagine nel widget
        if (draft.image) {
          setFinalImage("visit-image", draft.image);
        } else {
          clearImageWidget("visit-image");
        }

        toggleCuratorDetails();

        isCurrentVisitDraft = draft.isDraft !== false;

        // Ripristino checkbox Target
        if (draft.targetAudience && draft.targetAudience.length > 0) {
          // Spegniamo prima il 'checked' di default su 'all'
          document.getElementById("targ-all").checked = false;
          draft.targetAudience.forEach(val => {
            const cb = document.querySelector(`.target-checkbox[value="${val}"]`);
            if (cb) cb.checked = true;
          });
        }
        
        // Ripristino checkbox Accessibilità
        if (draft.accessibility && draft.accessibility.length > 0) {
          draft.accessibility.forEach(val => {
            const cb = document.querySelector(`.acc-checkbox[value="${val}"]`);
            if (cb) cb.checked = true;
          });
        }

        const saveVisitBtn = document.getElementById("save-visit-btn");
        const saveDraftBtn = document.getElementById("save-draft-btn");

        if (isCurrentVisitDraft) {
          if (saveVisitBtn) saveVisitBtn.innerText = "Aggiorna Bozza";
          if (saveDraftBtn) saveDraftBtn.classList.remove("d-none");
        } else {
          if (saveVisitBtn) saveVisitBtn.innerText = "Aggiorna Visita";
          // Nascondiamo il tasto Salva Bozza se è una visita definitiva
          if (saveDraftBtn) saveDraftBtn.classList.add("d-none"); 
        }

        const deleteVisitBtn = document.getElementById("delete-visit-btn");
        if (deleteVisitBtn) {
          deleteVisitBtn.classList.remove("d-none");
          deleteVisitBtn.innerHTML = isCurrentVisitDraft ? '<i class="bi bi-trash me-1"></i> Elimina Bozza' : '<i class="bi bi-trash me-1"></i> Elimina Visita';
        }

        if (currentMuseumId) {
          loadMuseumWorks(currentMuseumId);
        }

        // recuperiamo il quiz se c'e'
        currentQuiz = draft.quiz || [];
        renderQuizBuilder();
      }
    } catch (e) {
      console.error("Errore nel caricamento della bozza", e);
    }
  }
});

// controlla se lo user e' un curatore o un visitatore
// controlla se lo user gestisce il museo attuale per sbloccare la pubblicazione
async function checkUserRole() {
  try {
    const response = await fetch(`${API_BASE_URL}/current-user`);
    if (response.ok) {
      const user = await response.json();

      // Sblocchiamo il pannello del quiz se è una guida (o teacher/admin)
      if (user?.type === "guide" || user?.type === "teacher" || user?.role === "admin") {
        const quizArea = document.getElementById("quiz-creation-area");
        quizArea?.classList.remove("d-none");
      }
      
      // Se è un admin, ha poteri assoluti ovunque
      if (user?.role === "admin") {
        document.getElementById("curator-options-area").classList.remove("d-none");
        return;
      }

      // Se è un curatore, sblocchiamo le opzioni SOLO se gestisce questo specifico museo
      if (user?.role === "curator") {
        const museumsRes = await fetch(`${API_BASE_URL}/my-museums`);
        
        if (museumsRes.ok) {
          const managedMuseums = await museumsRes.json();
          
          // Usiamo un interval perché se stiamo caricando una bozza, 
          // currentMuseumId potrebbe impiegare qualche millisecondo in più a valorizzarsi
          const checkInterval = setInterval(() => {
            if (currentMuseumId) {
              clearInterval(checkInterval); // Trovato l'ID, fermiamo il loop
              
              // Controlla se l'ID del museo in cui ci troviamo è nella lista dei suoi musei
              const isManaged = managedMuseums.some(m => (m._id || m).toString() === currentMuseumId.toString());
              
              if (isManaged) {
                // Bingo! È roba sua, sblocchiamo prezzo e pubblicazione
                document.getElementById("curator-options-area").classList.remove("d-none");
              } else {
                // Non è roba sua: il div resta invisibile (classe d-none)
                // e la visita verrà salvata forzatamente come privata e a prezzo 0.
                console.log("Creazione visita come visitatore standard (museo non gestito).");
              }
            }
          }, 100);
        }
      }
    }
  } catch (error) {
    console.error("Error checking user role:", error);
  }
}

// --------------------------------------------------------
// --- GESTIONE QUIZ ---
// --------------------------------------------------------

function renderQuizBuilder() {
  const container = document.getElementById("quiz-questions-container");
  if (!container) return; // Se l'HTML non ha l'area, esci.

  container.innerHTML = "";

  if (currentQuiz.length === 0) {
    container.innerHTML = `<p class="text-secondary small mb-3">Nessuna domanda inserita. Aggiungine una per creare un quiz finale.</p>`;
  }

  currentQuiz.forEach((q, qIndex) => {
    let optionsHtml = "";
    q.options.forEach((opt, optIndex) => {
      const isCorrect = q.correctAnswerIndex === optIndex;
      optionsHtml += `
        <div class="input-group mb-2">
          <div class="input-group-text bg-transparent border-secondary">
            <input class="form-check-input mt-0" type="radio" name="correctAnswer_${qIndex}" value="${optIndex}" ${isCorrect ? 'checked' : ''} onchange="updateQuizQuestion(${qIndex}, 'correctAnswerIndex', this.value)" aria-label="Risposta corretta">
          </div>
          <input type="text" class="form-control bg-transparent text-white border-secondary" placeholder="Opzione ${optIndex + 1}" value="${opt}" oninput="updateQuizQuestion(${qIndex}, 'option', this.value, ${optIndex})">
        </div>
      `;
    });

    container.innerHTML += `
      <div class="card custom-card p-3 mb-3 border-secondary bg-dark bg-opacity-25">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h6 class="text-info mb-0">Domanda ${qIndex + 1}</h6>
          <button type="button" class="btn btn-sm btn-outline-danger border-0 rounded-circle" onclick="removeQuizQuestion(${qIndex})" title="Rimuovi domanda">
            <i class="bi bi-trash"></i>
          </button>
        </div>
        <div class="mb-3">
          <input type="text" class="form-control bg-transparent text-white border-secondary" placeholder="Scrivi qui la domanda..." value="${q.question}" oninput="updateQuizQuestion(${qIndex}, 'question', this.value)">
        </div>
        <div>
          <label class="form-label small text-secondary">Opzioni (seleziona quella corretta):</label>
          ${optionsHtml}
        </div>
      </div>
    `;
  });
}

function addQuizQuestion() {
  currentQuiz.push({
    question: "",
    options: ["", "", "", ""], // 4 opzioni di default
    correctAnswerIndex: 0 // La prima corretta di default
  });
  renderQuizBuilder();
  triggerAutoSave();
}

function removeQuizQuestion(index) {
  currentQuiz.splice(index, 1);
  renderQuizBuilder();
  triggerAutoSave();
}

function updateQuizQuestion(qIndex, field, value, optIndex = null) {
  if (field === 'question') {
    currentQuiz[qIndex].question = value;
  } else if (field === 'correctAnswerIndex') {
    currentQuiz[qIndex].correctAnswerIndex = parseInt(value);
  } else if (field === 'option' && optIndex !== null) {
    currentQuiz[qIndex].options[optIndex] = value;
  }
  triggerAutoSave();
}

// --------------------------------------------------------

async function loadMuseumWorks(museumId) {
  const catalogArea = document.getElementById("works-catalog-area");
  const museumNameLabel = document.getElementById("current-museum-name");

  catalogArea.innerHTML = `<div class="col-12 text-center mt-4"><div class="spinner-border text-info"></div></div>`;

  try {
    // 1. Fetch works
    const worksRes = await fetch(`${API_BASE_URL}/museums/${museumId}/works`);
    allMuseumWorks = await worksRes.json();

    // 2. Fetch sections
    try {
      const sectionsRes = await fetch(`${API_BASE_URL}/museums/${museumId}/sections`);
      allMuseumSections = await sectionsRes.json();
    } catch (e) {
      console.warn("Impossibile caricare le sezioni per il raggruppamento:", e);
      allMuseumSections = [];
    }

    museumNameLabel.innerText = "Catalogo caricato";

    renderCatalog();
  } catch (error) {
    console.error("Dettaglio errore intercettato:", error);
    catalogArea.innerHTML = `<p class="text-danger">Errore nel caricamento delle opere.</p>`;
  }
}

function renderCatalog() {
  const catalogArea = document.getElementById("works-catalog-area");
  if (!catalogArea) return;

  if (allMuseumWorks.length === 0) {
    catalogArea.innerHTML = `<p class="text-secondary col-12">Questo museo non ha ancora opere disponibili.</p>`;
    return;
  }

  // Costruisci mappa roomId -> { roomName, sectionName, sectionImage }
  const roomMap = {};
  allMuseumSections.forEach(section => {
    const secName = section.name;
    const secImg = section.image || "/img/fallback-section.jpg";
    if (section.rooms) {
      section.rooms.forEach(room => {
        roomMap[room._id] = {
          roomName: room.name,
          sectionName: secName,
          sectionImage: secImg
        };
      });
    }
  });

  // Raggruppa le opere per Sezione e poi per Stanza
  const groups = {}; // { sectionName: { sectionImage, rooms: { roomName: [works...] } } }

  allMuseumWorks.forEach(work => {
    const roomInfo = roomMap[work.roomId];
    const secName = roomInfo ? roomInfo.sectionName : "Opere non collocate";
    const secImg = roomInfo ? roomInfo.sectionImage : "/img/fallback-section.jpg";
    const roomName = roomInfo ? roomInfo.roomName : "Senza stanza";

    if (!groups[secName]) {
      groups[secName] = {
        sectionImage: secImg,
        rooms: {}
      };
    }

    if (!groups[secName].rooms[roomName]) {
      groups[secName].rooms[roomName] = [];
    }

    groups[secName].rooms[roomName].push(work);
  });

  catalogArea.innerHTML = "";

  // Renderizza ogni gruppo di sezione
  Object.keys(groups).forEach(secName => {
    const group = groups[secName];
    const roomKeys = Object.keys(group.rooms);
    
    let sectionHtml = `
      <div class="col-12 mb-4">
        <div class="glass-panel p-3 position-relative overflow-hidden" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;">
          <h4 class="text-info mb-3 border-bottom border-secondary border-opacity-25 pb-2" style="font-size: 1.15rem;">
            <i class="bi bi-tag-fill me-2"></i>${secName}
          </h4>
          
          <!-- Foto della sezione in basso a destra, fusa con lo sfondo -->
          <div style="position: absolute; bottom: 10px; right: 10px; width: 80px; height: 80px; opacity: 0.15; pointer-events: none; border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
            <img src="${group.sectionImage}" style="width: 100%; height: 100%; object-fit: cover;">
          </div>

          <div class="row g-3">
    `;

    roomKeys.forEach(roomName => {
      const worksInRoom = group.rooms[roomName];
      sectionHtml += `
        <div class="col-12 mb-1">
          <h5 class="text-secondary small mb-2" style="font-size: 0.8rem;"><i class="bi bi-door-open me-1"></i> Stanza: ${roomName}</h5>
          <div class="row row-cols-1 row-cols-md-2 g-2">
      `;

      worksInRoom.forEach(work => {
        const workImage = work.image || "/img/fallback-work.jpg";
        const workAuthor = work.author || "Autore sconosciuto";
        const isAdded = currentVisitCart.some(item => item.id === work._id);

        let buttonHtml = "";
        if (isAdded) {
          buttonHtml = `
            <button class="btn btn-sm btn-success mt-auto w-100" disabled style="background-color: rgba(16, 185, 129, 0.2); border-color: #10b981; color: #10b981;">
              <i class="bi bi-check-lg"></i> Già aggiunto
            </button>
          `;
        } else {
          buttonHtml = `
            <button class="btn btn-sm btn-outline-light mt-auto w-100" onclick="addToVisit('${work._id}', '${work.name.replace(/'/g, "\\'")}')">
              <i class="bi bi-plus"></i> Aggiungi alla visita
            </button>
          `;
        }

        sectionHtml += `
          <div class="col">
            <div class="card custom-card h-100" style="background: rgba(255,255,255,0.01); border-color: rgba(255,255,255,0.05);">
              <div class="row g-0 h-100">
                <div class="col-4">
                  <img src="${workImage}" class="img-fluid rounded-start h-100" style="object-fit: cover; min-height: 100px; width: 100%;">
                </div>
                <div class="col-8">
                  <div class="card-body p-2 d-flex flex-column h-100">
                    <h6 class="card-title mb-1 text-truncate" style="font-size: 0.85rem; color: #fff;">${work.name}</h6>
                    <p class="small text-secondary mb-2" style="font-size: 0.72rem;">${workAuthor}</p>
                    ${buttonHtml}
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      });

      sectionHtml += `
          </div>
        </div>
      `;
    });

    sectionHtml += `
          </div>
        </div>
      </div>
    `;

    catalogArea.innerHTML += sectionHtml;
  });
}

async function showMuseumSelector() {
  const catalogArea = document.getElementById("works-catalog-area");
  const museumNameLabel = document.getElementById("current-museum-name");

  museumNameLabel.innerText = "Scelta del museo";
  
  // INIETTIAMO IL TAG SELECT VUOTO INVECE DEI BOTTONI!
  catalogArea.innerHTML = `
    <div class="col-12 mt-4">
        <p class="text-white mb-3">Seleziona il museo in cui vuoi creare la tua visita:</p>
        <select id="museum-target-select" placeholder="Cerca il museo o la città..."></select>
    </div>
  `;

  try {
    const res = await fetch(`${API_BASE_URL}/museums`);
    const museums = await res.json();

    // Ora Tom Select troverà il tag e lo trasformerà!
    new TomSelect("#museum-target-select", {
      valueField: '_id',
      labelField: 'name',
      searchField: ['name', 'address'],
      options: museums,
      render: {
        option: function(data, escape) {
          return `
            <div class="d-flex flex-column p-2">
              <span class="fw-bold"><i class="bi bi-bank me-2 text-info"></i>${escape(data.name)}</span>
              <span class="small text-secondary ms-4">${escape(data.address || '')}</span>
            </div>`;
        },
        item: function(data, escape) {
          return `<div class="fw-bold">${escape(data.name)}</div>`;
        }
      },
      onChange: function(selectedId) {
        if (selectedId) {
          window.location.replace(`/create-visit?museumId=${selectedId}`);
        }
      }
    });

  } catch (error) {
    console.error("Motivo errore:", error);
    catalogArea.innerHTML = `<p class="text-danger">Errore nel caricamento dei musei.</p>`;
  }
}

function addToVisit(workId, workName) {
  if (currentVisitCart.some((work) => work.id === workId)) {
    alert("Quest'opera è già nella tua visita!");
    return;
  }
  currentVisitCart.push({ id: workId, name: workName });
  renderVisitCart();

  triggerAutoSave();
  triggerDurationUpdate();
}

function removeFromVisit(workId) {
  currentVisitCart = currentVisitCart.filter((work) => work.id !== workId);
  renderVisitCart();

  triggerAutoSave();
  triggerDurationUpdate();
}

function renderVisitCart() {
  const cartList = document.getElementById("visit-cart-list");
  const emptyMsg = document.getElementById("empty-cart-msg");
  const saveBtn = document.getElementById("save-visit-btn");

  cartList.innerHTML = "";

  if (currentVisitCart.length === 0) {
    emptyMsg.classList.remove("d-none");
    saveBtn.classList.add("disabled");
    if (typeof renderCatalog === "function" && allMuseumWorks.length > 0) {
      renderCatalog();
    }
    return;
  }

  emptyMsg.classList.add("d-none");
  saveBtn.classList.remove("disabled");

  currentVisitCart.forEach((item) => {
    cartList.innerHTML += `
            <li class="list-group-item bg-transparent text-white d-flex justify-content-between align-items-center border-secondary border-opacity-25" data-id="${item.id}">
                <div class="d-flex align-items-center">
                    <i class="bi bi-list drag-handle text-secondary me-3 fs-5"></i>
                    <span class="text-truncate" style="max-width: 180px;">${item.name}</span>
                </div>
                <button class="btn btn-sm btn-outline-danger border-0 rounded-circle" onclick="removeFromVisit('${item.id}')">
                    <i class="bi bi-x-lg"></i>
                </button>
            </li>
        `;
  });

  if (typeof renderCatalog === "function" && allMuseumWorks.length > 0) {
    renderCatalog();
  }
}

// Aggiunto il parametro isSavingAsDraft (di default false)
async function submitVisit(isSavingAsDraft = false) {
  clearTimeout(autoSaveTimeout); // evita race conditions con il timer dell'auto-save

  if (currentVisitCart.length === 0) {
    alert("Devi aggiungere almeno un'opera alla tua visita!");
    return;
  }
  if (!currentMuseumId) {
    alert("Errore critico: Nessun museo selezionato.");
    return;
  }

  const titleInput = document.getElementById("visit-title");
  if (!titleInput || !titleInput.value.trim()) {
    alert("Il titolo della visita è obbligatorio.");
    return;
  }

  const description = document.getElementById("visit-desc")?.value || "";
  const imageUrl = document.getElementById("visit-image")?.value || "";
  const priceInput = document.getElementById("visit-price");
  const price =
    priceInput && priceInput.value ? parseFloat(priceInput.value) : 0;

  const publicCheckbox = document.getElementById("visit-public");

  const prefLength = document.getElementById("visit-pref-length")?.value || 'medium';
  const maxDurInput = document.getElementById("available-minutes-input")?.value;
  const maxDurationValue = maxDurInput ? parseInt(maxDurInput) : 0;

  // Recuperiamo il numero di minuti dal badge (es. "45 min" -> 45)
  const durationBadgeText = document.getElementById("tour-duration-badge")?.innerText || "0";
  const durationNum = parseInt(durationBadgeText) || 0;

  // LA MAGIA DEI 3 STATI:
  // Se premo "Salva Bozza", forziamo isPublic a false.
  // Altrimenti, dipende dalla spunta della checkbox.
  const isPublic = isSavingAsDraft
    ? false
    : publicCheckbox
      ? publicCheckbox.checked
      : false;
  const isDraft = isSavingAsDraft;

  const workIds = currentVisitCart.map((work) => work.id);

  // Raccogli Array di Target Audience
  const targetCheckboxes = document.querySelectorAll('.target-checkbox:checked');
  let targets = Array.from(targetCheckboxes).map(cb => cb.value);
  if (targets.length === 0) targets = ['all']; // Default fallback

  // Raccogli Array di Accessibilità
  const accCheckboxes = document.querySelectorAll('.acc-checkbox:checked');
  let accessibilities = Array.from(accCheckboxes).map(cb => cb.value);
  if (accessibilities.length === 0) accessibilities = ['none']; // Default fallback

  const payload = {
    title: titleInput.value.trim(),
    description: description,
    coverImage: imageUrl,
    museumId: currentMuseumId,
    works: workIds,
    duration: durationNum,
    maxDuration: maxDurationValue,
    preferredLength: prefLength,
    isDraft: isDraft,
    isPublic: isPublic,
    quiz: currentQuiz
  };

  // Aggiungiamo i campi del marketplace SOLO se la visita è pubblica (o se l'utente li vuole abilitare)
  if (isPublic) {
    payload.price = price;
    payload.targetAudience = targets;
    payload.accessibility = accessibilities;
  }

  const submitBtn = document.getElementById("confirm-save-visit-btn");
  const draftBtn = document.getElementById("save-draft-btn");

  // Animazione di caricamento sul bottone cliccato
  if (submitBtn && draftBtn) {
    if (isSavingAsDraft) {
      draftBtn.innerHTML =
        '<span class="spinner-border spinner-border-sm"></span> Salvataggio...';
    } else {
      submitBtn.innerHTML =
        '<span class="spinner-border spinner-border-sm"></span> Salvataggio...';
    }
    submitBtn.disabled = true;
    draftBtn.disabled = true;
  }

  const method = editingVisitId ? "PUT" : "POST";
  const endpoint = editingVisitId
    ? `${API_BASE_URL}/visits/${editingVisitId}`
    : `${API_BASE_URL}/visits`;

  try {
    const response = await fetch(endpoint, {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Errore dal server durante il salvataggio.",
      );
    }

    // Recuperiamo l'ID univoco della visita (sia in caso di modifica che di nuova creazione)
    const finalVisitId = editingVisitId || (data.visit ? data.visit._id : data._id);

    currentVisitCart = [];
    localStorage.setItem("visitsChanged", "true");

    if (isSavingAsDraft) {
      alert("Bozza salvata con successo!");
      window.location.replace("/my-visits"); // Le bozze rimangono nella lista "Le mie visite"
    } else {
      alert(
        isPublic
          ? "Visita pubblicata sul Marketplace!"
          : "Visita privata salvata con successo!"
      );
      // Reindirizza direttamente alla pagina di dettaglio della visita creata/modificata!
      window.location.replace(`/visit-details?id=${finalVisitId}`);
    }
  } catch (error) {
    console.error("Errore salvataggio:", error);
    alert(error.message);

    // Ripristino bottoni in caso di errore
    if (submitBtn && draftBtn) {
      draftBtn.innerHTML =
        '<i class="bi bi-pencil-square me-1"></i> Salva Bozza';
      submitBtn.innerHTML = "Salva Definitivo";
      submitBtn.disabled = false;
      draftBtn.disabled = false;
    }
  }
}

// --- autosalvataggio ---
let autoSaveTimeout = null;

function triggerAutoSave() {
  clearTimeout(autoSaveTimeout);

  // Attendi 2 secondi dall'ultimo click o dall'ultima lettera digitata
  autoSaveTimeout = setTimeout(() => {
    autoSaveDraft();
  }, 2000);
}

async function autoSaveDraft() {
  // blocca l'autosalvataggio se la visita è definitiva (pubblica o privata) -> impedisce di caricare sul marketplace dati non definitivi
  if (!isCurrentVisitDraft) return;

  // Se non c'è un museo, non possiamo collegare la visita a nulla
  if (!currentMuseumId) return;

  const titleInput = document.getElementById("visit-title")?.value.trim() || "Bozza in corso...";
  const descInput = document.getElementById("visit-desc")?.value.trim() || "";
  const imageUrl = document.getElementById("visit-image")?.value || "";
  const price = parseFloat(document.getElementById("visit-price")?.value) || 0;

  // CONDIZIONE: Se il carrello è vuoto E non ha scritto né titolo né descrizione, FERMATI.
  if (currentVisitCart.length === 0 && !titleInput && !descInput) {
    return;
  }

  const prefLength = document.getElementById("visit-pref-length")?.value || 'medium';
  const maxDurInput = document.getElementById("available-minutes-input")?.value;
  const maxDurationValue = maxDurInput ? parseInt(maxDurInput) : 0;
  const durationBadgeText = document.getElementById("tour-duration-badge")?.innerText || "0";
  const durationNum = parseInt(durationBadgeText) || 0;

  const payload = {
    title: titleInput, 
    description: descInput,
    coverImage: imageUrl,
    museumId: currentMuseumId,
    works: currentVisitCart.map((work) => work.id),
    price: price,
    isPublic: false,
    isDraft: true, // È sempre una bozza
    duration: durationNum,
    maxDuration: maxDurationValue,
    preferredLength: prefLength,
    quiz: currentQuiz
  };

  const method = editingVisitId ? "PUT" : "POST";
  const endpoint = editingVisitId
    ? `${API_BASE_URL}/visits/${editingVisitId}`
    : `${API_BASE_URL}/visits`;

  try {
    const response = await fetch(endpoint, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();

      // Se era la PRIMA volta che salvavamo in automatico (POST)...
      // CORREZIONE: Andiamo a leggere l'ID dentro data.visit._id !
      if (!editingVisitId && data.visit && data.visit._id) {
        editingVisitId = data.visit._id; // Aggiorniamo la variabile globale!

        // Aggiorniamo l'URL in alto senza ricaricare la pagina
        window.history.replaceState(
          null,
          "",
          `/create-visit?editId=${editingVisitId}`,
        );
      }

      localStorage.setItem("visitsChanged", "true");

      console.log(
        "Bozza salvata/aggiornata in automatico alle:",
        new Date().toLocaleTimeString(),
      );
    }
  } catch (error) {
    console.error("Errore nell'autosalvataggio in background", error);
  }
}

// funzione per eliminare definitivamente la visita/bozza
async function deleteVisit() {
  if (!editingVisitId) return; // Se non stiamo modificando nulla, esci
  
  const confirmMsg = isCurrentVisitDraft 
    ? "Sei sicuro di voler eliminare questa bozza?" 
    : "Attenzione: sei sicuro di voler eliminare definitivamente questa visita? Verrà rimossa dal marketplace.";
    
  const isConfirmed = await window.showCustomConfirm("Conferma Eliminazione", confirmMsg);
  if (!isConfirmed) return;

  try {
    const response = await fetch(`${API_BASE_URL}/visits/${editingVisitId}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      alert("Eliminata con successo.");
      
      // Resettiamo il localStorage per forzare il refresh nella pagina "Le mie visite"
      localStorage.setItem("visitsChanged", "true");
      
      // Disattiviamo il timer di autosalvataggio per evitare che resusciti la bozza!
      clearTimeout(autoSaveTimeout); 
      
      window.location.href = "/my-visits";
    } else {
      const data = await response.json();
      alert(data.error || "Errore durante l'eliminazione.");
    }
  } catch (error) {
    console.error("Errore eliminazione:", error);
    alert("Errore di connessione con il server.");
  }
}

// Funzione chiamata dal menu a tendina o dai cambiamenti del carrello
function triggerDurationUpdate() {
  const currentPrefLength = document.getElementById("visit-pref-length")?.value || 'medium';
  // Estraiamo solo gli ID dal carrello attuale
  const workIds = currentVisitCart.map(work => work.id);
  
  updateUIEstimatedDuration(workIds, currentPrefLength);
}

// Chiamata API vera e propria
async function updateUIEstimatedDuration(workIds, currentPrefLength) {
  const durationBadge = document.getElementById("tour-duration-badge");
  if (!durationBadge) return;

  if (workIds.length === 0) {
    durationBadge.innerText = "0 min";
    return;
  }

  durationBadge.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span>`;

  try {
    const response = await fetch(`${API_BASE_URL}/visits/estimate-duration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workIds, preferredLength: currentPrefLength })
    });
    
    if (response.ok) {
      const data = await response.json();
      durationBadge.innerText = `${data.duration} min`;
    }
  } catch (error) {
    console.error("Impossibile calcolare il tempo stimato:", error);
    durationBadge.innerText = "Errore";
  }
}

// Funzione che calcola l'approfondimento ideale in base al tempo
async function autoSelectLength() {
  const minutesInput = document.getElementById("available-minutes-input").value;
  const availableMinutes = parseInt(minutesInput);

  if (!availableMinutes || availableMinutes <= 0) {
    alert("Inserisci un numero di minuti valido.");
    return;
  }

  const workIds = currentVisitCart.map(work => work.id);
  if (workIds.length === 0) {
    alert("Aggiungi prima qualche opera al tuo percorso!");
    return;
  }

  const btn = document.querySelector("button[onclick='autoSelectLength()']");
  const originalText = btn.innerText;
  btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;

  try {
    const response = await fetch(`${API_BASE_URL}/visits/recommend-length`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workIds, availableMinutes })
    });

    if (response.ok) {
      const data = await response.json();
      
      // 1. Modifichiamo visivamente la tendina per selezionare la voce consigliata
      const selectEl = document.getElementById("visit-pref-length");
      if (selectEl) {
        selectEl.value = data.recommendedLength;
        
        // Aggiungiamo un piccolo effetto visivo per far notare il cambiamento
        selectEl.classList.add("border-success", "text-success");
        setTimeout(() => selectEl.classList.remove("border-success", "text-success"), 1500);
      }
      
      // 2. Scateniamo l'aggiornamento del calcolatore della durata (il badge azzurro)
      triggerDurationUpdate();
    }
  } catch (error) {
    console.error("Errore durante il calcolo del ritmo:", error);
  } finally {
    btn.innerText = originalText;
  }
}

// Mostra/nasconde i dettagli curatore (es. prezzo) in base alla spunta
function toggleCuratorDetails() {
  const isPublic = document.getElementById("visit-public").checked;
  const detailsArea = document.getElementById("curator-details-area");
  
  if (detailsArea) {
    if (isPublic) {
      detailsArea.classList.remove("d-none");
    } else {
      detailsArea.classList.add("d-none");
    }
  }
}

// Logica interruttore per il "Pubblico Consigliato"
function handleTargetSelection(clickedCheckbox) {
  const targetAll = document.getElementById("targ-all");
  // Recuperiamo tutte le checkbox TRANNE quella "Per Tutti"
  const specificCheckboxes = Array.from(document.querySelectorAll('.target-checkbox')).filter(cb => cb.id !== 'targ-all');

  // Caso 1: L'utente ha cliccato proprio su "Per Tutti"
  if (clickedCheckbox.id === "targ-all") {
    if (clickedCheckbox.checked) {
      // Se lo spunta, togliamo la spunta a tutti gli altri
      specificCheckboxes.forEach(cb => cb.checked = false);
    } else {
      // Se prova a togliere la spunta a "Per tutti" ma gli altri sono vuoti, 
      // la rimettiamo per forza per impedire di avere zero target
      const anySpecificChecked = specificCheckboxes.some(cb => cb.checked);
      if (!anySpecificChecked) {
        clickedCheckbox.checked = true;
      }
    }
  } 
  // Caso 2: L'utente ha cliccato su una categoria specifica (Bambini, Famiglie, ecc.)
  else {
    if (clickedCheckbox.checked) {
      // Se spunta una categoria, "Per Tutti" si spegne
      targetAll.checked = false;
    } else {
      // Se toglie la spunta, controlliamo se ne sono rimaste altre accese
      const anySpecificChecked = specificCheckboxes.some(cb => cb.checked);
      // Se ha spento tutto, si riaccende automaticamente "Per Tutti"
      if (!anySpecificChecked) {
        targetAll.checked = true;
      }
    }
  }
}