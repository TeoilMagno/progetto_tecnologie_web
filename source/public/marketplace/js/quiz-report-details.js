let currentReportData = null;
let reviewModalInstance = null;

document.addEventListener("DOMContentLoaded", async () => {
  reviewModalInstance = new bootstrap.Modal(document.getElementById("studentReviewModal"));
  
  const urlParams = new URLSearchParams(window.location.search);
  const reportId = urlParams.get("id");

  if (!reportId) {
    window.location.href = "/quiz-reports";
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/quiz-results/${reportId}`);
    if (!res.ok) throw new Error("Report non trovato");
    
    currentReportData = await res.json();
    renderReportDetails(currentReportData);
  } catch (error) {
    console.error(error);
    document.getElementById("students-container").innerHTML = `<div class="text-danger text-center">Impossibile caricare il report.</div>`;
  }
});

function renderReportDetails(report) {
  const subtitle = document.getElementById("report-subtitle");
  const container = document.getElementById("students-container");

  const dateStr = new Date(report.date).toLocaleDateString('it-IT');
  subtitle.innerHTML = `Stanza: <span class="text-white font-monospace">${report.roomCode}</span> &bull; ${dateStr}`;

  const quizData = report.visitId?.quiz || [];
  let html = "";

  if (!report.results || report.results.length === 0) {
    container.innerHTML = `<div class="text-center text-secondary py-4">Nessuno studente ha ancora completato il quiz in questa sessione.</div>`;
    return;
  }

  report.results.forEach((student, idx) => {
    const isMax = student.score === quizData.length;
    
    html += `
      <div class="col-12">
        <div class="card custom-card p-3 cursor-pointer" onclick="openStudentReview(${idx})" style="cursor: pointer;">
          <div class="d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center gap-3">
              <div class="rounded-circle bg-info bg-opacity-25 text-info d-flex align-items-center justify-content-center fw-bold" style="width: 32px; height: 32px; font-size: 0.85rem;">
                ${idx + 1}
              </div>
              <span class="fw-bold text-white">${student.studentName}</span>
            </div>
            <div class="d-flex align-items-center gap-3">
              <span class="fw-bold text-warning">${student.score} <small class="text-secondary">/ ${quizData.length}</small></span>
              <i class="bi bi-trophy-fill ${isMax ? 'text-warning' : 'text-secondary'}"></i>
            </div>
          </div>
        </div>
      </div>`;
  });

  container.innerHTML = html;
}

function openStudentReview(studentIndex) {
  if (!currentReportData) return;
  
  const student = currentReportData.results[studentIndex];
  const quizData = currentReportData.visitId?.quiz || [];

  document.getElementById("modal-student-name").innerText = student.studentName;
  document.getElementById("modal-student-score").innerText = `Punteggio: ${student.score} / ${quizData.length}`;

  const bodyContainer = document.getElementById("modal-review-body");
  let html = "";

  quizData.forEach((q, idx) => {
    const studentAnswer = student.answers.find(h => h.qIndex === idx);
    const isCorrect = studentAnswer?.isCorrect;
    const answeredOpt = studentAnswer?.selectedOption;

    let incorrectHtml = "";
    if (!isCorrect && answeredOpt !== undefined && q.options[answeredOpt]) {
      incorrectHtml = `
        <div class="bg-danger bg-opacity-10 border border-danger border-opacity-25 rounded-3 p-2 mb-2 text-danger small">
          <span class="d-block fw-bold text-uppercase" style="font-size: 0.65rem;">Scelta errata:</span>
          <span class="text-decoration-line-through">${q.options[answeredOpt]}</span>
        </div>`;
    }

    const correctHtml = `
      <div class="bg-success bg-opacity-10 border border-success border-opacity-25 rounded-3 p-2 text-success small">
        <span class="d-block fw-bold text-uppercase" style="font-size: 0.65rem;">Risposta corretta:</span>
        <span>${q.options[q.correctAnswerIndex]}</span>
      </div>`;

    const iconHtml = isCorrect 
      ? `<i class="bi bi-check-circle-fill text-success fs-5 me-2 flex-shrink-0"></i>`
      : `<i class="bi bi-x-circle-fill text-danger fs-5 me-2 flex-shrink-0"></i>`;

    html += `
      <div class="card bg-dark border ${isCorrect ? 'border-success border-opacity-25 bg-success bg-opacity-10' : 'border-danger border-opacity-25 bg-danger bg-opacity-10'} p-3 mb-3">
        <div class="d-flex align-items-start mb-2">
          ${iconHtml}
          <h6 class="fw-bold mb-0 text-white small">${idx + 1}. ${q.question}</h6>
        </div>
        <div class="ps-4">
          ${incorrectHtml}
          ${correctHtml}
        </div>
      </div>`;
  });

  bodyContainer.innerHTML = html;

  reviewModalInstance.show();
}