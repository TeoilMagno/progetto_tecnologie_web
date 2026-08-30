import { useState, useEffect } from 'react';

export default function useMuseumTheme(selectedMuseum) {
  const [config, setConfig] = useState(null);

  // 1. Carica la configurazione di default all'avvio dal database
  useEffect(() => {
    async function loadDefaultConfig() {
      try {
        const response = await fetch('http://localhost:8000/api/config/default');
        if (response.ok) {
          const defaultData = await response.json();
          setConfig(defaultData);
        } else {
          console.error("Impossibile caricare la configurazione di default dal database. Provo fallback locale...");
          // Fallback locale nel caso il server non risponda
          try {
            const localDefault = await import('../assets/default-config.json');
            setConfig(localDefault.default || localDefault);
          } catch (e) {
            console.error("Errore fallback locale:", e);
          }
        }
      } catch (err) {
        console.error("Errore durante il recupero della configurazione di default:", err);
      }
    }
    loadDefaultConfig();
  }, []);

  // 2. Cerca la configurazione del museo specifico quando viene selezionato
  useEffect(() => {
    if (!selectedMuseum) return;

    async function fetchMuseumConfig() {
      try {
        const response = await fetch(`http://localhost:8000/api/config/by-museum/${encodeURIComponent(selectedMuseum.name)}`);
        if (response.ok) {
          const museumData = await response.json();
          console.log(`Configurazione specifica trovata nel DB per: ${selectedMuseum.name}`);
          setConfig(museumData);
        } else {
          console.log(`Nessuna configurazione specifica nel DB per il museo ${selectedMuseum.name}. Provo fallback locale...`);
          
          // Fallback locale basato su file per rendere tutto robusto
          try {
            let localData = null;
            if (selectedMuseum.name.includes("Gradara") || selectedMuseum.name.includes("Medievale")) {
              localData = await import('../assets/castello-config.json');
            } else if (selectedMuseum.name.includes("Fumetto")) {
              localData = await import('../assets/fumettistico-config.json');
            } else if (selectedMuseum.name.includes("Scienza") || selectedMuseum.name.includes("Tecnologico")) {
              localData = await import('../assets/tecnologico-config.json');
            }
            
            if (localData) {
              console.log(`Configurazione caricata correttamente dal fallback locale.`);
              setConfig(localData.default || localData);
            } else {
              console.log(`Nessuna configurazione locale trovata per questo museo, mantengo quella di default.`);
            }
          } catch (e) {
            console.error("Errore nel caricamento del fallback locale:", e);
          }
        }
      } catch (err) {
        console.error("Errore durante il recupero della configurazione specifica del museo:", err);
      }
    }

    fetchMuseumConfig();
  }, [selectedMuseum]);

  // 3. Applica dinamicamente le proprietà CSS personalizzate all'elemento :root
  useEffect(() => {
    if (!config || !config.theme) return;

    const root = document.documentElement;
    const theme = config.theme;

    // Definiamo tutte le proprietà CSS che vogliamo applicare dinamicamente
    const cssVariables = {
      '--primary': theme.primary,
      '--secondary': theme.secondary,
      '--accent': theme.accent,
      '--bg-main': theme['bg-main'],
      '--bg-overlay': theme['bg-overlay'],
      '--bg-card': theme['bg-card'],
      '--bg-dark': theme['bg-dark'],
      '--text-main': theme['text-main'],
      '--text-muted': theme['text-muted'],
      '--text-on-dark': theme['text-on-dark'],
      '--text-on-primary': theme['text-on-primary'],
      '--radius': theme.radius,
      '--border-width': theme['border-width'],
      '--border-style': theme['border-style'],
      '--border-color': theme['border-color'],
      '--shadow': theme.shadow,
      '--font-heading': theme['font-heading'],
      '--font-body': theme['font-body'],
      '--bg-pattern': theme['bg-pattern']
    };

    // Applichiamo ciascuna proprietà
    Object.entries(cssVariables).forEach(([key, value]) => {
      if (value) {
        root.style.setProperty(key, value);
      }
    });

    // Cleanup: ripristina i valori originali o pulisci all'unmount
    return () => {
      Object.keys(cssVariables).forEach((key) => {
        root.style.removeProperty(key);
      });
    };
  }, [config]);

  return config;
}
