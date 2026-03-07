let sectionCount = 0;

function renderAddSection() {
    sectionCount++;
    const container = document.getElementById('sections-region'); // Punto di ancoraggio nel HTML

    // Creazione del div della nuova sezione
    const sectionDiv = document.createElement('div');
    sectionDiv.className = "section-block";
    sectionDiv.style = "border: 2px solid #007bff; padding: 15px; margin: 10px 0; position: relative";
    sectionDiv.id = `section-${sectionCount}`;

    console.log("sono dentro renderaddsection")

    sectionDiv.innerHTML = `
      <div>
        <button type="button" 
          onclick="this.parentElement.remove()" 
          style="position: absolute; right: 10px; top: 10px; color: red; cursor: pointer;">
          ✖
        </button>

        <h3>Sezione ${sectionCount}</h3>
        <label>Titolo sezione:</label><br>
        <input type="text" name="sectionName[]" required><br>
        
        <label>Path immagine sezione:</label><br>
        <input type="text" name="sectionImage[]"><br>
        
        <div id="works-container-${sectionCount}" style="margin-left: 20px; border-left: 1px dashed #ccc;">
          </div>
        
        <button type="button" onclick="renderAddWork(${sectionCount})">+ Aggiungi Opera a questa sezione</button>
      </div>
      `;

    container.appendChild(sectionDiv);
}

async function sectionHandleSave(museumId) {
  event.preventDefault(); 
  
  const form = document.getElementById('form');
  const formData = new FormData(form);

  // Raccogliamo i dati delle opere dagli input dinamici
  const names = formData.getAll('itemName[]');
  const prices = formData.getAll('price[]');
  const images = formData.get('image_path_item[]'); // se ne hai più di uno usa getAll
  const quantities = formData.getAll('quantity[]');

  // Creiamo l'array di oggetti "opera"
  const worksArray = names.map((n, i) => ({
    name: n,
    price: prices[i],
    image: images[i],
    quantity: quantities[i]
  }));

  const payload = {
    name: formData.get('name'),
    image_path: formData.get('image_path'),
    museumId: museumId,
  };

  console.log("sezioni aggiunte con museumId: ", museumId)

  try {
    const response = await fetch('http://localhost:3000/api/save-section', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      alert("Tutto salvato con successo!");
      // window.location.href = "/dashboard";
    }
  } catch (error) {
    console.error("Errore nell'invio:", error);
  }
}
