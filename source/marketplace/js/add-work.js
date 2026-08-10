//** INUTILIZZATO */
/* Al momento inutilizzato se si decide di tenere l'add-museum iniziale che poi rimanda all'edit-museum 
   Serve invece se vogliamo il form unico in cui si possono aggiungere sezioni una sotto l'altra
   Non ha le modifiche necessarie per aggiungere le stanze */ 
   
let workCount = 0;

function renderAddWork(sId) {
    const worksContainer = document.getElementById(`works-container-${sId}`);
    workCount++;
    const workDiv = document.createElement('div');
    
    workDiv.className = "work-block glass-panel work-block-aura p-3 mb-3 position-relative";
    workDiv.id = `work-${workCount}`;

    workDiv.innerHTML = `
      <button type="button" onclick="this.parentElement.remove()" class="btn-close btn-close-white btn-sm position-absolute end-0 top-0 m-2"></button>

      <h4 class="h6 text-info mb-3">Opera ${workCount}</h4>
      
      <div class="row g-2 mb-3">
        <div class="col-md-6">
          <label class="form-label-aura">Nome Opera</label>
          <input type="text" name="workName[${sId}][]" class="form-control input-aura" required>
        </div>
        <div class="col-md-6">
          <label class="form-label-aura">Autore</label>
          <input type="text" name="author[${sId}][]" class="form-control input-aura" required>
        </div>
      </div>

      <div class="row g-2 mb-3">
        <div class="col-md-6">
          <label class="form-label-aura">Stile</label>
          <input type="text" name="style[${sId}][]" class="form-control input-aura" required>
        </div>
        <div class="col-md-6">
          <label class="form-label-aura">Anno/Periodo</label>
          <input type="text" name="year[${sId}][]" class="form-control input-aura" required>
        </div>
      </div>

      <div class="mb-3">
        <label class="form-label-aura">URL Immagine Opera</label>
        <input type="text" name="workImagePath[${sId}][]" class="form-control input-aura" required>
      </div>

      <div>
        <label class="form-label-aura">Descrizione</label>
        <textarea class="form-control input-aura work-desc-input" rows="2" placeholder="Scrivi una breve descrizione..."></textarea>
      </div>
    `;
    
    worksContainer.appendChild(workDiv);
}