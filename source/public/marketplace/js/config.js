// config.js -> modifiche alla porta o all'url non saranno da modificare in 20 file diversi
// window.location.origin prende automaticamente 'http://localhost:8000' in locale 
// e 'https://www.tuosito.com' in produzione!
const API_BASE_URL = window.location.origin + "/api";

// ==========================================
// STORE.JS - STATO GLOBALE DELL'APPLICAZIONE
// ==========================================

// Cache Musei e Coordinate
let cachedMuseums = [];
let myManagedMuseumsCache = null;
let userCoords = null;
let museumCoordsMap = {}; 
let myMuseumsAdminPage = 1;

// Cache Pristine (DB Completo)
let pristineMuseumsCache = [];
let pristineCurrentPage = 1;
let pristineTotalPages = 1;
let isEntireDbInCache = false;

let pristineWorksCache = [];
let pristineWorkPage = 1;
let pristineTotalWorkPages = 1;
let isEntireWorksDbInCache = false;

// Elementi correnti aperti
let currentItems = [];
let currentWorks = [];
let currentVisits = [];
let currentMuseumId = null;
let editModalInstance = null; // Se serviva in marketplace
let currentView = 'works';

// Variabili Paginazione Musei
let currentMuseumPage = 1;
let totalMuseumPages = 1;
let isFetchingMuseums = false;
let museumObserver = null;
let renderedMuseumsCount = 0;
let managedMuseumObserver = null;
const RENDER_CHUNK = 16; 

// Variabili Paginazione Opere
let currentWorkPage = 1;
let totalWorkPages = 1;
let isFetchingWorks = false;
let renderedWorksCount = 0;
let catalogObserver = null;
const WORK_RENDER_CHUNK = 12;

// Variabili Paginazione Items (Bookshop)
let currentItemsPage = 1;
let totalItemsPages = 1;
let isFetchingItems = false;
let renderedItemsCount = 0;
const ITEMS_RENDER_CHUNK = 12;

// Aggiungi in cima a store.js se non c'è già
const globalSentinel = document.createElement("div");
globalSentinel.id = "global-infinite-sentinel";
globalSentinel.className = "col-12 text-center py-4 d-none w-100";
globalSentinel.innerHTML = `
  <div class="spinner-border text-light spinner-border-sm" role="status"></div>
  <p class="text-secondary small mt-1">Caricamento altri elementi...</p>
`;

async function geocodeAddress(address) {
  try {
    // Usiamo encodeURIComponent per gestire spazi e virgole nell'indirizzo
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ArtAround/1.0 (progetto universitario)' 
      }
    });

    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon) 
      };
    }
  } catch (error) {
    console.error("Errore durante il geocoding dell'indirizzo:", error);
  }
  return { lat: null, lon: null };
}

// Popup di conferma universale (Promise-based)
window.showCustomConfirm = function(title, message, isDanger = true) {
  return new Promise((resolve) => {
    const existingModal = document.getElementById("custom-confirm-modal");
    if (existingModal) existingModal.remove();

    const btnClass = isDanger ? "btn-danger" : "btn-info text-dark";
    const iconClass = isDanger ? "bi-exclamation-triangle-fill text-danger" : "bi-question-circle-fill text-info";
    const confirmText = isDanger ? "Elimina" : "Conferma";
    const shadowColor = isDanger ? "220, 53, 69" : "13, 202, 240";

    const modalHTML = `
      <div class="modal fade" id="custom-confirm-modal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content glass-modal text-white" style="border: 1px solid rgba(255, 255, 255, 0.1); background-color: #18181b; box-shadow: 0 0 35px rgba(0, 0, 0, 0.7); border-radius: 16px;">
            <div class="modal-header border-bottom border-secondary border-opacity-25 p-3">
              <h5 class="modal-title d-flex align-items-center" style="font-weight: 700;">
                <i class="bi ${iconClass} me-2 fs-5"></i>
                <span>${title}</span>
              </h5>
              <button type="button" class="btn-close custom-close" data-bs-dismiss="modal" aria-label="Chiudi"></button>
            </div>
            <div class="modal-body py-4 px-3">
              <p class="mb-0 text-secondary" style="font-size: 1rem; line-height: 1.5;">${message}</p>
            </div>
            <div class="modal-footer border-top border-secondary border-opacity-25 p-2 d-flex gap-2 justify-content-end">
              <button type="button" class="btn btn-sm btn-glass px-4 py-2" data-bs-dismiss="modal" style="font-weight: 600;">Annulla</button>
              <button type="button" id="custom-confirm-yes-btn" class="btn btn-sm ${btnClass} px-4 py-2" style="border-radius: 50px; font-weight: 600; border: none; box-shadow: 0 4px 15px rgba(${shadowColor}, 0.3);">${confirmText}</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    const modalElement = document.getElementById("custom-confirm-modal");
    const bsModal = new bootstrap.Modal(modalElement);
    let isConfirmed = false;

    document.getElementById("custom-confirm-yes-btn").addEventListener("click", () => {
      isConfirmed = true;
      bsModal.hide();
    });

    // Si risolve con true o false a seconda del tasto cliccato (o se l'utente clicca fuori)
    modalElement.addEventListener("hidden.bs.modal", () => {
      modalElement.remove();
      resolve(isConfirmed);
    });

    bsModal.show();
  });
};

// Popup di input testuale universale (Promise-based)
window.showCustomPrompt = function(title, placeholder) {
  return new Promise((resolve) => {
    const existingModal = document.getElementById("custom-prompt-modal");
    if (existingModal) existingModal.remove();

    const modalHTML = `
      <div class="modal fade" id="custom-prompt-modal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content glass-modal text-white" style="border: 1px solid rgba(255, 255, 255, 0.1); background-color: #18181b; box-shadow: 0 0 35px rgba(0, 0, 0, 0.7); border-radius: 16px;">
            <div class="modal-header border-bottom border-secondary border-opacity-25 p-3">
              <h5 class="modal-title d-flex align-items-center" style="font-weight: 700;">
                <i class="bi bi-wikipedia me-2 text-info fs-5"></i>
                <span>${title}</span>
              </h5>
              <button type="button" class="btn-close custom-close" data-bs-dismiss="modal" aria-label="Chiudi"></button>
            </div>
            <div class="modal-body py-4 px-3">
              <input type="text" id="custom-prompt-input" class="form-control glass-input text-white border-secondary" placeholder="${placeholder}" autocomplete="off">
            </div>
            <div class="modal-footer border-top border-secondary border-opacity-25 p-2 d-flex gap-2 justify-content-end">
              <button type="button" class="btn btn-sm btn-glass px-4 py-2" data-bs-dismiss="modal" style="font-weight: 600;">Annulla</button>
              <button type="button" id="custom-prompt-yes-btn" class="btn btn-sm btn-info text-dark px-4 py-2" style="border-radius: 50px; font-weight: 600; border: none; box-shadow: 0 4px 15px rgba(13, 202, 240, 0.3);">Cerca</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    const modalElement = document.getElementById("custom-prompt-modal");
    const bsModal = new bootstrap.Modal(modalElement);
    const inputEl = document.getElementById("custom-prompt-input");

    // UX: Mette automaticamente il cursore nell'input appena la modale si apre
    modalElement.addEventListener('shown.bs.modal', () => {
      inputEl.focus();
    });

    let returnedValue = null;

    const confirmAction = () => {
      returnedValue = inputEl.value;
      bsModal.hide();
    };

    // Accetta sia il click sul bottone che la pressione del tasto Invio
    document.getElementById("custom-prompt-yes-btn").addEventListener("click", confirmAction);
    inputEl.addEventListener("keypress", (e) => {
      if (e.key === 'Enter') confirmAction();
    });

    // Risolve la promise passando il testo scritto (o null se annullato)
    modalElement.addEventListener("hidden.bs.modal", () => {
      modalElement.remove();
      resolve(returnedValue);
    });

    bsModal.show();
  });
};

// Intercept all alerts and show a beautiful custom toast!
(function() {
  function initToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  window.showToast = function(message, type = 'info') {
    const container = initToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast-box toast-${type}`;
    
    let iconClass = 'bi-info-circle';
    if (type === 'success') iconClass = 'bi-check-circle';
    if (type === 'error') iconClass = 'bi-exclamation-circle';
    if (type === 'warning') iconClass = 'bi-exclamation-triangle';

    toast.innerHTML = `
      <i class="bi ${iconClass} fs-5 text-${type === 'error' ? 'danger' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info'}"></i>
      <div style="flex-grow: 1;">${message}</div>
      <button class="toast-close"><i class="bi bi-x-lg"></i></button>
    `;

    container.appendChild(toast);

    // Slide in
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    const closeBtn = toast.querySelector('.toast-close');
    const dismiss = () => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
      }, 300);
    };

    closeBtn.addEventListener('click', dismiss);

    // Auto dismiss after 5 seconds
    setTimeout(dismiss, 5000);
  };

  // Override window.alert
  window.alert = function(message) {
    if (!message) return;
    let type = 'info';
    const msgLower = message.toString().toLowerCase();
    if (msgLower.includes('errore') || msgLower.includes('fallit') || msgLower.includes('negato') || msgLower.includes('obbligatorio') || msgLower.includes('attenzione') || msgLower.includes('mancante')) {
      type = 'error';
    } else if (msgLower.includes('successo') || msgLower.includes('completato') || msgLower.includes('grazie') || msgLower.includes('salvato') || msgLower.includes('eliminat')) {
      type = 'success';
    } else if (msgLower.includes('attenzione') || msgLower.includes('avviso')) {
      type = 'warning';
    }
    window.showToast(message, type);
  };
})();
