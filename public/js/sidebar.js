document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return; // Se in una pagina (es. login) non c'è la sidebar, si ferma senza crashare

  // html della sidebar come componente riutilizzabile
  sidebar.innerHTML = `
    <div class="position-sticky">
      <div class="px-3 mb-4 d-flex justify-content-between align-items-center">
        <h6 class="sidebar-title small mb-0">Dashboard</h6>
        <button class="btn btn-sm text-secondary p-0" id="sidebarCloseBtn">
          <i class="bi bi-chevron-left fs-5"></i>
        </button>
      </div>
      <ul class="nav flex-column sidebar-nav">
        <li class="nav-item">
          <a class="nav-link" id="link-marketplace" href="/">
            <i class="bi bi-house-door me-2"></i> Marketplace
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" id="link-public-visits" href="/public-visits">
            <i class="bi bi-map me-2"></i> Esplora Visite
          </a>
        </li>
      </ul>
    </div>
  `;

  // illumina il tasto giusto (classe 'active') della sidebar
  const attualPath = window.location.pathname;

  if (attualPath === "/" || attualPath === "/index.html") {
    document.getElementById("link-marketplace")?.classList.add("active");
  } else if (attualPath.includes("museums") || attualPath.includes("museum")) {
    document.getElementById("link-museums")?.classList.add("active");
  } else if (attualPath.includes("visits") || attualPath.includes("visit")) {
    document.getElementById("link-visits")?.classList.add("active");
  }

  // gestione Apertura/Chiusura automatica per tutte le pagine
  const openBtn = document.getElementById("sidebarOpenBtn");
  const closeBtn = document.getElementById("sidebarCloseBtn"); // Lo ri-selezioniamo visto che lo abbiamo appena creato sopra

  if (openBtn && closeBtn) {
    closeBtn.addEventListener("click", () => {
        sidebar.classList.add("collapsed");
        openBtn.classList.remove("d-none");
        openBtn.classList.add("show-btn");
    });

    openBtn.addEventListener("click", () => {
        sidebar.classList.remove("collapsed");
        openBtn.classList.add("d-none");
        openBtn.classList.remove("show-btn");
    });
  }
});