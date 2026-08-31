import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/navigator', // FONDAMENTALE per il routing del backend Express
  build: {
    outDir: path.resolve(__dirname, '../public/navigator/'),
    
    // poiché la cartella di destinazione è fuori dalla root 
    // del progetto Vite, dobbiamo dirgli esplicitamente che va bene 
    // svuotarla prima di ogni nuova build per evitare errori di sicurezza.
    emptyOutDir: true
  }
})
