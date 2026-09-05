const fs = require('fs').promises;
const path = require('path');

const deleteLocalFile = async (imageUrl) => {
  // Ignora link esterni o vuoti, agisce solo sui file locali caricati da noi
  if (!imageUrl || !imageUrl.startsWith('/uploads/')) return;
  try {
    const filename = imageUrl.split('/').pop();
    // Assicurati che i '..' portino dalla cartella attuale alla root del progetto
    const filePath = path.join(__dirname, '..', '..', '..', 'public', 'uploads', filename); 
    await fs.unlink(filePath);
    console.log(`File eliminato dal disco: ${filename}`);
  } catch (err) {
    console.log(`Impossibile eliminare file (forse già rimosso): ${imageUrl}`);
  }
};

module.exports = { deleteLocalFile };