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

function startVisit()
{
  const urlParams = new URLSearchParams(window.location.search);
  const visitId = urlParams.get("id");
  window.location.replace(`/navigator/visits/${visitId}`);
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

    // recuperiamo l'utente corrente
    let currentUser = null;
    try {
      const userRes = await fetch(`${API_BASE_URL}/current-user`);
      if (userRes.ok) {
        currentUser = await userRes.json();
      }
    } catch (e) {
      console.warn("Utente non autenticato", e);
    }

    // se l'utente è il creatore della visita o un admin, mostriamo il tasto Modifica
    if (currentUser) {
      const creatorId = visit.creator?._id || visit.creator;
      if (currentUser._id === creatorId || currentUser.role === 'admin') {
        const editBtn = document.getElementById("edit-visit-btn");
        if (editBtn) editBtn.classList.remove("d-none");
      }
    }
    
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
    const museumSub = document.getElementById("visit-museum-sub");
    if (visit.museumId) {
      museumSub.innerText = `Presso: ${visit.museumId.name || 'Museo'}`;
      museumSub.dataset.museumId = visit.museumId._id || visit.museumId; // AGGIUNTO: Salva l'ID nel dataset
    } else {
      museumSub.innerText = "Museo non specificato";
    }

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

            // LOGICA ADOZIONE: Mostriamo il warning se l'opera è in prestito o in transito
            let adoptionWarning = "";
            const adoption = work.adoptionId || work.adoption; // Dipende da come lo popoli nel backend
            
            if (adoption && (adoption.status === 'accepted' || adoption.status === 'active')) {
              const beginDate = new Date(adoption.beginDate).toLocaleDateString('it-IT');
              const endDate = new Date(adoption.endDate).toLocaleDateString('it-IT');
              
              adoptionWarning = `
                <div class="alert alert-warning mt-2 mb-0 py-1 px-2 small border-warning text-dark">
                  <i class="bi bi-exclamation-triangle-fill me-1"></i>
                  <strong>Attenzione:</strong> la seguente opera non sarà al museo dal <strong>${beginDate}</strong> al <strong>${endDate}</strong>.
                </div>
              `;
            }

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
                                ${adoptionWarning}
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

// reindirizza all'editor passando l'ID della visita e del museo
function editVisit() {
  const urlParams = new URLSearchParams(window.location.search);
  const visitId = urlParams.get("id");
  const museumId = document.getElementById("visit-museum-sub")?.dataset?.museumId || "";
  
  window.location.href = `/create-visit?edit=${visitId}&museumId=${museumId}`;
}