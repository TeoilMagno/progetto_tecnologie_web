let sectionCount = 0;

function renderAddSection() {
  sectionCount++;
  const container = document.getElementById("sections-region"); // Punto di ancoraggio nel HTML

  // Creazione del div della nuova sezione
  const sectionDiv = document.createElement("div");
  sectionDiv.className =
    "section-block glass-panel section-block-aura mb-4 position-relative";
  sectionDiv.id = `section-${sectionCount}`;

  sectionDiv.innerHTML = `
      <button type="button" onclick="this.parentElement.remove()" class="btn-close btn-close-white position-absolute end-0 top-0 m-3"></button>

      <h3 class="h5 mb-4 text-white"><i class="bi bi-layers me-2"></i>Sezione ${sectionCount}</h3>
      
      <div class="mb-3">
        <label class="form-label-aura">Titolo Sezione</label>
        <input type="text" name="sectionName[]" class="form-control input-aura" required>
      </div>
      
      <div class="mb-4">
        <label class="form-label-aura">URL Immagine Sezione</label>
        <input type="text" name="sectionImage[]" class="form-control input-aura">
      </div>
      
      <div id="works-container-${sectionCount}" class="mb-3"></div>
      
      <button type="button" class="btn btn-sm btn-outline-info" onclick="renderAddWork(${sectionCount})">
        <i class="bi bi-plus-circle me-1"></i>Aggiungi Opera
      </button>
    `;

  container.appendChild(sectionDiv);
}

async function sectionHandleSave(museumId) {
  event.preventDefault();

  const form = document.getElementById("form");
  const formData = new FormData(form);

  // Raccogliamo i dati delle opere dagli input dinamici
  const names = formData.getAll("itemName[]");
  const prices = formData.getAll("price[]");
  const images = formData.get("image_path_item[]"); // se ne hai più di uno usa getAll
  const quantities = formData.getAll("quantity[]");

  // Creiamo l'array di oggetti "opera"
  const worksArray = names.map((n, i) => ({
    name: n,
    price: prices[i],
    image: images[i],
    quantity: quantities[i],
  }));

  const payload = {
    name: formData.get("name"),
    image_path: formData.get("image_path"),
    museumId: museumId,
  };

  console.log("sezioni aggiunte con museumId: ", museumId);

  try {
    const response = await fetch("http://localhost:3000/api/save-section", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      alert("Tutto salvato con successo!");
      // window.location.href = "/dashboard";
    }
  } catch (error) {
    console.error("Errore nell'invio:", error);
  }
}
