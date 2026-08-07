const CART_KEY = 'artaround_cart';

// 1. Recupera il carrello dal localStorage
function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY)) || [];
}

// 2. Salva il carrello e aggiorna la UI
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartUI();
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
      
      cartList.innerHTML += `
        <div class="d-flex align-items-center mb-3 border-bottom border-secondary border-opacity-25 pb-2">
          <img src="${item.image || '/img/fallback.jpg'}" style="width: 50px; height: 50px; object-fit: cover;" class="rounded me-3">
          <div class="flex-grow-1">
            <h6 class="mb-0 text-white small text-truncate" style="max-width: 150px;">${item.name}</h6>
            ${typeLabel} <span class="small text-secondary">x${item.quantity}</span>
          </div>
          <div class="text-end">
            <div class="text-white small fw-bold">€${(item.price * item.quantity).toFixed(2)}</div>
            <button class="btn btn-link text-danger p-0 small" onclick="removeFromCart('${item.id}', '${item.type}')">Rimuovi</button>
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
      localStorage.removeItem(CART_KEY);
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

// Inizializza l'UI al caricamento della pagina
document.addEventListener('DOMContentLoaded', updateCartUI);