class ArtCart extends HTMLElement {
  connectedCallback() {
    // Genera la sua UI (il vecchio div #cartOffcanvas)
    this.innerHTML = `
      <div class="offcanvas offcanvas-end glass-modal text-white" tabindex="-1" id="cartOffcanvas" style="background: rgba(20, 20, 30, 0.95);">
        <div class="offcanvas-header border-bottom border-secondary border-opacity-25">
          <h5 class="offcanvas-title"><i class="bi bi-cart3 me-2"></i>Il tuo Carrello</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas"></button>
        </div>
        <div class="offcanvas-body" id="cart-items-list"></div>
        <div class="offcanvas-footer border-top border-secondary border-opacity-25 p-3">
          <div class="d-flex justify-content-between mb-3">
            <span class="fs-5">Totale:</span>
            <span class="fs-5 fw-bold text-info" id="cart-total">€ 0.00</span>
          </div>
          <button class="btn btn-gradient w-100 py-2 fs-5" id="btn-checkout">Procedi al Checkout</button>
        </div>
      </div>
    `;

    this.listEl = this.querySelector('#cart-items-list');
    this.totalEl = this.querySelector('#cart-total');
    
    this.querySelector('#btn-checkout').addEventListener('click', () => this.goToCheckout());
    
    // Ascolta eventi globali per aggiungere prodotti
    window.addEventListener('cart-add-item', (e) => this.addToCart(e.detail));

    window.updateCartUI = () => this.updateCartUI();
    window.syncGuestCartToUser = () => this.syncGuestCartToUser();
    
    // Rendi globale l'aggiornamento quantità dal template string
    window.updateCartQuantity = (id, type, delta) => this.updateQuantity(id, type, delta);
    window.removeCartItem = (id, type) => this.removeFromCart(id, type);

    this.updateCartUI();
  }

  getCartKey() {
    return (typeof currentUser !== 'undefined' && currentUser?._id) 
      ? `artaround_cart_${currentUser._id}` 
      : 'artaround_cart_guest';
  }

  getCart() {
    return JSON.parse(localStorage.getItem(this.getCartKey())) || [];
  }

  saveCart(cart) {
    localStorage.setItem(this.getCartKey(), JSON.stringify(cart));
    this.updateCartUI();
  }

  syncGuestCartToUser() {
    if (typeof window.currentUser === 'undefined' || !window.currentUser || !window.currentUser._id) return;

    const guestCart = JSON.parse(localStorage.getItem('artaround_cart_guest')) || [];
    if (guestCart.length > 0) {
      const userKey = `artaround_cart_${window.currentUser._id}`;
      const userCart = JSON.parse(localStorage.getItem(userKey)) || [];

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
      localStorage.removeItem('artaround_cart_guest');
    }
  }

  addToCart(product) {
    const cart = this.getCart();
    const existingItem = cart.find(item => item.id === product.id && item.type === product.type);
    
    if (existingItem) {
      if (product.type === 'visit') return alert("Hai già aggiunto questa visita al carrello!");
      existingItem.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }
    
    this.saveCart(cart);
    alert("Item aggiunto correttamente al carrello");
  }

  removeFromCart(id, type) {
    let cart = this.getCart().filter(item => !(item.id === id && item.type === type));
    this.saveCart(cart);
  }

  updateQuantity(id, type, delta) {
    let cart = this.getCart();
    const item = cart.find(i => i.id === id && i.type === type);
    if (item) {
      item.quantity += delta;
      if (item.quantity <= 0) return this.removeFromCart(id, type);
      this.saveCart(cart);
    }
  }

  updateCartUI() {
    const cart = this.getCart();
    let html = "";
    let totalPrice = 0;
    let totalItems = 0;

    if (cart.length === 0) {
      html = `<div class="text-center text-secondary mt-5"><i class="bi bi-cart-x fs-1"></i><p>Il carrello è vuoto</p></div>`;
    } else {
      cart.forEach(item => {
        totalItems += item.quantity;
        totalPrice += item.price * item.quantity;
        const typeLabel = item.type === 'visit' ? '<span class="badge bg-info text-dark">Visita</span>' : '<span class="badge bg-secondary">Bookshop</span>';
        
        const controls = item.type === 'item' 
          ? `<div class="d-flex align-items-center mt-1">
               <button class="btn btn-sm btn-outline-secondary py-0 px-2 rounded-circle" onclick="updateCartQuantity('${item.id}', '${item.type}', -1)">-</button>
               <span class="mx-2 small fw-bold">${item.quantity}</span>
               <button class="btn btn-sm btn-outline-secondary py-0 px-2 rounded-circle" onclick="updateCartQuantity('${item.id}', '${item.type}', 1)">+</button>
             </div>`
          : `<span class="small text-secondary d-block mt-1"><i class="bi bi-person-fill"></i> Singolo accesso</span>`;
        
        html += `
          <div class="d-flex align-items-center mb-3 border-bottom border-secondary border-opacity-25 pb-2">
            <img src="${item.image || '/img/fallback-work.jpg'}" style="width: 55px; height: 55px; object-fit: cover;" class="rounded me-3 shadow-sm">
            <div class="flex-grow-1">
              <h6 class="mb-0 text-white small text-truncate" style="max-width: 150px;">${item.name}</h6>
              ${typeLabel} ${controls}
            </div>
            <div class="text-end ms-2">
              <div class="text-info small fw-bold">€${(item.price * item.quantity).toFixed(2)}</div>
              <button class="btn btn-link text-danger p-0 mt-1" style="font-size: 0.75rem;" onclick="removeCartItem('${item.id}', '${item.type}')">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        `;
      });
    }
    this.listEl.innerHTML = html;
    this.totalEl.innerText = `€ ${totalPrice.toFixed(2)}`;

    // Comunica all'esterno (es. badge nell'header) che il carrello è cambiato
    this.dispatchEvent(new CustomEvent('cart-updated', { detail: { totalItems }, bubbles: true }));
  }

  async goToCheckout() {
    const cart = this.getCart();

    if (cart.length === 0) {
      alert("Il carrello è vuoto!");
      return;
    }

    // Mappatura compatta e pulita sfruttando .filter() e .map()
    const items = cart
      .filter(item => item.type === 'item')
      .map(item => ({
        itemId: item.id,
        name: item.name,
        price: item.price,
        image: item.image || '', // Richiesto da orderItemSchema
        quantity: item.quantity
      }));

    const visits = cart
      .filter(item => item.type === 'visit')
      .map(item => ({
        visitId: item.id,
        title: item.name,
        price: item.price
      }));

    // Calcolo del totale in modo contratto con .reduce()
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const payload = { items, visits, totalAmount };

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
        localStorage.removeItem(this.getCartKey()); 
        this.updateCartUI();

        // Chiudiamo il pannello laterale del carrello
        const instance = bootstrap.Offcanvas.getInstance(document.getElementById('cartOffcanvas'));
        if (instance) instance.hide();

        // Andiamo agli ordini per vedere il riepilogo
        window.location.href = "/my-orders";

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
}
customElements.define('art-cart', ArtCart);