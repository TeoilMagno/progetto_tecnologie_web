// Calcola la chiave del carrello in base all'utente corrente
function getCartKey() {
  if (typeof currentUser !== 'undefined' && currentUser && currentUser._id) {
    return `artaround_cart_${currentUser._id}`;
  }
  return 'artaround_cart_guest';
}

// 1. Recupera il carrello dal localStorage per l'utente/ospite corrente
function getCart() {
  return JSON.parse(localStorage.getItem(getCartKey())) || [];
}

// 2. Salva il carrello e aggiorna la UI
function saveCart(cart) {
  localStorage.setItem(getCartKey(), JSON.stringify(cart));
  updateCartUI();
}

// 2b. Sincronizza/trasferisce il carrello da Ospite ad Utente loggato dopo il login
function syncGuestCartToUser() {
  if (typeof currentUser === 'undefined' || !currentUser || !currentUser._id) return;

  const guestCart = JSON.parse(localStorage.getItem('artaround_cart_guest')) || [];
  if (guestCart.length > 0) {
    const userKey = `artaround_cart_${currentUser._id}`;
    const userCart = JSON.parse(localStorage.getItem(userKey)) || [];

    // Uniamo il carrello guest a quello dell'utente evitando duplicati di visite
    guestCart.forEach(guestItem => {
      const existing = userCart.find(i => i.id === guestItem.id && i.type === guestItem.type);
      if (existing) {
        if (guestItem.type !== 'visit') {
          existing.quantity += guestItem.quantity;
        }
      } else {
        userCart.push(guestItem);
      }
    });

    localStorage.setItem(userKey, JSON.stringify(userCart));
    localStorage.removeItem('artaround_cart_guest'); // Svuota il carrello guest temporaneo
  }
}

// 3. Aggiungi un elemento (Visita o Item)
function addToCart(product) {
  const cart = getCart();
  
  // Controlliamo se l'elemento è già nel carrello
  const existingItem = cart.find(item => item.id === product.id && item.type === product.type);
  
  if (existingItem) {
    // Le visite non si possono comprare due volte, gli item sì (hanno la quantità)
    if (product.type === 'visit') {
      alert("Hai già aggiunto questa visita al carrello!");
      return;
    }
    existingItem.quantity += 1;
  } else {
    // Se non esiste, lo aggiungiamo con quantità 1
    cart.push({ ...product, quantity: 1 });
  }
  
  saveCart(cart);
  
  // Apriamo la barra laterale del carrello per dare un feedback visivo
  const cartOffcanvas = new bootstrap.Offcanvas(document.getElementById('cartOffcanvas'));
  cartOffcanvas.show();
}

// 4. Rimuovi un elemento
function removeFromCart(id, type) {
  let cart = getCart();
  cart = cart.filter(item => !(item.id === id && item.type === type));
  saveCart(cart);
}

// 5. Aggiorna l'interfaccia (Badge numero e Lista laterale)
function updateCartUI() {
  const cart = getCart();
  const cartBadge = document.getElementById('cart-badge');
  const cartList = document.getElementById('cart-items-list');
  const cartTotal = document.getElementById('cart-total');

  if (!cartBadge || !cartList || !cartTotal) return;

  // Aggiorna numerino
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartBadge.innerText = totalItems;
  cartBadge.classList.toggle('d-none', totalItems === 0);

  // Aggiorna lista
  cartList.innerHTML = '';
  let totalPrice = 0;

  if (cart.length === 0) {
    cartList.innerHTML = `<div class="text-center text-secondary mt-5"><i class="bi bi-cart-x fs-1"></i><p>Il carrello è vuoto</p></div>`;
  } else {
    cart.forEach(item => {
      totalPrice += item.price * item.quantity;
      const typeLabel = item.type === 'visit' ? '<span class="badge bg-info text-dark">Visita</span>' : '<span class="badge bg-secondary">Bookshop</span>';
      
      // I controlli "+" e "-" appaiono solo per il bookshop. Le visite restano fisse a 1.
      const quantityControls = item.type === 'item' 
        ? `<div class="d-flex align-items-center mt-1">
             <button class="btn btn-sm btn-outline-secondary py-0 px-2 rounded-circle" onclick="updateQuantity('${item.id}', '${item.type}', -1)">-</button>
             <span class="mx-2 small fw-bold">${item.quantity}</span>
             <button class="btn btn-sm btn-outline-secondary py-0 px-2 rounded-circle" onclick="updateQuantity('${item.id}', '${item.type}', 1)">+</button>
           </div>`
        : `<span class="small text-secondary d-block mt-1"><i class="bi bi-person-fill"></i> Singolo accesso</span>`;
      
      cartList.innerHTML += `
        <div class="d-flex align-items-center mb-3 border-bottom border-secondary border-opacity-25 pb-2">
          <img src="${item.image || '/img/fallback-work.jpg'}" style="width: 55px; height: 55px; object-fit: cover; border: 1px solid rgba(255,255,255,0.1);" class="rounded me-3 shadow-sm">
          <div class="flex-grow-1">
            <h6 class="mb-0 text-white small text-truncate" style="max-width: 150px;">${item.name}</h6>
            ${typeLabel} 
            ${quantityControls}
          </div>
          <div class="text-end ms-2">
            <div class="text-info small fw-bold">€${(item.price * item.quantity).toFixed(2)}</div>
            <button class="btn btn-link text-danger p-0 mt-1" style="font-size: 0.75rem; text-decoration: none;" onclick="removeFromCart('${item.id}', '${item.type}')">
              <i class="bi bi-trash"></i> Rimuovi
            </button>
          </div>
        </div>
      `;
    });
  }

  cartTotal.innerText = `€ ${totalPrice.toFixed(2)}`;
}

// Funzione per inviare il carrello al backend e fare l'acquisto reale
async function goToCheckout() {
  const cart = getCart();

  if (cart.length === 0) {
    alert("Il carrello è vuoto!");
    return;
  }

  const payload = {
    items: [],
    visits: [],
    totalAmount: 0
  };

  let total = 0;

  cart.forEach(cartItem => {
    total += cartItem.price * cartItem.quantity;

    if (cartItem.type === 'item') {
      payload.items.push({
        itemId: cartItem.id,
        name: cartItem.name,
        price: cartItem.price,
        quantity: cartItem.quantity
      });
    } else if (cartItem.type === 'visit') {
      payload.visits.push({
        visitId: cartItem.id,
        title: cartItem.name,
        price: cartItem.price
      });
    }
  });

  payload.totalAmount = total;

  try {
    const response = await fetch(`${API_BASE_URL}/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const result = await response.json();
      alert("Acquisto completato con successo! Grazie.");
      
      // Svuotiamo il carrello nel localStorage dopo il successo
      localStorage.removeItem(getCartKey()); 
      updateCartUI();

      // Chiudiamo il pannello laterale del carrello
      const instance = bootstrap.Offcanvas.getInstance(document.getElementById('cartOffcanvas'));
      if (instance) instance.hide();

      // Rinfreschiamo la pagina o andiamo alle visite per vedere lo sblocco
      window.location.href = "/my-visits";

    } else {
      if (response.status === 401) {
        window.location.href = "/login?msg=login_required";
      } else {
        const errorData = await response.json();
        alert(`Errore durante il checkout: ${errorData.error || 'Riprova più tardi'}`);
      }
    }
  } catch (error) {
    console.error("Errore di rete durante il checkout:", error);
    alert("Errore di connessione con il server.");
  }
}

// 4b. Aggiorna la quantità di un elemento al volo con i tasti + e -
function updateQuantity(id, type, delta) {
  let cart = getCart();
  const item = cart.find(i => i.id === id && i.type === type);
  
  if (item) {
    item.quantity += delta;
    // Se la quantità scende a 0, lo rimuoviamo dal carrello
    if (item.quantity <= 0) {
      removeFromCart(id, type);
      return; 
    }
    saveCart(cart);
  }
}

// Inizializza l'UI al caricamento della pagina
document.addEventListener('DOMContentLoaded', updateCartUI);