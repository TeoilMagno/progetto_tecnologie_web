document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("reports-container");
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE_URL}/my-quiz-results`);
    if (!res.ok) throw new Error("Errore nel caricamento");
    
    const reports = await res.json();

    if (reports.length === 0) {
      container.innerHTML = `
        <div class="col-12 text-center py-5 text-secondary glass-panel rounded-4">
          <i class="bi bi-inbox fs-1 mb-2 opacity-50"></i>
          <p>Nessun report disponibile al momento.</p>
        </div>`;
      return;
    }

    container.innerHTML = "";
    reports.forEach(report => {
      const visitTitle = report.visitId?.title || 'Visita Eliminata';
      const dateStr = new Date(report.date).toLocaleDateString('it-IT');

      container.innerHTML += `
        <div class="col-12">
          <div class="card custom-card p-3 cursor-pointer" onclick="window.location.href='/quiz-report-details?id=${report._id}'" style="cursor: pointer;">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h5 class="text-white fs-6 fw-bold mb-1">${visitTitle}</h5>
                <div class="d-flex gap-3 text-secondary" style="font-size: 0.75rem;">
                  <span><i class="bi bi-calendar me-1"></i>${dateStr}</span>
                  <span><i class="bi bi-people me-1"></i>Stanza: <strong class="text-white">${report.roomCode}</strong></span>
                </div>
              </div>
              <i class="bi bi-chevron-right text-secondary fs-5"></i>
            </div>
          </div>
        </div>`;
    });
  } catch (error) {
    console.error(error);
    container.innerHTML = `<div class="col-12 text-center text-danger">Impossibile caricare i report.</div>`;
  }
});