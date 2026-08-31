document.addEventListener("DOMContentLoaded", () => {
  buildScheduleForm();

  initImageWidget("edit-museum-image-widget", "museum-image", "Immagine di Copertina del Museo");
});

async function museumHandleSave(event) {
  if (event) event.preventDefault();

  const form = document.querySelector("form");
  if (!form) return;
  
  // Se i campi required (nome e indirizzo) sono vuoti, il browser li blocca in automatico 
  // ma facciamo comunque un mini check
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const name = document.getElementById("museum-name").value.trim();
  const address = document.getElementById("museum-address").value.trim();
  
  if (!name || !address) {
    alert("Nome e Indirizzo sono obbligatori!");
    return;
  }

  const payload = getMuseumFormData();
  payload.sections = [];

  // Cambiamo il testo del bottone per dare feedback
  const saveBtn = document.querySelector(".btn-gradient");
  const originalText = saveBtn.innerHTML;
  saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Creazione in corso...';
  saveBtn.disabled = true;

  try {
    const response = await fetch(`${API_BASE_URL}/save-museum`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      
      // La magia! Redirigiamo l'utente direttamente all'editor del nuovo museo
      window.location.replace(`/edit-museum?id=${data.id}`);
      
    } else {
      const errorData = await response.json();
      alert(`Errore: ${errorData.error}\nDettaglio: ${errorData.details}`);
      saveBtn.innerHTML = originalText;
      saveBtn.disabled = false;
    }
  } catch (error) {
    console.error("Errore nell'invio:", error);
    alert("Errore di connessione al server.");
    saveBtn.innerHTML = originalText;
    saveBtn.disabled = false;
  }
}

// Raccoglie tutti i dati dal form in un unico payload formattato per Mongoose
function getMuseumFormData() {
  const selectedServices = Array.from(document.querySelectorAll('.srv-cb:checked')).map(cb => cb.value);
  const selectedAccessibility = Array.from(document.querySelectorAll('.acc-cb:checked')).map(cb => cb.value);

  const payload = {
    name: document.getElementById("museum-name").value.trim(),
    address: document.getElementById("museum-address").value.trim(),
    contact_email: document.getElementById("museum-email").value.trim(),
    contact_phone: document.getElementById("museum-phone").value.trim(),
    image: document.getElementById("museum-image").value.trim(),
    ticketPrice: parseFloat(document.getElementById("museum-price").value) || 0,
    tags: document.getElementById("museum-tags").value ? document.getElementById("museum-tags").value.split(",").map(t => t.trim()) : [],
    // Mappato come subdocumenti { services: string } per combaciare con servicesSchema
    services: selectedServices.map(val => ({ services: val })),
    accessibility: selectedAccessibility.length > 0 ? selectedAccessibility : ['none']
  };

  // Raccoglie SOLO i giorni in cui c'è la spunta
  const schedule = [];
  document.querySelectorAll('.schedule-row').forEach(row => {
    const day = row.dataset.day;
    const isOpen = row.querySelector('.sch-toggle').checked;
    const hours = row.querySelector('.sch-hours').value.trim();
    
    if (isOpen) {
      schedule.push({ day, hours });
    }
  });
  
  payload.schedule = schedule;
  return payload;
}

// Genera le righe degli orari dinamicamente (con checkbox classica)
function buildScheduleForm() {
  const container = document.getElementById("schedule-container");
  if (!container) return;

  const days = [
    { id: 'monday', label: 'Lunedì' },
    { id: 'tuesday', label: 'Martedì' },
    { id: 'wednesday', label: 'Mercoledì' },
    { id: 'thursday', label: 'Giovedì' },
    { id: 'friday', label: 'Venerdì' },
    { id: 'saturday', label: 'Sabato' },
    { id: 'sunday', label: 'Domenica' }
  ];

  container.innerHTML = days.map(day => `
    <div class="col-12 col-lg-6 d-flex align-items-center schedule-row mb-2" data-day="${day.id}">
      <!-- Checkbox e Label cliccabile -->
      <div class="form-check m-0 d-flex align-items-center me-3" style="width: 110px;">
        <input class="form-check-input sch-toggle me-2 mt-0 cursor-pointer" type="checkbox" id="sch-${day.id}" onchange="toggleScheduleInput(this)">
        <label class="form-check-label text-secondary small fw-bold cursor-pointer mb-0" for="sch-${day.id}">
          ${day.label}
        </label>
      </div>
      
      <!-- Input di testo -->
      <input type="text" class="form-control form-control-sm glass-input text-white sch-hours flex-grow-1" placeholder="Es. 09-12, 15-18" disabled>
    </div>
  `).join('');
}

// Sblocca l'input quando la checkbox viene spuntata
function toggleScheduleInput(checkbox) {
  const row = checkbox.closest('.schedule-row');
  const input = row.querySelector('.sch-hours');
  
  if (input) {
    // Se spuntata, rimuove il disabled (sblocca). Se tolta, lo rimette.
    input.disabled = !checkbox.checked;
    
    if (!checkbox.checked) {
      input.value = ""; // Svuota il campo se togli la spunta
    } else {
      input.focus(); // UX: Mette subito il cursore lampeggiante dentro l'input!
    }
  }
}