let currentUserData = null;
let deleteUserModalInstance = null;
let passwordModalInstance = null;

document.addEventListener("DOMContentLoaded", async () => {
  if (document.getElementById("deleteUserModal")) deleteUserModalInstance = new bootstrap.Modal(document.getElementById("deleteUserModal"));
  if (document.getElementById("passwordModal")) passwordModalInstance = new bootstrap.Modal(document.getElementById("passwordModal"));

  try {
    const res = await fetch(`${API_BASE_URL}/current-user`);
    if (res.ok) {
      currentUserData = await res.json();
      if (!currentUserData) return window.location.replace('/login');
      console.log("Dati utente dal DB:", currentUserData);
      // 1. Gestione Nome ereditato (OAuth): Mostra la riga in sola lettura se il campo esiste
      if (currentUserData.name) {
        document.getElementById("social-name-row").classList.remove("d-none");
        document.getElementById("profile-real-name").value = currentUserData.name;
      }
      
      // 2. Gestione Username: Popola se esiste, altrimenti invita a crearlo
      document.getElementById("profile-username").value = currentUserData.username || "";
      document.getElementById("profile-username").placeholder = "Crea Username";
      
      // 3. Gestione Preferenze
      if (currentUserData.expertiseLevel) {
        document.getElementById("profile-expertise").value = currentUserData.expertiseLevel;
      }

      // Aggiungi sotto la gestione del Registro Linguistico:
      if (currentUserData.type) {
        document.getElementById("profile-type").value = currentUserData.type;
      }
      renderCuratorStatus(); // Avvia il render del blocco curatore

      // 4. Gestione Password: La funzione valuta in automatico se c'è già una password
      // per mostrare il bottone "Cambia Password" o "Aggiungi Password"
      renderSecurityOptions();
    }
  } catch (error) {
    console.error("Errore:", error);
  }
});

function toggleProfilePasswords() {
  const inputs = [
    document.getElementById('old-password'),
    document.getElementById('new-password'),
    document.getElementById('confirm-password')
  ];
  
  const isChecked = document.getElementById('show-password-toggle').checked;
  
  inputs.forEach(input => {
    if (input) {
      input.type = isChecked ? "text" : "password";
    }
  });
}

async function updateExpertise() {
  const expertiseLevel = document.getElementById("profile-expertise").value;
  try {
    const res = await fetch(`${API_BASE_URL}/current-user/profile`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expertiseLevel })
    });
  } catch (e) {
    console.error(e);
  }
}

// Renderizza dinamicamente le opzioni in base alla presenza di una password (es. login Google)
function renderSecurityOptions() {
  const container = document.getElementById("security-options-container");
  const hasPassword = currentUserData.hasPassword !== false;

  if (hasPassword) {
    container.innerHTML = `
      <button class="btn w-100 settings-item text-start border-0 rounded-0" onclick="openPasswordModal(true)">
        <span class="fw-semibold text-light" style="font-size: 0.9rem;">Cambia Password</span>
        <i class="bi bi-chevron-right text-secondary"></i>
      </button>
    `;
  } else {
    container.innerHTML = `
      <button class="btn w-100 settings-item text-start border-0 rounded-0" onclick="openPasswordModal(false)">
        <span class="fw-semibold text-info" style="font-size: 0.9rem;"><i class="bi bi-plus-circle me-2"></i>Aggiungi Password</span>
        <i class="bi bi-chevron-right text-secondary"></i>
      </button>
      <div class="settings-item opacity-75">
        <span class="fw-semibold text-light" style="font-size: 0.9rem;">Account registrato tramite Social</span>
        <i class="bi bi-person-check text-secondary"></i>
      </div>
    `;
  }
}

async function updateUsername() {
  const username = document.getElementById("profile-username").value.trim();
  if (!username) return alert("Il nome utente non può essere vuoto.");

  try {
    const res = await fetch(`${API_BASE_URL}/current-user/profile`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username })
    });
    
    if (res.ok) {
      alert("Username aggiornato!");
      currentUserData.username = username; // Aggiorna la memoria locale istantaneamente
    } else {
      alert((await res.json()).error || "Errore");
    }
  } catch (e) { 
    alert("Errore di rete"); 
  }
}

function openPasswordModal(requiresOld) {
  document.getElementById("old-password").value = "";
  document.getElementById("new-password").value = "";
  document.getElementById("confirm-password").value = "";
  
  const oldContainer = document.getElementById("old-password-container");
  const titleEl = document.getElementById("passwordModalLabel"); // ID corretto
  
  if (requiresOld) {
    oldContainer.style.display = "block";
    titleEl.innerText = "Modifica Password";
  } else {
    oldContainer.style.display = "none";
    titleEl.innerText = "Crea Password";
  }
  
  passwordModalInstance.show();
}

async function updatePassword() {
  const oldPassword = document.getElementById("old-password").value;
  const newPassword = document.getElementById("new-password").value;
  const confirm = document.getElementById("confirm-password").value;
  const errorAlert = document.getElementById("password-error-alert");
  const btn = document.getElementById("save-pwd-btn");

  const requiresOld = document.getElementById("old-password-container").style.display !== "none";

  // Reset alert
  errorAlert.classList.add("d-none");

  // Validazione Frontend
  if (requiresOld && !oldPassword) {
    errorAlert.innerText = "Inserisci la tua password attuale.";
    errorAlert.classList.remove("d-none");
    return;
  }
  if (!newPassword || newPassword !== confirm) {
    errorAlert.innerText = "Le nuove password non coincidono.";
    errorAlert.classList.remove("d-none");
    return;
  }

  btn.disabled = true;
  btn.innerText = "Salvataggio...";

  try {
    const res = await fetch(`${API_BASE_URL}/current-user/profile`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword, newPassword })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      if (typeof window.showToast === 'function') {
        window.showToast("Password aggiornata con successo!", "success");
      } else {
        alert("Password aggiornata con successo!");
      }
      passwordModalInstance.hide();
      currentUserData.hasPassword = true; 
      renderSecurityOptions();
    } else {
      // Mostra l'errore dentro la modale senza chiuderla
      errorAlert.innerText = data.error || "Errore durante il salvataggio.";
      errorAlert.classList.remove("d-none");
    }
  } catch (e) { 
    errorAlert.innerText = "Errore di rete.";
    errorAlert.classList.remove("d-none");
  } finally {
    btn.disabled = false;
    btn.innerText = "Salva Password";
  }
}

function openDeleteUserModal() {
  const inputField = document.getElementById("delete-confirm-input");
  const deleteBtn = document.getElementById("confirm-delete-user-btn");
  
  // Costruiamo la stringa target e la mostriamo nell'HTML
  const targetString = `delete ${currentUserData.username}`;
  document.getElementById("delete-target-text").innerText = targetString;
  
  // Reset del campo e del bottone
  inputField.value = "";
  deleteBtn.disabled = true;

  // Assegnazione diretta e pulita dell'evento
  inputField.oninput = (e) => {
    const currentInput = e.target.value.trim();
    // Il bottone si abilita solo se l'input combacia perfettamente
    deleteBtn.disabled = (currentInput !== targetString);
  };

  deleteUserModalInstance.show();
}

function checkDeleteConfirmationText(e) {
  // Verifichiamo direttamente contro la stringa generata, ignorando il dataset HTML
  const targetString = `delete ${currentUserData.username}`;
  const deleteBtn = document.getElementById("confirm-delete-user-btn");
  
  if (deleteBtn) {
    deleteBtn.disabled = (e.target.value.trim() !== targetString);
  }
}

async function confirmDeleteUser() {
  try {
    const res = await fetch(`${API_BASE_URL}/current-user/profile`, { method: "DELETE" });
    if (res.ok) {
      deleteUserModalInstance.hide();
      alert("Account eliminato con successo. Arrivederci!");
      window.location.replace("/"); 
    } else {
      alert((await res.json()).error || "Errore");
    }
  } catch (e) { alert("Errore di rete"); }
}

async function updateUserType() {
  const type = document.getElementById("profile-type").value;
  try {
    const res = await fetch(`${API_BASE_URL}/current-user/profile`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type })
    });
  } catch (e) { console.error(e); }
}

function renderCuratorStatus() {
  const container = document.getElementById("curator-status-container");
  const status = currentUserData.curator_status;
  const role = currentUserData.role; // admin e curator hanno il ruolo esplicito

  if (role === 'admin' || role === 'curator' || status === 'approved') {
    container.innerHTML = `
      <div class="settings-item bg-success bg-opacity-10">
        <div>
          <p class="fw-semibold text-success mb-0" style="font-size: 0.9rem;"><i class="bi bi-check-circle-fill me-2"></i>Curatore Abilitato</p>
          <p class="text-secondary mb-0 mt-1" style="font-size: 0.8rem;">Hai l'accesso per aggiungere e gestire musei.</p>
        </div>
      </div>
    `;
  } else if (status === 'pending') {
    container.innerHTML = `
      <div class="settings-item bg-warning bg-opacity-10">
        <div>
          <p class="fw-semibold text-warning mb-0" style="font-size: 0.9rem;"><i class="bi bi-hourglass-split me-2"></i>In attesa di approvazione</p>
          <p class="text-secondary mb-0 mt-1" style="font-size: 0.8rem;">Gli amministratori stanno valutando la tua richiesta.</p>
        </div>
      </div>
    `;
  } else {
    // Se lo status è 'none' o 'rejected'
    container.innerHTML = `
      <button class="btn w-100 settings-item text-start border-0 rounded-0" onclick="requestCuratorRole()">
        <div>
          <span class="fw-semibold text-info" style="font-size: 0.9rem;"><i class="bi bi-stars me-2"></i>Diventa Curatore</span>
          <p class="text-secondary mb-0 mt-1" style="font-size: 0.8rem;">Richiedi l'abilitazione per gestire la pagina di un museo</p>
        </div>
        <i class="bi bi-chevron-right text-secondary"></i>
      </button>
    `;
  }
}

async function requestCuratorRole() {
  const isConfirmed = confirm("Vuoi inviare la richiesta per diventare curatore? Il team valuterà il tuo profilo.");
  if (!isConfirmed) return;
  
  try {
    const res = await fetch(`${API_BASE_URL}/current-user/profile`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestCurator: true })
    });
    if (res.ok) {
      alert("Richiesta inviata con successo!");
      currentUserData.curator_status = 'pending';
      renderCuratorStatus(); // Aggiorna UI istantaneamente
    } else {
      alert("Errore durante l'invio della richiesta.");
    }
  } catch (e) { alert("Errore di connessione."); }
}