let currentConfig = null;
const mockupCard = document.getElementById("mockupCard");

// Standard list of clean fonts for autocomplete
const fontsList = [
  "system-ui", "-apple-system", "sans-serif", "serif", "monospace", 
  "Cinzel", "Montserrat", "Playfair Display", "Inter", "Roboto", 
  "Lora", "Merriweather", "Helvetica", "Arial", "Georgia", "Courier New"
];

// Load active config and apply
async function loadThemeConfig() {
  try {
    const response = await fetch("/api/config/default");
    if (response.ok) {
      currentConfig = await response.json();
      applyConfigToPreview(currentConfig);
    } else {
      console.error("Impossibile caricare la configurazione di default per lo stile della pagina");
    }
  } catch (err) {
    console.error("Errore durante la richiesta del file di congigurazione per lo stile della pagina", err);
  }
}

function applyConfigToPreview(config) {
  if (!config || !config.theme) return;
  const theme = config.theme;

  // Map config.json fields to the mockup CSS variables
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

  Object.entries(cssVariables).forEach(([key, value]) => {
    if (value) {
      mockupCard.style.setProperty(key, value);
    }
  });

  // Update text/content
  document.getElementById("mockupMuseumName").textContent = config.name || "Default Museum";
  document.getElementById("mockupWelcomeMessage").textContent = config.welcomeMessage || "";
  
  if (config.backgroundImage) {
    // Fallback or absolute checks
    let bgUrl = config.backgroundImage;
    if (bgUrl.startsWith('/')) {
      bgUrl = bgUrl; 
    }
    document.getElementById("mockupBgImage").src = bgUrl;
  }
  
  if (config.iconUrl) {
    document.getElementById("mockupLogo").src = config.iconUrl;
  }
}

// Populate all customization inputs on first customization enter
function populateFormInputs(theme) {
  if (!theme) return;
  
  const fields = [
    { key: 'primary', varName: '--primary' },
    { key: 'secondary', varName: '--secondary' },
    { key: 'accent', varName: '--accent' },
    { key: 'bg-main', varName: '--bg-main' },
    { key: 'bg-card', varName: '--bg-card' },
    { key: 'bg-dark', varName: '--bg-dark' },
    { key: 'text-main', varName: '--text-main' },
    { key: 'text-muted', varName: '--text-muted' },
    { key: 'text-on-dark', varName: '--text-on-dark' },
    { key: 'text-on-primary', varName: '--text-on-primary' },
    { key: 'border-color', varName: '--border-color' }
  ];

  fields.forEach(field => {
    const picker = document.getElementById('picker-' + field.key);
    const text = document.getElementById('text-' + field.key);
    const val = theme[field.key];
    
    if (val) {
      if (picker) picker.value = val.startsWith('#') ? val : '#000000';
      if (text) text.value = val;
    }
  });

  document.getElementById('input-radius').value = theme.radius || '';
  document.getElementById('input-border-width').value = theme['border-width'] || '';
  document.getElementById('input-border-style').value = theme['border-style'] || 'solid';
  document.getElementById('input-shadow').value = theme.shadow || '';
  document.getElementById('input-bg-overlay').value = theme['bg-overlay'] || '';
  document.getElementById('input-bg-pattern').value = theme['bg-pattern'] || '';
  document.getElementById('input-font-heading').value = theme['font-heading'] || '';
  document.getElementById('input-font-body').value = theme['font-body'] || '';

  // Populate general fields outside the theme sub-object
  if (currentConfig) {
    document.getElementById('input-backgroundImage').value = currentConfig.backgroundImage || '';
    document.getElementById('input-iconUrl').value = currentConfig.iconUrl || '';
  }
}

// Dynamic autocomplete logic for font inputs
function setupFontAutocomplete(inputId, dropdownId, themeVar) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);

  function filterOptions(query) {
    dropdown.innerHTML = "";
    const filtered = fontsList.filter(f => f.toLowerCase().includes(query.toLowerCase()));
    
    if (filtered.length === 0) {
      dropdown.style.display = "none";
      return;
    }

    filtered.forEach(font => {
      const item = document.createElement("div");
      item.className = "autocomplete-item";
      item.textContent = font;
      item.style.fontFamily = font;
      item.addEventListener("click", () => {
        input.value = font;
        dropdown.style.display = "none";
        mockupCard.style.setProperty(themeVar, font);
        if (currentConfig && currentConfig.theme) {
          const themeKey = themeVar.replace('--', '');
          currentConfig.theme[themeKey] = font;
        }
      });
      dropdown.appendChild(item);
    });
    
    dropdown.style.display = "block";
  }

  input.addEventListener("input", (e) => {
    filterOptions(e.target.value);
    mockupCard.style.setProperty(themeVar, e.target.value);
    if (currentConfig && currentConfig.theme) {
      const themeKey = themeVar.replace('--', '');
      currentConfig.theme[themeKey] = e.target.value;
    }
  });

  input.addEventListener("focus", () => {
    filterOptions(input.value);
  });

  document.addEventListener("click", (e) => {
    if (e.target !== input && e.target !== dropdown) {
      dropdown.style.display = "none";
    }
  });
}

// Setup color pickers and inputs sync
function setupInputSync() {
  const colorFields = [
    { key: 'primary', varName: '--primary' },
    { key: 'secondary', varName: '--secondary' },
    { key: 'accent', varName: '--accent' },
    { key: 'bg-main', varName: '--bg-main' },
    { key: 'bg-card', varName: '--bg-card' },
    { key: 'bg-dark', varName: '--bg-dark' },
    { key: 'text-main', varName: '--text-main' },
    { key: 'text-muted', varName: '--text-muted' },
    { key: 'text-on-dark', varName: '--text-on-dark' },
    { key: 'text-on-primary', varName: '--text-on-primary' },
    { key: 'border-color', varName: '--border-color' }
  ];

  colorFields.forEach(field => {
    const picker = document.getElementById('picker-' + field.key);
    const text = document.getElementById('text-' + field.key);

    if (picker && text) {
      picker.addEventListener('input', (e) => {
        const val = e.target.value;
        text.value = val;
        mockupCard.style.setProperty(field.varName, val);
        if (currentConfig && currentConfig.theme) {
          currentConfig.theme[field.key] = val;
        }
      });

      text.addEventListener('input', (e) => {
        let val = e.target.value;
        if (!val.startsWith('#') && val.length > 0) {
          val = '#' + val;
        }
        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
          picker.value = val;
          mockupCard.style.setProperty(field.varName, val);
          if (currentConfig && currentConfig.theme) {
            currentConfig.theme[field.key] = val;
          }
        }
      });
    }
  });

  // Sync structural styles
  const structures = [
    { id: 'input-radius', varName: '--radius', key: 'radius' },
    { id: 'input-border-width', varName: '--border-width', key: 'border-width' },
    { id: 'input-border-style', varName: '--border-style', key: 'border-style' },
    { id: 'input-shadow', varName: '--shadow', key: 'shadow' },
    { id: 'input-bg-overlay', varName: '--bg-overlay', key: 'bg-overlay' },
    { id: 'input-bg-pattern', varName: '--bg-pattern', key: 'bg-pattern' }
  ];

  structures.forEach(struct => {
    const input = document.getElementById(struct.id);
    if (input) {
      input.addEventListener('input', (e) => {
        const val = e.target.value;
        mockupCard.style.setProperty(struct.varName, val);
        if (currentConfig && currentConfig.theme) {
          currentConfig.theme[struct.key] = val;
        }
      });
    }
  });

  // Sync fonts autocomplete dropdowns
  setupFontAutocomplete('input-font-heading', 'dropdown-font-heading', '--font-heading');
  setupFontAutocomplete('input-font-body', 'dropdown-font-body', '--font-body');

  // Sync general fields (background image & icon logo)
  const bgInput = document.getElementById('input-backgroundImage');
  if (bgInput) {
    bgInput.addEventListener('input', (e) => {
      const val = e.target.value;
      document.getElementById("mockupBgImage").src = val;
      if (currentConfig) {
        currentConfig.backgroundImage = val;
      }
    });
  }

  const iconInput = document.getElementById('input-iconUrl');
  if (iconInput) {
    iconInput.addEventListener('input', (e) => {
      const val = e.target.value;
      document.getElementById("mockupLogo").src = val;
      if (currentConfig) {
        currentConfig.iconUrl = val;
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Fetch current logged user for marketplace header
  await fetchCurrentUser();
  
  // 2. Load theme configuration and populate preview
  await loadThemeConfig();

  // 2b. Tasto Annulla: torna alla pagina precedente, o alla home se non c'è cronologia
  const cancelBtn = document.getElementById("cancel-btn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "/";
      }
    });
  }

  // 3. Fullscreen toggle logic
  const btnFullscreen = document.getElementById("btnFullscreen");
  const btnCloseFullscreen = document.getElementById("btnCloseFullscreen");

  btnFullscreen.addEventListener("click", () => {
    mockupCard.classList.add("fullscreen-active");
    document.body.classList.add("in-fullscreen");
  });

  btnCloseFullscreen.addEventListener("click", () => {
    mockupCard.classList.remove("fullscreen-active");
    document.body.classList.remove("in-fullscreen");
  });

  // 4. Customize Panel Toggle
  const btnCustomize = document.getElementById("btnCustomize");
  const btnBackToActions = document.getElementById("btnBackToActions");
  const mainActionsPanel = document.getElementById("mainActionsPanel");
  const customizePanel = document.getElementById("customizePanel");

  btnCustomize.addEventListener("click", () => {
    mainActionsPanel.style.display = "none";
    customizePanel.style.display = "flex";
    if (currentConfig && currentConfig.theme) {
      populateFormInputs(currentConfig.theme);
    }
  });

  btnBackToActions.addEventListener("click", () => {
    customizePanel.style.display = "none";
    mainActionsPanel.style.display = "flex";
  });

  // 5. Initialize Live inputs synchronizers
  setupInputSync();

  // 6. Download Config Logic (Green button)
  const btnDownloadConfig = document.getElementById("btnDownloadConfig");
  if (btnDownloadConfig) {
    btnDownloadConfig.addEventListener("click", () => {
      if (!currentConfig) return;
      const blob = new Blob([JSON.stringify(currentConfig, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "config.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
});