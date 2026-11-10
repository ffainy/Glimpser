const nativeAPI = typeof browser !== 'undefined' ? browser : chrome

const DEFAULT_SETTINGS = {
  previewEnabled: true,
  previewTriggerMode: 'release',
  theme: null,
  language: null,
}

const SUN_ICON = '<path fill="currentColor" d="M256 104c-83.813 0-152 68.187-152 152s68.187 152 152 152s152-68.187 152-152s-68.187-152-152-152m0 272a120 120 0 1 1 120-120a120.136 120.136 0 0 1-120 120M240 16h32v48h-32zm0 432h32v48h-32zm208-208h48v32h-48zm-432 0h48v32H16zm372.687 171.314l22.627-22.627l32 32l-22.627 22.627zm-320-320l22.628-22.628l32 32l-22.628 22.628zm-.002 329.375l32-32l22.628 22.626l-32 32zm320.002-320.003l32-32l22.628 22.628l-32 32z"/>'
const MOON_ICON = '<path fill="currentColor" d="M268.279 496c-67.574 0-130.978-26.191-178.534-73.745S16 311.293 16 243.718A252.25 252.25 0 0 1 154.183 18.676a24.44 24.44 0 0 1 34.46 28.958a220.12 220.12 0 0 0 54.8 220.923A218.75 218.75 0 0 0 399.085 333.2a220.2 220.2 0 0 0 65.277-9.846a24.439 24.439 0 0 1 28.959 34.461A252.26 252.26 0 0 1 268.279 496M153.31 55.781A219.3 219.3 0 0 0 48 243.718C48 365.181 146.816 464 268.279 464a219.3 219.3 0 0 0 187.938-105.31a253 253 0 0 1-57.13 6.513a250.54 250.54 0 0 1-178.268-74.016a252.15 252.15 0 0 1-67.509-235.4Z"/>'

function _detectSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
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
    console.error('[Glimpser] Failed to save settings:', e)
  }
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n
    el.textContent = typeof t === 'function' ? t(key) : key
  })
  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    const key = el.dataset.i18nAriaLabel
    el.setAttribute('aria-label', typeof t === 'function' ? t(key) : key)
  })
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.dataset.i18nTitle
    el.setAttribute('title', typeof t === 'function' ? t(key) : key)
  })
}

async function initPopup() {
  const settings = await loadSettings()

  await applyLangPref(settings.language)
  applyI18n()
  document.documentElement.lang = typeof getLang === 'function' ? getLang() : 'en'

  const version = nativeAPI.runtime.getManifest().version || '0.0.0'
  document.getElementById('versionBadge').textContent = 'v' + version

  const previewToggle = document.getElementById('previewEnabled')
  const triggerSelect = document.getElementById('previewTriggerMode')
  const themeToggle = document.getElementById('themeToggle')
  const themeIcon = document.getElementById('themeIcon')

  function _applyTheme(theme) {
    const resolved = theme || _detectSystemTheme()
    document.documentElement.dataset.theme = resolved
    themeIcon.innerHTML = resolved === 'light' ? SUN_ICON : MOON_ICON
  }

  previewToggle.checked = settings.previewEnabled !== false
  triggerSelect.value = settings.previewTriggerMode || 'release'
  _applyTheme(settings.theme)

  previewToggle.addEventListener('change', () => {
    saveSettings({ previewEnabled: previewToggle.checked })
  })

  triggerSelect.addEventListener('change', () => {
    saveSettings({ previewTriggerMode: triggerSelect.value })
  })

  themeToggle.addEventListener('click', () => {
    const current = settings.theme || _detectSystemTheme()
    const next = current === 'dark' ? 'light' : 'dark'
    settings.theme = next
    _applyTheme(next)
    saveSettings({ theme: next })
  })

  document.getElementById('openSettings').addEventListener('click', () => {
    nativeAPI.runtime.openOptionsPage()
  })
}

document.addEventListener('DOMContentLoaded', initPopup)
