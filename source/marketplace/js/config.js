// config.js -> modifiche alla porta o all'url non saranno da modificare in 20 file diversi
// window.location.origin prende automaticamente 'http://localhost:8000' in locale 
// e 'https://www.tuosito.com' in produzione!
const API_BASE_URL = window.location.origin + "/api";

// Funzione helper per tradurre l'indirizzo in coordinate
async function geocodeAddress(address) {
  try {
    // Usiamo encodeURIComponent per gestire spazi e virgole nell'indirizzo
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ArtAround/1.0 (progetto universitario)' 
      }
    });

    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon) 
      };
    }
  } catch (error) {
    console.error("Errore durante il geocoding dell'indirizzo:", error);
  }
  return { lat: null, lon: null };
}z