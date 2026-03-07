async function museumHandleSave(event) {
  if (event) event.preventDefault(); 

  const form = document.querySelector('form');
  if (!form) return;
  const formData = new FormData(form);

  // 1. Raccogliamo i dati base del Museo
  const payload = {
    name: formData.get('name'),
    address: formData.get('address'),
    contact_email: formData.get('contact_email'),
    contact_phone: formData.get('contact_phone'),
    image: formData.get('image'),
    tags: formData.get('tags'),
    sections: [] 
  };

  // 2. Raccogliamo le sezioni dinamiche
  // Cerchiamo tutti i div con classe "section-block"
  const sectionElements = document.querySelectorAll('.section-block');

  console.log("Sectionelements length: ", sectionElements.length)
  sectionElements.forEach((sectionEl) => {
    // Evitiamo di processare i div nidificati se la struttura si ripete
    // Prendiamo solo i campi input diretti di questa sezione
    const sectionTitleInput = sectionEl.querySelector('input[name="sectionName[]"]');
    const sectionImageInput = sectionEl.querySelector('input[name="sectionImage[]"]');

    if (sectionTitleInput) {
      // 3. Raccogliamo le opere appartenenti a QUESTA specifica sezione
      const workElements = sectionEl.querySelectorAll('.work-block');
      const worksArray = Array.from(workElements).map(workEl => ({
        name: workEl.querySelector('input[name="itemName[]"]')?.value || '',
        price: workEl.querySelector('input[name="price[]"]')?.value || 0,
        image: workEl.querySelector('input[name="image_path_item[]"]')?.value || '',
        quantity: workEl.querySelector('input[name="quantity[]"]')?.value || 1
      }));

      // Aggiungiamo la sezione con le sue opere al payload
      payload.sections.push({
        title: sectionTitleInput.value,
        image: sectionImageInput?.value || '',
        works: worksArray
      });
    }
  });

  console.log("Payload totale pronto per l'invio:", payload);

  try {
    // Inviamo tutto all'endpoint globale
    console.log("sto salvando il museo...")
    const response = await fetch('/api/save-museum', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      alert("Museo, Sezioni e Opere salvati con successo!");
      window.location.href = "/";
    } else {
      const errorData = await response.json();
      alert("Errore durante il salvataggio: " + errorData.error);
    }
  } catch (error) {
    console.error("Errore nell'invio:", error);
    // alert("Errore di connessione al server.");
  }
}