//INIZIALIZZAZIONE
document.addEventListener("DOMContentLoaded", async () => {
  //estraggo il museumId dal URI della pagina
  const pathName = window.location.pathname; 
  // Divide la stringa in un array usando la barra "/" come separatore
  const pathSegments = pathName.split('/'); 
  // pathSegments sarà: ["", "museums", "12345", "upload-map", ""]
  // L'ID si trova all'indice 2
  const museumId = pathSegments[2];

  loadSections(museumId);
});

//scarica i dati del museo da mostrare come reference durante l'inserimento dati
async function loadSections (museumId) {
  let sections = [];
  let works = [];
  try {
    const responseSection = await fetch(`/api/museums/${museumId}/sections`);
    if (!responseSection.ok) throw new Error("Errore server");
    sections = await responseSection.json();

    const responseWork = await fetch(`/api/museums/${museumId}/works`);
    if (!responseWork.ok) throw new Error("Errore server");
    works = await responseWork.json();
    
    createForm(sections, works);

  } catch (error) {
    console.error("Errore nella richiesta dei dati", error);
  }
}

let roomCount = 0;

//crea il form per l'inserimento dati
async function createForm(sections, works) {
  //creo un dizionario da usare dopo
  const worksDict = {};
  for (const w of works) {
    worksDict[w._id] = w; // coppie [id] : oggetto work
  }

  const container = document.getElementById("mapForm");
  
  // creo un frammento di documento, non ancora visibile
  const fragment = document.createDocumentFragment();

  for (let s of sections) {
    //creo un array completo dei lavori contenuti nella sezione s
    const fullWorks = (s.works || [])
      .map(item => worksDict[item.work])
      .filter(w => w !== undefined); // Scarta eventuali opere non trovate;

    const sectionDiv = document.createElement("div");
    sectionDiv.className = "section-block glass-panel section-block-aura mb-4 position-relative row g-3";
    sectionDiv.id = `${s._id}`;
    sectionDiv.innerHTML = `
    <h4 class="h6 mb-3">Sezione ${s.name}</h4>

    <div class="row">
      <div class="col-md-6">
        <img src="${s.image}" alt="${s.name}" class="img-fluid">
      </div>
    </div>
    <div class="row">
      <div class="col-md-6">
        <label class="form-label-aura">Forma della sezione</label>
        <select name="sectionShape[]" class="form-select shape-select">
          <option value="none">Nessuna</option>
          <option value="polygon">Polygon</option>
          <option value="polyline">Polyline</option>
        </select>
      </div>

      <!-- Contenitore per i points, nascosto di default -->
      <div class="col-md-6 inputs-container d-none">
        <div class="points-wrapper">
          <label class="form-label-aura">Points</label>
          <input type="text" name="sectionPoints[]" class="form-control input-aura">
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col-md-6">
        <label class="form-label-aura">Colore della sezione (HEX)</label>
        <input type="text" name="sectionColor[]" class="form-control input-aura" placeholder="Es: #afda62" required>
      </div>
    </div>

    <!-- Contenitore per le opere -->
    <div id="works-container-${s._id}" class="mb-3"></div>

    <!-- Contenitore per le stanze -->
    <div id="room-container-${s._id}" class="mb-3"></div>
    <button type="button" class="btn btn-sm btn-outline-info" onclick="renderAddRoom('${s._id}')">
      <i class="bi bi-plus-circle me-1"></i>Aggiungi Stanza
    </button>
  `;

    // --- LOGICA EVENT LISTENER ---
    const selectNode = sectionDiv.querySelector('.shape-select');
    const inputsContainer = sectionDiv.querySelector('.inputs-container');
    const pointsInput = sectionDiv.querySelector('input[name="points[]"]');

    selectNode.addEventListener('change', (e) => {
      const shape = e.target.value;
      if (shape === 'none') {
        inputsContainer.classList.add('d-none');
        pointsInput.required = false;
      } else {
        inputsContainer.classList.remove('d-none');
        pointsInput.required = true;
      }
    });

    const worksContainer = sectionDiv.querySelector(`#works-container-${s._id}`);

    for (const w of fullWorks) {
      const workDiv = document.createElement("div");
      workDiv.className = "work-block glass-panel work-block-aura p-3 mt-3 position-relative row g-3";
      workDiv.id = `${w._id}`
      workDiv.innerHTML = `
        <h4 class="h6 text-info mb-3">${w.name}</h4>
        
        <div class="row g-2 mb-3">
          <div class="col-md-6">
            <label class="form-label-aura">Coordinate X:</label>
            <input type="text" name="x" class="form-control input-aura" required>
          </div>
          <div class="col-md-6">
            <label class="form-label-aura">Coordinate Y:</label>
            <input type="text" name="y" class="form-control input-aura" required>
          </div>
        </div>
      `;
    
      worksContainer.appendChild(workDiv);
    }

    fragment.appendChild(sectionDiv);
  }

  container.prepend(fragment);
}

async function renderAddRoom(sectionId) {
  const roomContainer = document.getElementById(`room-container-${sectionId}`);
  roomCount++;
  const roomDiv = document.createElement('div');

  roomDiv.className = "room-block glass-panel room-block-aura p-3 mb-3 position-relative";
  roomDiv.id = `room-${roomCount}`;

  roomDiv.innerHTML = `
    <button type="button" onclick="this.parentElement.remove()" class="btn-close btn-close-white btn-sm position-absolute end-0 top-0 m-2"></button>

    <h4 class="h6 text-info mb-3">Stanza ${roomCount}</h4>
    
    <div class="row g-2 mb-3">
      <div class="col-md-6">
        <label class="form-label-aura">Nome stanza</label>
        <input type="text" name="roomName[${sectionId}][]" class="form-control input-aura" required>
      </div>
    </div>

    <div class="row">
      <div class="col-md-6">
        <label class="form-label-aura">Forma della stanza</label>
        <select class="form-select shape-select">
          <option value="none">Nessuna</option>
          <option value="polygon">Polygon</option>
          <option value="polyline">Polyline</option>
          <option value="path">Path</option>
        </select>
      </div>

      <div class="col-md-6 inputs-container d-none">
        <div class="points-wrapper d-none">
          <label class="form-label-aura">Points</label>
          <input type="text" name="roomPoints[${sectionId}][]" class="form-control input-aura">
        </div>

        <div class="d-wrapper d-none">
          <label class="form-label-aura">d (Path)</label>
          <input type="text" name="roomD[${sectionId}][]" class="form-control input-aura">
        </div>
      </div>
    </div>
  `;

  // --- LOGICA EVENT LISTENER STANZA ---
  const selectNode = roomDiv.querySelector('.shape-select');
  const inputsContainer = roomDiv.querySelector('.inputs-container');
  const pointsWrapper = roomDiv.querySelector('.points-wrapper');
  const dWrapper = roomDiv.querySelector('.d-wrapper');
  const pointsInput = roomDiv.querySelector('input[name^="roomPoints"]');
  const dInput = roomDiv.querySelector('input[name^="roomD"]');

  selectNode.addEventListener('change', (e) => {
    const shape = e.target.value;

    inputsContainer.classList.add('d-none');
    pointsWrapper.classList.add('d-none');
    dWrapper.classList.add('d-none');
    pointsInput.required = false;
    dInput.required = false;

    if (shape === 'polygon' || shape === 'polyline') {
      inputsContainer.classList.remove('d-none');
      pointsWrapper.classList.remove('d-none');
      pointsInput.required = true;
    } 
    else if (shape === 'path') {
      inputsContainer.classList.remove('d-none');
      dWrapper.classList.remove('d-none');
      dInput.required = true;
    }
  });
  
  roomContainer.appendChild(roomDiv);
}

async function mapHandleSave(event) {
  if (event) event.preventDefault();

  //estraggo il museumId dal URI della pagina
  const pathName = window.location.pathname; 
  // Divide la stringa in un array usando la barra "/" come separatore
  const pathSegments = pathName.split('/'); 
  // pathSegments sarà: ["", "museums", "12345", "upload-map", ""]
  // L'ID si trova all'indice 2
  const museumId = pathSegments[2];

  const form = document.querySelector("form");
  if (!form) return;
  const formData = new FormData(form);

  const payload = {
    id: museumId,
    sections : [],
  };
  
  const sectionElements = document.querySelectorAll(".section-block");
  console.log("Sectionelements length: ", sectionElements.length);

  for (const sectionEl of sectionElements) {
    //prendo la shape della sezione e controllo che non sia none
    const sectionShapeSelect = sectionEl.querySelector('.shape-select');
    const sectionShapeInput = sectionShapeSelect.value;

    // --- CONTROLLO VALIDITÀ ---
    if (sectionShapeInput === 'none') {
      alert("Attenzione: devi selezionare una forma valida per tutte le sezioni!");
      
      sectionShapeSelect.classList.add('is-invalid');
      sectionShapeSelect.focus();
      
      return; 
    } else {
      // Se era rosso per un errore precedente, togliamo il rosso
      sectionShapeSelect.classList.remove('is-invalid');
    }

    //color e punti della shape
    const sectionColorInput = sectionEl.querySelector('input[name="sectionColor[]"]');
    const sectionPointsInput = sectionEl.querySelector('input[name="sectionPoints[]"]');
    
    const sectionShapeObject = {
      type: sectionShapeInput, // Sarà 'polygon' o 'polyline'
      points: sectionPointsInput.value
    };

    //coordinate X e Y di ogni work
    const sectionWorksArray = [];
    const workElements = sectionEl.querySelectorAll(".work-block");

    for (const workEl of workElements) {
      const workId = workEl.id;

      const xInput = workEl.querySelector('input[name="x"]').value;
      const yInput = workEl.querySelector('input[name="y"]').value;

      //mongoose si aspetta dei numeri dal modello definito, facciamo un cast da stringa a float
      const xValue = parseFloat(xInput);
      const yValue = parseFloat(yInput);

      if (isNaN(xValue) || isNaN(yValue)) {
        alert("Attenzione: Inserisci delle coordinate valide (numeri) per le opere.");
        return;
      }

      //prepariamo l'oggetto finale delle opere
      sectionWorksArray.push({
        workId: workId,
        x: xValue,
        y: yValue
      });
    }

    //prendiamo i dati delle rooms
    const sectionRoomsArray = [];
    const roomElements = sectionEl.querySelectorAll(".room-block");

    for (const roomEl of roomElements) {
      //Recupero il nome della stanza (*= significa che contiene ciò che seque)
      const roomNameInput = roomEl.querySelector('input[name*="roomName"]');
      const roomName = roomNameInput.value.trim();

      if (!roomName) {
        alert("Attenzione: Inserisci il nome per tutte le stanze.");
        roomNameInput.classList.add('is-invalid');
        roomNameInput.focus();
        return;
      } else {
        roomNameInput.classList.remove('is-invalid');
      }

      const shapeSelect = roomEl.querySelector('.shape-select');
      const shapeType = shapeSelect.value;

      if (shapeType === 'none') {
        alert(`Attenzione: Seleziona una forma valida per la stanza "${roomName}".`);
        shapeSelect.classList.add('is-invalid');
        shapeSelect.focus();
        return;
      } else {
        shapeSelect.classList.remove('is-invalid');
      }

      //Costruisco il sotto-oggetto 'shape' definito dallo schema mongoose
      const shapeObject = {
        type: shapeType
      };

      //Popolo solo il campo necessario in base alla forma scelta
      if (shapeType === 'polygon' || shapeType === 'polyline') {
        const pointsInput = roomEl.querySelector('input[name*="roomPoints"]');
        shapeObject.points = pointsInput.value;
      } else if (shapeType === 'path') {
        const dInput = roomEl.querySelector('input[name*="roomD"]');
        shapeObject.d = dInput.value;
      }

      sectionRoomsArray.push({
        name: roomName,
        shape: shapeObject
      });
    }


    payload.sections.push({
      _id: sectionEl.id,
      color: sectionColorInput.value,
      works: sectionWorksArray,
      rooms: sectionRoomsArray,
      shape: sectionShapeObject,
    });
  }

  console.log("Payload totale pronto per l'invio:", payload);

  try {
    // Inviamo tutto all'endpoint globale
    console.log("sto salvando la mappa del museo");
    const response = await fetch(`/api/museums/${museumId}/upload-map`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      alert("Mappa salvata con successo!");
      window.location.href = "/";
    } else {
      const errorData = await response.json();
      alert(`Errore: ${errorData.error}\nDettaglio: ${errorData.details}`);
      console.error("Dettaglio Errore DB:", errorData.details);
    }
  } catch (error) {
    console.error("Errore nell'invio:", error);
  }
}
