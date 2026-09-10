class ArtHeader extends HTMLElement {
  constructor() {
    super();
    this.currentUser = null;
  }

  async connectedCallback() {
    // 1. Carica dinamicamente gli script dei sotto-componenti se non sono già presenti
    await this.loadDependencies();

    // 2. Inserisce la struttura HTML sfruttando i tag dei sotto-componenti
    this.innerHTML = `
      <header class="navbar site-header sticky-top px-3">
        <a class="navbar-brand d-flex align-items-center" href="/marketplace">
          <i class="bi bi-bank me-2 text-white"></i>
          <span class="brand-text">ArtAround</span>
          <span class="brand-subtitle ms-1 text-white opacity-75">Marketplace</span>
        </a>
        
        <div class="d-flex align-items-center">
          <!-- Sotto-componente Search Bar -->
          <search-bar></search-bar>

          <a href="/navigator" class="btn text-white me-3" title="Apri Navigator">
            <i class="bi bi-compass fs-5"></i>
          </a>

          <button class="btn text-white me-3" type="button" data-bs-toggle="offcanvas" data-bs-target="#filterSidebar">
            <i class="bi bi-funnel fs-5"></i>
          </button>

          <!-- Bottone Carrello con Badge -->
          <button class="btn text-white position-relative me-3" data-bs-toggle="offcanvas" data-bs-target="#cartOffcanvas">
            <i class="bi bi-cart3 fs-4"></i>
            <span id="cart-badge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none" style="font-size: 0.6rem;">
              0
            </span>
          </button>

          <!-- User Area -->
          <div id="user-area" class="text-white small d-flex align-items-center gap-2">
            <span class="spinner-border spinner-border-sm text-light" role="status"></span>
          </div>
        </div>
      </header>

      <!-- Sotto-componente Carrello -->
      <art-cart></art-cart>
    `;

    await this.fetchCurrentUser();

    document.addEventListener('cart-updated', (e) => {
      const cartBadge = this.querySelector('#cart-badge');
      if (cartBadge) {
        cartBadge.innerText = e.detail.totalItems;
        cartBadge.classList.toggle('d-none', e.detail.totalItems === 0);
      }
    });
  }

  // Funzione che inietta gli script figli se mancano
  loadDependencies() {
    return new Promise((resolve) => {
      let loadedCount = 0;
      const scripts = [
        { name: 'search-bar', src: '/marketplace/js/webcomponents/search-bar.js' },
        { name: 'art-cart', src: '/marketplace/js/webcomponents/art-cart.js' },
        { name: 'user-area', src: '/marketplace/js/personal-area.js' },
      ];

      const checkDone = () => {
        loadedCount++;
        if (loadedCount === scripts.length) resolve();
      };

      scripts.forEach(item => {
        if (customElements.get(item.name)) {
          checkDone();
        } else {
          const script = document.createElement('script');
          script.src = item.src;
          script.onload = checkDone;
          script.onerror = checkDone; // Evita blocchi se fallisce
          document.head.appendChild(script);
        }
      });
    });
  }

  async fetchCurrentUser() {
    try {
      const API = window.API_BASE_URL || '/api';
      const res = await fetch(`${API}/current-user`);
      this.currentUser = await res.json();
    } catch (e) {
      this.currentUser = null;
    }

    if (typeof window.syncGuestCartToUser === 'function') {
      window.syncGuestCartToUser();
    }

    this.renderUserArea();

    if (typeof window.updateCartUI === 'function') {
      window.updateCartUI();
    }
  }

  renderUserArea() {
    const area = this.querySelector("#user-area");
    if (!area) return;

    if (this.currentUser && (this.currentUser.username || this.currentUser.name)) {
      const initials = (this.currentUser.username || this.currentUser.name)
        .slice(0, 2)
        .toUpperCase();

      const currentPath = window.location.pathname;
      const isCurrent = (path) => currentPath === path;
      const role = this.currentUser.role;

      let menuOptions = `
        ${(role === "admin") ? `<li><a class="dropdown-item ${isCurrent('/admin-dashboard') ? 'text-info fw-bold' : 'text-warning'}" href="/admin-dashboard"><i class="bi bi-shield-lock me-2"></i>Pannello Admin</a></li>` : ''}
        ${(role === 'curator' || role === "admin") ? `<li><a class="dropdown-item ${isCurrent('/my-museums') ? 'text-info fw-bold' : 'text-white'}" href="/my-museums"><i class="bi bi-bank me-2"></i>I miei musei</a></li>` : ''}
        <li><a class="dropdown-item ${isCurrent('/my-visits') ? 'text-info fw-bold' : 'text-white'}" href="/my-visits"><i class="bi bi-map me-2"></i>Le mie visite</a></li>
        ${(role === 'curator' || role === "admin") ? `<li><a class="dropdown-item ${isCurrent('/my-adoptions') ? 'text-info fw-bold' : 'text-white'}" href="/my-adoptions"><i class="bi bi-arrow-left-right me-2"></i>Le mie adozioni</a></li>` : ''}
        ${(role === 'curator' || role === "admin") ? `<li><a class="dropdown-item ${isCurrent('/add-museum') ? 'text-info fw-bold' : 'text-white'}" href="/add-museum"><i class="bi bi-plus-square me-2"></i>Aggiungi museo</a></li>` : ''}
        ${(role === 'curator' || role === "admin") ? `<li><a class="dropdown-item ${isCurrent('/create-theme') ? 'text-info fw-bold' : 'text-white'}" href="/create-theme"><i class="bi bi-palette me-2"></i>Crea tema</a></li>` : ''}
        <li><a class="dropdown-item ${isCurrent('/create-visit') ? 'text-info fw-bold' : 'text-white'}" href="/create-visit"><i class="bi bi-plus-lg me-2"></i>Crea visita</a></li>
        <li><a class="dropdown-item ${isCurrent('/my-orders') ? 'text-info fw-bold' : 'text-white'}" href="/my-orders"><i class="bi bi-receipt me-2"></i>I miei ordini</a></li>
        <li><a class="dropdown-item ${isCurrent('/quiz-reports') ? 'text-info fw-bold' : 'text-white'}" href="/quiz-reports"><i class="bi bi-file-text me-2"></i>I miei report</a></li>
        <li><a class="dropdown-item ${isCurrent('/profile') ? 'text-info fw-bold' : 'text-white'}" href="/profile"><i class="bi bi-person-gear me-2"></i>Profilo</a></li>
      `;

      area.innerHTML = `
        <div class="dropdown">
          <div class="d-flex align-items-center cursor-pointer dropdown-toggle" 
              id="userDropdown" data-bs-toggle="dropdown" aria-expanded="false" style="cursor: pointer;">
            
            <div class="rounded-circle d-flex justify-content-center align-items-center fw-bold me-2"
              style="background: var(--accent-gradient); width:32px; height:32px; font-size:0.75rem; color: white;">
              ${initials}
            </div>

            <span class="fw-medium text-white">${this.currentUser.username || this.currentUser.name}</span>

            <i class="bi bi-chevron-down ms-3 custom-arrow"></i> 
          </div>
          
          <ul class="dropdown-menu dropdown-menu-end custom-dropdown-menu mt-2" aria-labelledby="userDropdown">
            ${menuOptions}
            <li><hr class="dropdown-divider border-secondary opacity-25"></li>
            <li>
              <form action="/logout" method="post" class="m-0">
                <button type="submit" class="dropdown-item text-danger">
                  <i class="bi bi-box-arrow-right me-2"></i>Esci
                </button>
              </form>
            </li>
          </ul>
        </div>
      `;
    } else {
      area.innerHTML = `
        <a href="/login" class="btn btn-sm btn-outline-light px-3">Accedi</a>
        <a href="/signup" class="btn btn-sm btn-primary ms-2 px-3">Registrati</a>
      `;
    }
  }
}

customElements.define('art-header', ArtHeader);