const API_BASE_URL = 'http://localhost:3000/api';

// Stato globale
let cachedMuseums = [];
let currentItems = [];
let currentMuseumId = null;
let editModalInstance = null;

// 1. INIZIALIZZAZIONE
document.addEventListener('DOMContentLoaded', () => {
    const modalEl = document.getElementById('editItemModal');
    if (modalEl) {
        editModalInstance = new bootstrap.Modal(modalEl);
    }
    getMuseums();
});

// 2. LOGICA API (FETCH)

async function getMuseums() {
    const container = document.getElementById('content-area');
    const title = document.getElementById('page-title');
    const backBtn = document.getElementById('back-btn');

    // UI Reset
    backBtn.classList.add('d-none');
    title.innerHTML = 'Musei Disponibili';
    
    container.innerHTML = `
        <div class="col-12 text-center mt-5">
            <div class="spinner-border text-light" role="status"></div>
            <p class="mt-2 text-secondary">Caricamento...</p>
        </div>`;

    try {
        const response = await fetch(`${API_BASE_URL}/musei`);
        if (!response.ok) throw new Error('Errore server');
        cachedMuseums = await response.json();
        renderMuseumsList(cachedMuseums);
    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="alert alert-danger bg-transparent text-danger border-danger">Errore caricamento dati. Il server è attivo?</div>`;
    }
}

async function getMuseumItems(museumId) {
    const container = document.getElementById('content-area');
    currentMuseumId = museumId; // Ora è una stringa

    container.innerHTML = `
        <div class="col-12 text-center mt-5">
            <div class="spinner-border text-info" role="status"></div>
            <p class="mt-2 text-secondary">Apertura catalogo...</p>
        </div>`;

    try {
        const response = await fetch(`${API_BASE_URL}/musei/${museumId}/items`);
        if (!response.ok) throw new Error('Errore items');
        
        currentItems = await response.json();
        
        // CORREZIONE 1: Uso _id per trovare il museo nella cache
        const museum = cachedMuseums.find(m => m._id === museumId);
        renderItemsList(currentItems, museum);
        
    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="alert alert-danger bg-transparent text-danger border-danger">Errore: ${error.message}</div>`;
    }
}

// 3. LOGICA RENDER (HTML "AURA")

function renderMuseumsList(museums) {
    const container = document.getElementById('content-area');
    container.innerHTML = '';

    museums.forEach(museum => {
        const tagsHtml = museum.tags.map(tag => `<span class="badge badge-tag">${tag}</span>`).join('');

        // CORREZIONE 2: Aggiunti apici '' intorno all'ID nell'onclick -> '${museum._id}'
        // CORREZIONE 3: Uso museum._id invece di museum.id
        const cardHtml = `
            <div class="col">
                <div class="card h-100 custom-card cursor-pointer" onclick="getMuseumItems('${museum._id}')" style="cursor: pointer;">
                    <img src="${museum.image}" class="card-img-top" alt="${museum.name}" style="height: 200px; object-fit: cover; opacity: 0.9;">
                    <div class="card-body">
                        <h5 class="card-title">${museum.name}</h5>
                        <p class="card-text small mb-3"><i class="bi bi-geo-alt me-1"></i> ${museum.address}</p>
                        <div>${tagsHtml}</div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += cardHtml;
    });
}

function renderItemsList(items, museumInfo) {
    const container = document.getElementById('content-area');
    const title = document.getElementById('page-title');
    const backBtn = document.getElementById('back-btn');

    title.innerText = museumInfo ? museumInfo.name : "Dettaglio Museo";
    backBtn.classList.remove('d-none');
    container.innerHTML = '';

    if (items.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-secondary py-5">Nessuna opera presente.</div>';
        return;
    }

    items.forEach(item => {
        // CORREZIONE 4: Uso item._id e aggiungo gli apici nell'onclick del modale
        const cardHtml = `
            <div class="col-12 col-lg-6">
                <div class="card custom-card h-100">
                    <div class="row g-0 h-100">
                        <div class="col-4">
                            <img src="${item.image}" class="img-fluid rounded-start h-100" style="object-fit: cover; min-height: 180px;" alt="${item.name}">
                        </div>
                        <div class="col-8">
                            <div class="card-body d-flex flex-column h-100 py-3 px-3">
                                <div class="d-flex justify-content-between align-items-start">
                                    <h5 class="card-title mb-1 text-truncate">${item.name}</h5>
                                </div>
                                <p class="card-text small text-truncate-3 mb-3" style="flex-grow: 1; opacity: 0.8;">${item.description}</p>
                                
                                <div class="d-flex justify-content-between align-items-end mt-auto pt-2 border-top border-secondary border-opacity-25">
                                    <div>
                                        <div class="fw-bold text-white fs-5">€ ${item.price.toFixed(2)}</div>
                                    </div>
                                    <button class="btn btn-sm btn-outline-secondary rounded-pill px-3" onclick="openEditModal('${item._id}')">
                                        <i class="bi bi-pencil me-1"></i> Modifica
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += cardHtml;
    });
}

// 4. LOGICA EDITOR (MODALE & SALVATAGGIO)

function openEditModal(itemId) {
    // CORREZIONE 5: Cerco usando _id (confronto tra stringhe)
    const item = currentItems.find(i => i._id === itemId);
    
    if (!item) {
        console.error("Item non trovato per id:", itemId);
        return;
    }

    // Popola il form
    // Nota: itemId è una stringa, va bene così
    document.getElementById('itemId').value = item._id; 
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemPrice').value = item.price;
    document.getElementById('itemDescription').value = item.description;
    
    // Metadati
    document.getElementById('itemDuration').value = item.duration || '1min';
    document.getElementById('itemTone').value = item.tone || 'medio';
    
    editModalInstance.show(); 
}

async function saveItem() {
    // CORREZIONE 6: RIMOSSO parseInt. L'ID di mongo è una stringa.
    const id = document.getElementById('itemId').value;
    
    const updatedData = {
        name: document.getElementById('itemName').value,
        price: parseFloat(document.getElementById('itemPrice').value),
        description: document.getElementById('itemDescription').value,
        duration: document.getElementById('itemDuration').value,
        tone: document.getElementById('itemTone').value
    };

    const saveBtn = document.querySelector('#editItemModal .btn-primary');
    const originalText = saveBtn.innerText;
    saveBtn.innerText = 'Salvataggio...';
    saveBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/items/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        });

        if (!response.ok) throw new Error('Errore nel salvataggio');

        const result = await response.json();
        
        // CORREZIONE 7: Aggiornamento array locale usando _id
        const index = currentItems.findIndex(i => i._id === id);
        if (index !== -1) {
            // Uniamo i vecchi dati con i nuovi ricevuti dal server
            // Nota: result.item potrebbe avere "id" o "_id" a seconda del server, ma noi aggiorniamo l'oggetto corrente
            currentItems[index] = { ...currentItems[index], ...updatedData };
        }

        editModalInstance.hide();
        
        // Ridisegna la lista
        const museum = cachedMuseums.find(m => m._id === currentMuseumId);
        renderItemsList(currentItems, museum);

        alert("Modifica salvata con successo!");

    } catch (error) {
        console.error(error);
        alert("Errore durante il salvataggio: " + error.message);
    } finally {
        saveBtn.innerText = originalText;
        saveBtn.disabled = false;
    }
}
