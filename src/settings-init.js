// settings-init.js — Entry point for settings.html
// Applies theme background and opens the settings panel.

const _api = typeof browser !== 'undefined' ? browser : chrome;

// Apply background color from stored theme
_api.storage.sync.get({ theme: null }).then(({ theme }) => {
  const resolved = theme === 'light' ? 'light'
    : theme === 'dark' ? 'dark'
    : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.body.setAttribute('data-dp-theme', resolved);
}).catch(() => {});

// Open the settings panel
window.__glimpserSettingsPanel?.show();
