function goBackToVisits() {
  // Se c'è una cronologia nel browser, torna semplicemente alla pagina precedente
  if (window.history.length > 1) {
    window.history.back();
  } else {
    // Fallback sicuro se l'utente ha aperto il link in una nuova scheda
    window.location.replace('/'); 
  }
}

function startVisit() {
  const urlParams = new URLSearchParams(window.location.search);
  const visitId = urlParams.get("id");

  const museumSub = document.getElementById("visit-museum-sub");
  const museumId = museumSub ? museumSub.dataset.museumId : "";
  // Estraiamo il nome pulito rimuovendo il prefisso "Presso: "
  const museumName = museumSub ? museumSub.innerText.replace('Presso: ', '').trim() : "";
  
  if (museumId) {
    localStorage.setItem('selected_museum_id', museumId);
    localStorage.setItem('selected_museum_name', museumName);
  }
  
  window.location.href = `/navigator/map?visitId=${visitId}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  // recuperiamo l'ID della visita dall'URL
  const urlParams = new URLSearchParams(window.location.search);
  const visitId = urlParams.get("id");

  if (!visitId) {
    alert("ID visita mancante nell'URL.");
    window.location.replace("/my-visits");
    return;
  }

  try {
    const [response, userRes] = await Promise.all([
      fetch(`${API_BASE_URL}/visits/${visitId}`),
      fetch(`${API_BASE_URL}/current-user`).catch(() => null) // non deve mai bloccare la pagina
    ]);
    
    if (!response.ok) {
      if (response.status === 403) {
        alert("Questa visita è privata o richiede il login per essere visualizzata.");
        window.location.replace('/403'); // O lo rimandi alla home
        return;
      }

      if (response.status === 404) {
        alert("Visita non trovata.");
        window.location.replace('/404'); 
        return;
      }

      throw new Error("Impossibile caricare i dettagli della visita.");
    }

    // mostra la pagina solo se l'utente e' autorizzato
    const contentWrapper = document.getElementById("visit-content-wrapper");
    if (contentWrapper) contentWrapper.style.display = "block";
    const visitData = await response.json();
    const visit = visitData.visit;

    // recuperiamo l'utente corrente
    let currentUser = null;
    if (userRes && userRes.ok) {
      try { currentUser = await userRes.json(); } catch (e) { console.warn("Utente non autenticato", e); }
    }

    // se l'utente è il creatore della visita o un admin, mostriamo il tasto Modifica
    if (currentUser) {
      const creatorId = visit.creator?._id || visit.creator;
      if (currentUser._id === creatorId || currentUser.role === 'admin') {
        const editBtn = document.getElementById("edit-visit-btn");
        if (editBtn) editBtn.classList.remove("d-none");
      }
    }
    
    // popoliamo il Banner superiore e la sidebar image
    const banner = document.getElementById("visit-banner");
    let bgImage = "";
    if (visit.coverImage) {
      bgImage = visit.coverImage;
    } else if (visit.works && visit.works.length > 0 && visit.works[0].image) {
      bgImage = visit.works[0].image;
    }

    if (bgImage) {
      banner.style.backgroundImage = `url('${bgImage}')`;
      const sidebarImg = document.getElementById("visit-sidebar-img");
      if (sidebarImg) sidebarImg.src = bgImage;
    } else {
      banner.style.background = "linear-gradient(135deg, #1e1e2f, #11111d)";
      const sidebarImg = document.getElementById("visit-sidebar-img");
      if (sidebarImg) sidebarImg.src = "/marketplace/favicon.svg";
    }

    document.getElementById("visit-main-title").innerText = visit.title;
    
    const museumSub = document.getElementById("visit-museum-sub");
    const museumBadge = document.getElementById("visit-museum-badge");
    if (visit.museumId) {
      museumSub.innerHTML = `<i class="bi bi-bank2 text-info"></i> Presso: ${visit.museumId.name || 'Museo'}`;
      museumSub.dataset.museumId = visit.museumId._id || visit.museumId; 
      if (museumBadge) museumBadge.innerText = visit.museumId.name || 'Museo';
    } else {
      museumSub.innerHTML = `<span class="text-danger fw-bold px-2 py-1 bg-danger bg-opacity-25 rounded border border-danger"><i class="bi bi-exclamation-triangle-fill me-1"></i> Attenzione: Il museo ospitante è stato chiuso o rimosso dalla piattaforma.</span>`;
      if (museumBadge) museumBadge.innerText = "Museo Non Disponibile";
    }

    if (visit.description) {
      document.getElementById("visit-description-container").classList.remove('d-none');
      document.getElementById("visit-description").innerText = visit.description;
    }

    // Caratteristiche extra
    const levelMap = {
      simple: "Semplice (Bambini / Scuole)",
      medium: "Intermedio (Divulgativo)",
      professional: "Professionale (Appassionati)",
      expert: "Accademico (Specialisti)"
    };
    const lengthMap = {
      short: "Breve (Passo rapido)",
      medium: "Medio (Passo normale)",
      long: "Lungo (Passo lento)",
      exhaustive: "Esaustivo (Dettagliato)"
    };
    
    document.getElementById("visit-meta-level").innerText = levelMap[visit.expertiseLevel] || "Intermedio";
    document.getElementById("visit-meta-length").innerText = lengthMap[visit.preferredLength] || "Medio";
    
    const quizCount = visit.quiz ? visit.quiz.length : 0;
    if (quizCount > 0) {
      document.getElementById("visit-meta-quiz").innerHTML = `<span class="text-info"><i class="bi bi-patch-check-fill me-1"></i> Sì (${quizCount} quiz)</span>`;
    } else {
      document.getElementById("visit-meta-quiz").innerText = "Non incluso";
    }

    // Target
    const audienceMap = {
      kids: "Bambini",
      families: "Famiglie",
      adults: "Adulti",
      schools: "Scuole",
      all: "Per Tutti"
    };
    const audienceContainer = document.getElementById("visit-meta-audience");
    if (visit.targetAudience && visit.targetAudience.length > 0) {
      audienceContainer.innerHTML = visit.targetAudience.map(aud => {
        const text = audienceMap[aud] || aud;
        return `<span class="badge bg-secondary text-white bg-opacity-25 border border-secondary border-opacity-50 px-2 py-1 small">${text}</span>`;
      }).join(" ");
    } else {
      audienceContainer.innerHTML = `<span class="text-muted small">Nessuno specificato (Generico)</span>`;
    }

    // Accessibilità
    const accMap = {
      wheelchair_accessible: "Sedia a Rotelle",
      blind_friendly: "Non Vedenti",
      deaf_friendly: "Non Udenti",
      dsa_friendly: "DSA Friendly",
      none: "Standard"
    };
    const accIcons = {
      wheelchair_accessible: "bi-person-wheelchair",
      blind_friendly: "bi-eye-slash-fill",
      deaf_friendly: "bi-ear-fill",
      dsa_friendly: "bi-brain",
      none: "bi-info-circle"
    };
    const accContainer = document.getElementById("visit-meta-accessibility");
    if (visit.accessibility && visit.accessibility.length > 0) {
      accContainer.innerHTML = visit.accessibility.map(acc => {
        const text = accMap[acc] || acc;
        const icon = accIcons[acc] || "bi-info-circle";
        return `<span class="badge bg-success text-white bg-opacity-10 border border-success border-opacity-25 px-2 py-1 small"><i class="bi ${icon} me-1"></i>${text}</span>`;
      }).join(" ");
    } else {
      accContainer.innerHTML = `<span class="text-muted small">Standard (nessuna facilitazione indicata)</span>`;
    }

    // Stats Sidebar Biglietto
    const stopsCount = visit.works ? visit.works.length : 0;
    document.getElementById("visit-stops-count").innerText = `${stopsCount} Tappe`;
    document.getElementById("visit-sidebar-stops").innerText = `${stopsCount} ${stopsCount === 1 ? 'opera' : 'opere'}`;
    
    const duration = visit.duration || 0;
    document.getElementById("visit-sidebar-duration").innerText = `${duration} minuti`;
    
    const price = visit.price || 0;
    document.getElementById("visit-sidebar-price").innerText = price === 0 ? "Gratis" : `€${price.toFixed(2)}`;

    const creatorName = visit.creator && visit.creator.username ? visit.creator.username : "Curatore";
    document.getElementById("visit-sidebar-creator").innerText = creatorName;

    // generiamo la timeline delle opere
    const timeline = document.getElementById("visit-timeline");
    let html = "";

    if (!visit.works || visit.works.length === 0) {
      timeline.innerHTML = `<p class="text-secondary">Questa visita non contiene ancora nessuna opera.</p>`;
      return;
    }

    visit.works.forEach((work, index) => {
      if (!work) {
        html += `
            <li class="timeline-work">
                <div class="card custom-card p-3 border-danger bg-danger bg-opacity-10" style="border-radius: 12px;">
                    <div class="row align-works-center g-3">
                        <div class="col">
                            <span class="badge bg-danger border border-danger mb-1"><i class="bi bi-trash-fill me-1"></i> Tappa ${index + 1} - Opera Rimossa</span>
                            <h5 class="h6 mb-1 text-danger">Contenuto non disponibile</h5>
                            <p class="small text-danger opacity-75 mb-0">Quest'opera è stata eliminata definitivamente dal database e non è più visitabile.</p>
                        </div>
                    </div>
                </div>
            </li>
        `;
        return; // Salta il resto del ciclo per questa specifica opera e passa alla successiva
      }
      
      const level = work.description?.[visit.expertiseLevel] ? visit.expertiseLevel : 'medium';
      const lengthKey = work.description?.[level]?.[visit.preferredLength] ? visit.preferredLength : 'medium';
      const descText = work.description?.[level]?.[lengthKey] || '';
        
      // LOGICA ADOZIONE: Mostriamo il warning se l'opera è in prestito o in transito
      let adoptionWarning = "";
      const adoption = work.adoptionId || work.adoption; // Dipende da come lo popoli nel backend
      
      if (adoption && (adoption.status === 'accepted' || adoption.status === 'active')) {
        const beginDate = new Date(adoption.beginDate).toLocaleDateString('it-IT');
        const endDate = new Date(adoption.endDate).toLocaleDateString('it-IT');
        
        adoptionWarning = `
          <div class="alert alert-warning mt-2 mb-0 py-1 px-2 small border-warning text-dark d-flex align-items-center gap-1" style="border-radius: 8px;">
            <i class="bi bi-exclamation-triangle-fill text-warning fs-6"></i>
            <span><strong>Prestito:</strong> non disponibile dal <strong>${beginDate}</strong> al <strong>${endDate}</strong>.</span>
          </div>
        `;
      }

      html += `
          <li class="timeline-work">
              <div class="card custom-card p-3" style="border-radius: 14px;">
                  <div class="row align-items-center g-3">
                      ${work.image ? `
                      <div class="col-3 col-md-2 text-center">
                          <img src="${work.image}" class="img-fluid rounded shadow-sm" 
                                style="max-height: 80px; object-fit: cover; width: 100%; border: 1px solid rgba(255,255,255,0.05);">
                      </div>
                      ` : ''}
                      <div class="col">
                          <span class="badge bg-dark bg-opacity-50 border border-secondary border-opacity-20 text-info mb-1" style="font-size: 0.75rem; font-weight: 600;">Tappa ${index + 1}</span>
                          <h5 class="h6 mb-1 text-white fw-bold">${work.name}</h5>
                          <p class="small text-white-50 mb-0" style="font-size: 0.85rem; line-height: 1.4;">${descText}</p>
                          ${adoptionWarning}
                      </div>
                  </div>
              </div>
          </li>
      `;
    });
    timeline.innerHTML = html;
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
  
  window.location.replace(`/create-visit?edit=${visitId}&museumId=${museumId}`);
}
