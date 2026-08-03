function goBackToVisits() {
  // Controlliamo da dove proviene l'utente
  const referrer = document.referrer;

  // Se proviene da "Le mie visite" o da "Esplora visite", torna alla pagina precedente reale
  if (referrer && (referrer.includes('/my-visits') || referrer.includes('/explore-visits'))) {
    window.location.href = referrer;
  } else {
    // Fallback sicuro se è arrivato tramite un link diretto, segnalibro o dopo un login:
    // Rimanda alla pagina delle visite pubbliche
    window.location.href = '/public-visits';
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // recuperiamo l'ID della visita dall'URL
  const urlParams = new URLSearchParams(window.location.search);
  const visitId = urlParams.get("id");

  if (!visitId) {
    alert("ID visita mancante nell'URL.");
    window.location.href = "/my-visits";
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/visits/${visitId}`);
    if (!response.ok)
      throw new Error("Impossibile caricare i dettagli della visita.");

    const visit = await response.json();

    // popoliamo il Banner superiore
    const banner = document.getElementById("visit-banner");
    if (visit.coverImage) {
      banner.style.backgroundImage = `url('${visit.coverImage}')`;
    } else if (visit.works && visit.works.length > 0 && visit.works[0].image) {
      // niente copertina, ma c'è almeno un'opera con un'immagine
      banner.style.backgroundImage = `url('${visit.works[0].image}')`;
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

    // generiamo la timeline delle opere
    const timeline = document.getElementById("visit-timeline");
    timeline.innerHTML = "";

    if (!visit.works || visit.works.length === 0) {
      timeline.innerHTML = `<p class="text-secondary">Questa visita non contiene ancora nessuna opera.</p>`;
      return;
    }

    visit.works.forEach((work, index) => {
            const descText = (work.description && work.description.length > 0) 
              ? work.description[0].description 
              : '';
              
            // creiamo il contenuto del riquadro ingrandito
            const popoverContent = `<img src='${work.image}' style='width: 100%; height: auto;'>`;

            timeline.innerHTML += `
                <li class="timeline-work">
                    <div class="card custom-card p-3">
                        <div class="row align-works-center g-3">
                            ${work.image ? `
                            <div class="col-3 col-md-2">
                                <img src="${work.image}" class="img-fluid rounded" 
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
                                <h5 class="h6 mb-1 text-white">${work.name}</h5>
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
