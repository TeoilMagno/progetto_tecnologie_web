document.addEventListener("DOMContentLoaded", async () => {
  await fetchCurrentUser();
  
  // Protezione lato frontend: se non è admin lo cacciamo
  if (!currentUser || currentUser.role !== 'admin') {
    alert("Accesso negato. Area riservata agli amministratori.");
    window.location.href = "/";
    return;
  }

  loadPendingCurators();
});

async function loadPendingCurators() {
  const listContainer = document.getElementById("pending-users-list");

  try {
    const res = await fetch(`${API_BASE_URL}/admin/pending-curators`);
    const users = await res.json();

    if (users.length === 0) {
      listContainer.innerHTML = `
        <li class="list-group-item bg-transparent text-center py-5 text-secondary border-0">
          <i class="bi bi-check-circle fs-1 mb-2 text-success opacity-75"></i>
          <p class="mb-0">Tutto pulito! Non ci sono richieste in sospeso.</p>
        </li>`;
      return;
    }

    let html = "";

    users.forEach(user => {
      const nameDisplay = user.name ? `${user.name} (@${user.username})` : `@${user.username}`;
      
      html += `
        <li class="list-group-item bg-transparent text-white d-flex flex-column flex-md-row justify-content-between align-items-md-center py-3 border-secondary border-opacity-25">
          <div class="mb-3 mb-md-0">
            <h6 class="mb-1 text-info fw-bold"><i class="bi bi-person-badge me-2"></i>${nameDisplay}</h6>
            <p class="mb-0 small text-white-50">Attuale ruolo: <span class="badge bg-secondary">Visitatore</span></p>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-danger px-3" onclick="respondToRequest('${user._id}', 'reject')">
              <i class="bi bi-x-lg me-1"></i> Rifiuta
            </button>
            <button class="btn btn-sm btn-success px-3" onclick="respondToRequest('${user._id}', 'approve')">
              <i class="bi bi-check-lg me-1"></i> Approva come Curatore
            </button>
          </div>
        </li>
      `;
    });
    listContainer.innerHTML = html;
  } catch (error) {
    console.error(error);
    listContainer.innerHTML = `<li class="list-group-item bg-transparent text-center text-danger border-0">Errore di connessione.</li>`;
  }
}

async function respondToRequest(userId, action) {
  const confirmMsg = action === 'approve' 
    ? "Vuoi approvare questo utente e dargli i permessi da Curatore?" 
    : "Sei sicuro di voler rifiutare questa richiesta?";
    
  if (!confirm(confirmMsg)) return;

  try {
    const res = await fetch(`${API_BASE_URL}/admin/curators/${userId}/respond`, {
      method: 'PUT',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: action })
    });

    if (res.ok) {
      alert("Operazione completata con successo!");
      loadPendingCurators(); // Ricarica la lista per far sparire l'utente
    } else {
      const err = await res.json();
      alert(err.error || "Errore durante l'operazione.");
    }
  } catch (error) {
    console.error(error);
  }
}