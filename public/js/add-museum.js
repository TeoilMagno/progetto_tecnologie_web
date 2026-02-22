let sectionCount = 0;

function renderAddSection() {
    sectionCount++;
    const container = document.getElementById('sections-region'); // Punto di ancoraggio nel HTML

    // Creazione del div della nuova sezione
    const sectionDiv = document.createElement('div');
    sectionDiv.className = "section-block";
    sectionDiv.style = "border: 2px solid #007bff; padding: 15px; margin: 10px 0;";
    sectionDiv.id = `section-${sectionCount}`;

    sectionDiv.innerHTML = `
        <h3>Sezione ${sectionCount}</h3>
        <label>Titolo sezione:</label><br>
        <input type="text" name="sectionName[]" required><br>
        
        <label>Path immagine sezione:</label><br>
        <input type="text" name="sectionImage[]"><br>
        
        <div id="works-container-${sectionCount}" style="margin-left: 20px; border-left: 1px dashed #ccc;">
            </div>
        
        <button type="button" onclick="renderAddWork(${sectionCount})">+ Aggiungi Opera a questa sezione</button>
    `;

    container.appendChild(sectionDiv);
}