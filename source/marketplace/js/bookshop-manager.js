// ==========================================
// MODULO GESTIONE BOOKSHOP (Admin/Curator)
// ==========================================

let currentBookshopMuseumId = null;

// Apre il modal e scarica gli items
async function openBookshopManager(museumId) {
  currentBookshopMuseumId = museumId;
  const modal = new bootstrap.Modal(document.getElementById('bookshopManagerModal'));
  modal.show();
  
  await loadBookshopItems();
}

// Scarica e renderizza la lista degli oggetti
async function loadBookshopItems() {
  const container = document.getElementById("bookshop-items-list");
  container.innerHTML = `<div class="text-center text-secondary my-3"><span class="spinner-border spinner-border-sm"></span> Caricamento articoli...</div>`;
  
  try {
    const res = await fetch(`${API_BASE_URL}/museums/${currentBookshopMuseumId}/items`);
    const data = await res.json();
    
    // Supporto retrocompatibile per le chiamate API paginate
    const items = Array.isArray(data) ? data : (data.items || []);
    
    if (items.length === 0) {
      container.innerHTML = `<div class="alert alert-dark text-center">Nessun articolo presente nel bookshop.</div>`;
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="list-group-item bg-dark border-secondary text-white d-flex justify-content-between align-items-center">
        <div>
          <h6 class="mb-0">${item.name || item.title}</h6>
          <small class="text-secondary">Prezzo: €${item.price} | Categoria: ${item.category || 'N/D'} | In magazzino: <strong class="text-warning" id="stock-val-${item._id}">${item.quantity}</strong></small>
        </div>
        <div class="d-flex gap-2">
          <input type="number" id="add-qty-${item._id}" class="form-control form-control-sm" style="width: 70px;" min="1" placeholder="+ Q.tà">
          <button class="btn btn-sm btn-outline-success" onclick="addStock('${item._id}')">Aggiungi</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    container.innerHTML = `<div class="alert alert-danger">Errore nel caricamento degli articoli.</div>`;
  }
}

// Chiamata API per aggiungere pezzi in magazzino
async function addStock(itemId) {
  const input = document.getElementById(`add-qty-${itemId}`);
  const quantityToAdd = input.value;

  if (!quantityToAdd || quantityToAdd <= 0) {
    alert("Inserisci una quantità valida da aggiungere.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/items/${itemId}/add-stock`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantityToAdd })
    });
    
    if (res.ok) {
      const data = await res.json();
      document.getElementById(`stock-val-${itemId}`).innerText = data.item.quantity;
      input.value = ''; 
    } else {
      alert("Errore durante l'aggiunta dello stock.");
    }
  } catch (error) {
    console.error(error);
  }
}

// --- Gestione Nuovo Articolo ---
function toggleNewItemForm() {
  document.getElementById("new-item-form-container").classList.toggle("d-none");
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("new-item-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const newItemData = {
      name: document.getElementById("new-item-name").value,
      price: parseFloat(document.getElementById("new-item-price").value),
      quantity: parseInt(document.getElementById("new-item-qty").value),
      category: document.getElementById("new-item-category").value,
      image: document.getElementById("new-item-image").value,       
      description: document.getElementById("new-item-description").value 
    };

    try {
      const res = await fetch(`${API_BASE_URL}/museums/${currentBookshopMuseumId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItemData)
      });
      
      if (res.ok) {
        const data = await res.json();

        e.target.reset(); 
        toggleNewItemForm(); 
        await loadBookshopItems(); 

        fetch(`${API_BASE_URL}/ai/generate-item-targetage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: data.item._id, 
            itemName: newItemData.name,
            itemDescription: newItemData.description
          })
        })
        .then(res => res.json())
        .then(aiResponse => {
          console.log("Risposta IA ricevuta:", aiResponse);
          loadBookshopItems(); 
        })
        .catch(err => console.error("Errore di rete nella chiamata IA:", err));

      } else {
        const errorData = await res.json();
        alert("Errore durante la creazione dell'articolo: " + (errorData.error || "Controlla i dati."));
      }
    } catch (error) {
      console.error(error);
    }
  });
});