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

  const formData = new FormData(form);

  // Raccogliamo SOLO i dati base del Museo
  const payload = {
    name: formData.get("name"),
    address: formData.get("address"),
    contact_email: formData.get("contact_email"),
    contact_phone: formData.get("contact_phone"),
    image: formData.get("image"),
    tags: formData.get("tags"),
    sections: [], // Inviamo le sezioni vuote: le riempirà l'utente dall'editor!
  };

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
      window.location.href = `/edit-museum?id=${data.id}`;
      
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