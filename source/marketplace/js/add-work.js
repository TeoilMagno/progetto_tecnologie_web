let workCount = 0;

function renderAddWork(sId) {
    const worksContainer = document.getElementById(`works-container-${sId}`);
    workCount++

    const workDiv = document.createElement('div');
    workDiv.style = "background: #f9f9f9; padding: 10px; margin-top: 5px; border: 1px solid #ddd; position: relative";
    workDiv.className = "work-block";
    workDiv.id = `work-${workCount}`;

    workDiv.innerHTML = `
      <button type="button" 
        onclick="this.parentElement.remove()" 
        style="position: absolute; right: 5px; top: 5px; border: none; background: none; color: #666; cursor: pointer;">
        ✕
      </button>

      <h4>Opera ${(workCount)}</h4>
      <label>Nome opera:</label>
      <input type="text" name="workName[${sId}][]" required><br>
      <label>Autore:</label>
      <input type="text" name="author[${sId}][]" required><br>
      <label>Stile:</label>
      <input type="text" name="style[${sId}][]" required><br>
      <label>Anno/periodo di realizzazione:</label>
      <input type="text" name="year[${sId}][]" required><br>
      <label>Image path:</label>
      <input type="text" name="workImagePath[${sId}][]"><br>
      <label>Descrizione:</label>
      <textarea></textarea><br>
      <input type="hidden" name="workSectionId[]" value="${sId}">
    `;
    
    worksContainer.appendChild(workDiv);
}