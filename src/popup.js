const nativeAPI = typeof browser !== 'undefined' ? browser : chrome

const DEFAULT_SETTINGS = {
  previewEnabled: true,
  previewTriggerMode: 'release',
  theme: null,
  language: null,
}

async function loadSettings() {
  try {
    return await nativeAPI.storage.sync.get(DEFAULT_SETTINGS)
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

async function saveSettings(updates) {
  try {
    await nativeAPI.storage.sync.set(updates)
  } catch (e) {
    console.error('[Glimser] Failed to save settings:', e)
  }
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n
    const translated = typeof t === 'function' ? t(key) : key
    if (el.tagName === 'OPTION') {
      el.textContent = translated
    } else {
      el.textContent = translated
    }
  })
}

async function initPopup() {
  await applyLangPref(null)

  applyI18n()

  const settings = await loadSettings()

  const previewToggle = document.getElementById('previewEnabled')
  const triggerSelect = document.getElementById('previewTriggerMode')
  const themeSelect = document.getElementById('theme')

  previewToggle.checked = settings.previewEnabled !== false
  triggerSelect.value = settings.previewTriggerMode || 'release'
  const theme = settings.theme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  themeSelect.value = settings.theme || 'system'

  previewToggle.addEventListener('change', () => {
    saveSettings({ previewEnabled: previewToggle.checked })
  })

  triggerSelect.addEventListener('change', () => {
    saveSettings({ previewTriggerMode: triggerSelect.value })
  })

  themeSelect.addEventListener('change', () => {
    const value = themeSelect.value
    saveSettings({ theme: value === 'system' ? null : value })
  })

  document.getElementById('openSettings').addEventListener('click', () => {
    nativeAPI.runtime.openOptionsPage()
  })
}

document.addEventListener('DOMContentLoaded', initPopup)
