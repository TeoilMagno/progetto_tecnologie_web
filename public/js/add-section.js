let workCount = 0;

function renderAddWork(sId) {
    const worksContainer = document.getElementById(`works-container-${sId}`);
    workCount++

    const workDiv = document.createElement('div');
    workDiv.style = "background: #f9f9f9; padding: 10px; margin-top: 5px; border: 1px solid #ddd;";
    workDiv.className = "work-block";
    workDiv.id = `work-${workCount}`;

    workDiv.innerHTML = `
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

async function handleSave() {
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
    museumId: "69971027041c5bcbe57983b3", // Questo dovrai averlo da qualche parte (es. nell'URL)
    works: worksArray
  };

  try {
    const response = await fetch('http://localhost:3000/api/save-full-section', {
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
