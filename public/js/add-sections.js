// Rimuovi 'exports.' - nel browser definiamo la funzione globalmente
function renderAddWork() {
  console.log('renderAddWork called correctly');
  
  const container = document.getElementById('form');
  const button = document.getElementById('works');

  // Creiamo un contenitore per i nuovi campi
  const newWorkFields = document.createElement('div');
  newWorkFields.innerHTML += `
    <div style="border-left: 2px solid #007bff; padding-left: 10px; margin-top: 10px;">
      <h4>Nuova Opera</h4>
      <label>Enter work name:</label><br>
      <input type="text" name="itemName[]" class="name"><br>
      
      <label>Enter price:</label><br>
      <input type="number" name="price[]" class="price"><br>
      
      <label>Enter long description:</label><br>
      <textarea name="description[]"></textarea><br>
      
      <label>Enter image path:</label><br>
      <input type="text" name="image_path_item[]" class="image_path"><br>
      
      <label>Enter quantity:</label><br>
      <input type="number" name="quantity[]" class="quantity"><br>
    </div>
    <button type="button" id="works" onclick="renderAddWork()">Add works</button><br>
  `;

  // Inseriamo i nuovi campi prima del pulsante di submit
  // Invece di appendChild (che li metterebbe dopo il tasto Add), 
  // li mettiamo prima del tasto "Add works" o del template
  container.insertBefore(newWorkFields, document.getElementById('works-region'));
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
