// Stato globale della visita in creazione
let currentVisitCart = []; // Array che conterrà gli ID (o gli oggetti) delle opere

document.addEventListener("DOMContentLoaded", () => {
  // 1. INIZIALIZZA IL DRAG & DROP
  const cartListElement = document.getElementById("visit-cart-list");
  if (cartListElement) {
    new Sortable(cartListElement, {
      handle: ".drag-handle", // Solo l'hamburger menu può iniziare il trascinamento
      animation: 150, // Animazione fluida (stile Mint)
      ghostClass: "sortable-ghost",

      // 2. AGGIORNA L'ARRAY QUANDO FINISCI DI TRASCINARE
      onEnd: function (evt) {
        // Sposta l'elemento nell'array in base al nuovo indice
        const movedItem = currentVisitCart.splice(evt.oldIndex, 1)[0];
        currentVisitCart.splice(evt.newIndex, 0, movedItem);

        console.log("Nuovo ordine della visita:", currentVisitCart);
      },
    });
  }
});

// Funzione richiamata dal bottone "Aggiungi" sulle opere a sinistra
function addToVisit(itemId, itemName) {
  // Evita duplicati
  if (currentVisitCart.some((item) => item.id === itemId)) {
    alert("Quest'opera è già nella tua visita!");
    return;
  }

  // Aggiungi all'array
  currentVisitCart.push({ id: itemId, name: itemName });

  // Aggiorna l'interfaccia
  renderVisitCart();
}

function removeFromVisit(itemId) {
  currentVisitCart = currentVisitCart.filter((item) => item.id !== itemId);
  renderVisitCart();
}

function renderVisitCart() {
  const cartList = document.getElementById("visit-cart-list");
  const emptyMsg = document.getElementById("empty-cart-msg");
  const saveBtn = document.getElementById("save-visit-btn");

  cartList.innerHTML = "";

  if (currentVisitCart.length === 0) {
    emptyMsg.classList.remove("d-none");
    saveBtn.classList.add("disabled");
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
}
