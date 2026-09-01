let currentUser = null; // popolato da /api/current-user all'avvio

async function fetchCurrentUser() {
  try {
    const res = await fetch(`${API_BASE_URL}/current-user`);
    currentUser = await res.json(); // null se non loggato, { username, role } se loggato
  } catch (e) {
    currentUser = null;
  }

  // Sincronizza il carrello guest se l'utente ha appena fatto il login
  if (typeof syncGuestCartToUser === 'function') {
    syncGuestCartToUser();
  }

  renderUserArea();

  // Aggiorna la vista del carrello con la chiave dell'utente corretto
  if (typeof updateCartUI === 'function') {
    updateCartUI();
  }
}

function renderUserArea() {
  const area = document.getElementById("user-area");

  if (currentUser) {
    const initials = (currentUser.username || currentUser.name || "?")
      .slice(0, 2)
      .toUpperCase();

    const currentPath = window.location.pathname;
    const isCurrent = (path) => currentPath === path;

    // Definiamo le voci del menu in base al ruolo, evidenziando solo la sezione corrente in grassetto (fw-bold) e color ciano (text-info)
    let menuOptions = `
        ${(currentUser.role === "admin") ? `<li><a class="dropdown-item ${isCurrent('/admin-dashboard') ? 'text-info fw-bold' : 'text-warning'}" href="/admin-dashboard"><i class="bi bi-shield-lock me-2"></i>Pannello Admin</a></li>` : ''}
        ${(currentUser.role === 'curator' || currentUser.role === "admin") ? `<li><a class="dropdown-item ${isCurrent('/my-museums') ? 'text-info fw-bold' : 'text-white'}" href="/my-museums"><i class="bi bi-bank me-2"></i>I miei musei</a></li>` : ''}
        <li><a class="dropdown-item ${isCurrent('/my-visits') ? 'text-info fw-bold' : 'text-white'}" href="/my-visits"><i class="bi bi-map me-2"></i>Le mie visite</a></li>
        ${(currentUser.role === 'curator' || currentUser.role === "admin") ? `<li><a class="dropdown-item ${isCurrent('/my-adoptions') ? 'text-info fw-bold' : 'text-white'}" href="/my-adoptions"><i class="bi bi-arrow-left-right me-2"></i>Le mie adozioni</a></li>` : ''}
        ${(currentUser.role === 'curator' || currentUser.role === "admin") ? `<li><a class="dropdown-item ${isCurrent('/add-museum') ? 'text-info fw-bold' : 'text-white'}" href="/add-museum"><i class="bi bi-plus-square me-2"></i>Aggiungi museo</a></li>` : ''}
        ${(currentUser.role === 'curator' || currentUser.role === "admin") ? `<li><a class="dropdown-item ${isCurrent('/create-theme') ? 'text-info fw-bold' : 'text-white'}" href="/create-theme"><i class="bi bi-palette me-2"></i>Crea tema</a></li>` : ''}
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

          <span class="fw-medium text-white">${currentUser.username || currentUser.name}</span>

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
    // Utente non loggato: tasti standard
    area.innerHTML = `
      <a href="/login" class="btn btn-sm btn-outline-light px-3">Accedi</a>
      <a href="/signup" class="btn btn-sm btn-primary ms-2 px-3">Registrati</a>
    `;
  }
}
