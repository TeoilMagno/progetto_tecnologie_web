// config.js -> modifiche alla porta o all'url non saranno da modificare in 20 file diversi
// window.location.origin prende automaticamente 'http://localhost:8000' in locale 
// e 'https://www.tuosito.com' in produzione!
const API_BASE_URL = window.location.origin + "/api";

// Funzione helper per tradurre l'indirizzo in coordinate
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
