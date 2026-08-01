document.addEventListener("DOMContentLoaded", async () => {
  // 1. Recuperiamo l'ID della visita dall'URL
  const urlParams = new URLSearchParams(window.location.search);
  const visitId = urlParams.get("id");

  if (!visitId) {
    alert("ID visita mancante nell'URL.");
    window.location.href = "/my-visits";
    return;
  }

  try {
    // 2. Chiamiamo la nuova rotta API per la singola visita
    const response = await fetch(`${API_BASE_URL}/visits/${visitId}`);
    if (!response.ok)
      throw new Error("Impossibile caricare i dettagli della visita.");

    const visit = await response.json();

    // 3. Popoliamo il Banner superiore
    const banner = document.getElementById("visit-banner");
    if (visit.coverImage) {
      banner.style.backgroundImage = `url('${visit.coverImage}')`;
    } else if (visit.items && visit.items.length > 0 && visit.items[0].image) {
      // niente copertina, ma c'è almeno un'opera con un'immagine
      banner.style.backgroundImage = `url('${visit.items[0].image}')`;
    } else {
      // gradiente di fallback
      banner.style.background = "linear-gradient(135px, #1e1e2f, #11111d)";
    }

    document.getElementById("visit-main-title").innerText = visit.title;
    document.getElementById("visit-museum-sub").innerText = visit.museum
      ? `Presso: ${visit.museum.name}`
      : "Museo non specificato";

    if (visit.description) {
      document.getElementById("visit-description").innerText =
        visit.description;
    }

    // 4. Generiamo la Timeline delle Opere
    const timeline = document.getElementById("visit-timeline");
    timeline.innerHTML = "";

    if (!visit.items || visit.items.length === 0) {
      timeline.innerHTML = `<p class="text-secondary">Questa visita non contiene ancora nessuna opera.</p>`;
      return;
    }

    // Cicliamo le opere popolate dal DB (mantenendo l'ordine del carrello originario!)
    visit.items.forEach((item, index) => {
            const descText = (item.description && item.description.length > 0) 
              ? item.description[0].description 
              : '';
              
            // Creiamo il contenuto del riquadro ingrandito
            const popoverContent = `<img src='${item.image}' style='width: 100%; height: auto;'>`;

            timeline.innerHTML += `
                <li class="timeline-item">
                    <div class="card custom-card p-3">
                        <div class="row align-items-center g-3">
                            ${item.image ? `
                            <div class="col-3 col-md-2">
                                <img src="${item.image}" class="img-fluid rounded" 
                                     style="max-height: 70px; object-fit: cover; width: 100%; cursor: zoom-in;"
                                     data-bs-toggle="popover" 
                                     data-bs-placement="top" 
                                     data-bs-trigger="hover" 
                                     data-bs-html="true" 
                                     data-bs-delay='{"show": 1500, "hide": 200}'
                                     data-bs-custom-class="image-popover"
                                     data-bs-content="${popoverContent}">
                            </div>
                            ` : ''}
                            <div class="col">
                                <span class="badge bg-dark border border-secondary text-secondary mb-1">Tappa ${index + 1}</span>
                                <h5 class="h6 mb-1 text-white">${item.name}</h5>
                                <p class="small text-white-50 mb-0">${descText}</p>
                            </div>
                        </div>
                    </div>
                </li>
            `;
        });

        const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
        const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));
  } catch (error) {
    console.error(error);
    document.getElementById("visit-main-title").innerText =
      "Errore di caricamento";
    document.getElementById("visit-timeline").innerHTML =
      `<div class="alert alert-danger bg-transparent text-danger border-danger">${error.message}</div>`;
  }
});
