const nativeAPI = typeof browser !== 'undefined' ? browser : chrome

const DEFAULT_SETTINGS = {
  previewEnabled: true,
  previewTriggerMode: 'release',
  maxPreviewWindows: 1,
  blacklistDomains: [],
  theme: null,
  language: null,
}

function _detectSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function _normalizeDomainInput(value) {
  const trimmed = String(value || '').trim().toLowerCase().replace(/\.+$/, '')
  if (!trimmed) return ''
  const normalizeHostname = (hostname) => {
    const n = String(hostname || '').trim().toLowerCase().replace(/\.+$/, '')
    if (!n) return ''
    const labels = n.split('.')
    if (labels.some(l => !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(l))) return ''
    return n
  }
  if (!trimmed.includes('/') && !trimmed.includes(':')) return normalizeHostname(trimmed)
  const candidates = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? [trimmed] : [`https://${trimmed}`]
  for (const c of candidates) {
    try { return normalizeHostname(new URL(c).hostname) } catch (e) {}
  }
  return ''
}

function _normalizeBlacklistDomains(domains) {
  const unique = []
  for (const domain of Array.isArray(domains) ? domains : []) {
    const normalized = _normalizeDomainInput(domain)
    if (normalized && !unique.includes(normalized)) unique.push(normalized)
  }
  return unique
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

async function _getActiveSite() {
  try {
    if (!nativeAPI.tabs || typeof nativeAPI.tabs.query !== 'function') return ''
    const tabs = await nativeAPI.tabs.query({ active: true, currentWindow: true })
    const tab = Array.isArray(tabs) ? tabs[0] : null
    if (!tab || !/^https?:/i.test(tab.url || '')) return ''
    return _normalizeDomainInput(tab.url)
  } catch {
    return ''
  }
}

async function initPopup() {
  const settings = await loadSettings()

  await applyLangPref(settings.language)
  applyI18n()
  document.documentElement.lang = typeof getLang === 'function' ? getLang() : 'en'

  const version = nativeAPI.runtime.getManifest().version || '0.0.0'
  document.getElementById('versionBadge').textContent = 'v' + version

  const previewToggle = document.getElementById('previewEnabled')
  const triggerToggle = document.getElementById('previewTriggerMode')
  const triggerHint = document.getElementById('triggerHint')
  const multipleToggle = document.getElementById('multipleWindows')
  const blockToggle = document.getElementById('blockCurrentSite')
  const siteHint = document.getElementById('siteHint')
  const languageSelect = document.getElementById('language')
  const themeSelect = document.getElementById('theme')
  const blockRow = blockToggle.closest('.status-row')

  function _applyTheme(theme) {
    const resolved = theme || _detectSystemTheme()
    document.documentElement.dataset.theme = resolved
    document.documentElement.dataset.dpTheme = resolved
  }

  const updateTriggerHint = () => {
    triggerHint.textContent = typeof t === 'function'
      ? t(triggerToggle.checked ? 'triggerDropArea' : 'triggerRelease')
      : ''
  }

  const currentSite = await _getActiveSite()

  const renderSiteState = () => {
    if (!currentSite) {
      blockToggle.checked = false
      blockToggle.disabled = true
      siteHint.textContent = typeof t === 'function' ? t('blacklistCurrentDomainUnavailable') : ''
      blockRow.classList.add('is-disabled')
      return
    }

    blockToggle.disabled = false
    blockToggle.checked = _normalizeBlacklistDomains(settings.blacklistDomains).includes(currentSite)
    siteHint.textContent = currentSite
    blockRow.classList.remove('is-disabled')
  }

  previewToggle.checked = settings.previewEnabled !== false
  triggerToggle.checked = (settings.previewTriggerMode || 'release') === 'drop-area'
  multipleToggle.checked = (settings.maxPreviewWindows || 1) > 1
  languageSelect.value = (settings.language === 'zh_CN' || settings.language === 'zh')
    ? 'zh_CN'
    : (settings.language === 'en'
      ? 'en'
      : (typeof getLang === 'function' && getLang() === 'zh_CN' ? 'zh_CN' : 'en'))
  themeSelect.value = settings.theme === 'light' || settings.theme === 'dark'
    ? settings.theme
    : 'system'
  updateTriggerHint()
  renderSiteState()
  _applyTheme(settings.theme)

  previewToggle.addEventListener('change', () => {
    settings.previewEnabled = previewToggle.checked
    saveSettings({ previewEnabled: settings.previewEnabled })
  })

  triggerToggle.addEventListener('change', () => {
    settings.previewTriggerMode = triggerToggle.checked ? 'drop-area' : 'release'
    updateTriggerHint()
    saveSettings({ previewTriggerMode: settings.previewTriggerMode })
  })

  multipleToggle.addEventListener('change', () => {
    settings.maxPreviewWindows = multipleToggle.checked ? 10 : 1
    saveSettings({ maxPreviewWindows: settings.maxPreviewWindows })
  })

  blockToggle.addEventListener('change', async () => {
    if (!currentSite) return
    const next = _normalizeBlacklistDomains(settings.blacklistDomains)
    const index = next.indexOf(currentSite)
    if (blockToggle.checked && index === -1) next.push(currentSite)
    if (!blockToggle.checked && index !== -1) next.splice(index, 1)
    settings.blacklistDomains = next
    await saveSettings({ blacklistDomains: next })
  })

  languageSelect.addEventListener('change', async () => {
    settings.language = languageSelect.value
    await applyLangPref(settings.language)
    document.documentElement.lang = typeof getLang === 'function' ? getLang() : 'en'
    applyI18n()
    updateTriggerHint()
    renderSiteState()
    saveSettings({ language: settings.language })
  })

  themeSelect.addEventListener('change', () => {
    settings.theme = themeSelect.value === 'system' ? null : themeSelect.value
    _applyTheme(settings.theme)
    saveSettings({ theme: settings.theme })
  })

  document.getElementById('openSettings').addEventListener('click', () => {
    nativeAPI.runtime.openOptionsPage()
  })
}

document.addEventListener('DOMContentLoaded', initPopup)
