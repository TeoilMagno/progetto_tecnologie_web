import { useState, useEffect } from 'react';
import { BASE_URL } from '../config';

const cacheKey = (museum) => `museum_config_${museum ? museum.name : 'default'}`;

function readCache(museum) {
  try {
    const raw = localStorage.getItem(cacheKey(museum));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function useMuseumTheme(selectedMuseum) {
  // Stato iniziale: se abbiamo già una config in cache per questo museo,
  // la usiamo subito, senza aspettare la fetch.
  const [config, setConfig] = useState(() => readCache(selectedMuseum));

  useEffect(() => {
    // Se cambia museo, mostriamo subito la sua cache (se esiste) mentre
    // la fetch fresca gira in background.
    setConfig(readCache(selectedMuseum));

    async function fetchTheme() {
      try {
        const endpoint = selectedMuseum
          ? `${BASE_URL}/api/config/by-museum/${encodeURIComponent(selectedMuseum.name)}`
          : `${BASE_URL}/api/config/default`;

        const response = await fetch(endpoint);

        if (response.ok) {
          const data = await response.json();
          setConfig(data);
          try {
            localStorage.setItem(cacheKey(selectedMuseum), JSON.stringify(data));
          } catch {
            // storage pieno o non disponibile: non è critico, si ignora
          }
        } else {
          console.error("Errore dal server durante il recupero del tema");
        }
      } catch (err) {
        console.error("Errore di rete durante il recupero del tema:", err);
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