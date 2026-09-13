import { useState, useEffect } from 'react';
import { BASE_URL } from '../config';

export default function useMuseumTheme(selectedMuseum) {
  const [config, setConfig] = useState(null);

  // 1 e 2. Recupera la configurazione (specifica o default) direttamente dal database
  useEffect(() => {
    async function fetchTheme() {
      try {
        const endpoint = selectedMuseum 
          ? `${BASE_URL}/api/config/by-museum/${encodeURIComponent(selectedMuseum.name)}`
          : `${BASE_URL}/api/config/default`;
          
        const response = await fetch(endpoint);
        
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
        } else {
          alert("Errore dal server durante il recupero del tema");
        }
      } catch (err) {
        alert("Errore di rete durante il recupero del tema:", err);
      }
    }

    fetchTheme();
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
