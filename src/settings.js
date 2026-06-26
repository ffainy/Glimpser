const nativeAPI = typeof browser !== 'undefined' ? browser : chrome

const DEFAULT_SETTINGS = {
  language: null,
  theme: null,
  previewEnabled: true,
  previewTriggerMode: 'release',
  dropZonePosition: 'bottom',
  dropZoneCustomSize: { width: 300, height: 150 },
  defaultWindowScale: { width: 75, height: 82 },
  maxPreviewWindows: 1,
  newWindowOffset: 24,
  closePreviewOnOpenNewTab: true,
  showCloseOthersButton: true,
  showCloseAllButton: true,
  corners: 'rounded',
  cornerRadius: 16,
  blacklistDomains: [],
  debug: false,
}

const TABS = ['general', 'preview', 'blacklist', 'about']
let _settings = {}
let _currentTheme = null

const ICONS = {
  general: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" stroke-width="2"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="2"/></svg>',
  preview: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  blacklist: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  about: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
}

function _t(key) {
  return typeof t === 'function' ? t(key) : key
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
    const n = _normalizeDomainInput(domain)
    if (n && !unique.includes(n)) unique.push(n)
  }
  return unique
}

// ── Helpers ────────────────────────────────────────────────────────────

function _sectionBody(iconSvg, titleKey, contentFn) {
  const body = document.createElement('div')
  body.className = 'section-body'

  if (titleKey) {
    const title = document.createElement('div')
    title.className = 'section-title'
    title.innerHTML = `<span class="section-icon">${iconSvg}</span>${_t(titleKey)}`
    body.appendChild(title)
  }
  body.appendChild(contentFn())
  return body
}

function _settingRow(labelKey, hintKey, controlFn) {
  const row = document.createElement('div')
  row.className = 'setting-row'
  const label = document.createElement('div')
  label.className = 'setting-label'

  const main = document.createElement('span')
  main.className = 'label-main'
  main.textContent = _t(labelKey)
  label.appendChild(main)

  if (hintKey) {
    const hint = document.createElement('span')
    hint.className = 'label-hint'
    hint.textContent = _t(hintKey)
    label.appendChild(hint)
  }

  row.appendChild(label)

  const control = document.createElement('div')
  control.className = 'setting-control'
  control.appendChild(controlFn())
  row.appendChild(control)

  return row
}

function _makeToggle(value, onChange) {
  const wrap = document.createElement('label')
  wrap.className = 'toggle'
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.checked = !!value
  input.addEventListener('change', () => onChange(input.checked))
  wrap.appendChild(input)
  const slider = document.createElement('span')
  slider.className = 'slider'
  wrap.appendChild(slider)
  return wrap
}

function _makeSelect(options, currentValue, labelKeyFn, onChange) {
  const sel = document.createElement('select')
  options.forEach(({ value, labelKey }) => {
    const opt = document.createElement('option')
    opt.value = value
    opt.textContent = _t(labelKey)
    if (value === currentValue) opt.selected = true
    sel.appendChild(opt)
  })
  sel.addEventListener('change', () => onChange(sel.value))
  return sel
}

function _makeOptionGroup(options, currentValue, onChange) {
  const group = document.createElement('div')
  group.className = 'btn-group'
  options.forEach(({ value, labelKey }) => {
    const btn = document.createElement('button')
    btn.className = 'option-btn' + (value === currentValue ? ' active' : '')
    btn.textContent = _t(labelKey)
    btn.addEventListener('click', () => {
      group.querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      onChange(value)
    })
    group.appendChild(btn)
  })
  return group
}

function _makeSlider(min, max, value, onChange) {
  const slider = document.createElement('input')
  slider.type = 'range'
  slider.min = String(min)
  slider.max = String(max)
  slider.value = String(value)
  slider.addEventListener('input', () => {
    const next = parseInt(slider.value, 10)
    onChange(next)
  })
  return slider
}

function _sliderRow(labelKey, value, unit, controlEl) {
  const row = document.createElement('div')
  row.className = 'slider-row'
  const lbl = document.createElement('span')
  lbl.className = 'slider-label'
  lbl.textContent = _t(labelKey)
  row.appendChild(lbl)
  row.appendChild(controlEl)
  const val = document.createElement('span')
  val.className = 'slider-value'
  val.textContent = unit ? `${value} ${unit}` : String(value)
  row.appendChild(val)
  return row
}

// ── Tab builders ───────────────────────────────────────────────────────

function _renderGeneralTab() {
  const wrap = document.createDocumentFragment()

  const body1 = _sectionBody(ICONS.general, 'labelPreferences', () => {
    const inner = document.createDocumentFragment()
    inner.appendChild(_settingRow('labelLang', 'hintLanguage', () =>
      _makeSelect(
        [{ value: 'en', labelKey: 'langEn' }, { value: 'zh_CN', labelKey: 'langZh' }],
        _settings.language || 'en',
        null,
        v => { _settings.language = v === 'en' ? null : v }
      )
    ))
    inner.appendChild(_settingRow('labelTheme', null, () =>
      _makeOptionGroup(
        [
          { value: 'dark', labelKey: 'themeDark' },
          { value: 'light', labelKey: 'themeLight' },
        ],
        _settings.theme || (_detectSystemTheme() === 'dark' ? 'dark' : 'light'),
        v => { _settings.theme = v }
      )
    ))
    inner.appendChild(_settingRow('labelPreviewEnabled', null, () =>
      _makeToggle(_settings.previewEnabled !== false, v => { _settings.previewEnabled = v })
    ))
    return inner
  })
  wrap.appendChild(body1)

  const body2 = _sectionBody(null, null, () => {
    const row = document.createElement('div')
    row.style.padding = '12px 0'
    const btn = document.createElement('button')
    btn.className = 'btn btn-primary'
    btn.textContent = _t('btnSave')
    btn.addEventListener('click', _save)
    row.appendChild(btn)
    return row
  })
  wrap.appendChild(body2)

  return wrap
}

function _detectSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function _renderPreviewTab() {
  const wrap = document.createDocumentFragment()

  wrap.appendChild(_sectionBody(ICONS.preview, 'labelPreviewTrigger', () => {
    const inner = document.createDocumentFragment()
    inner.appendChild(_settingRow('labelPreviewTrigger', 'hintPreviewTriggerRelease', () =>
      _makeOptionGroup(
        [
          { value: 'release', labelKey: 'triggerRelease' },
          { value: 'drop-area', labelKey: 'triggerDropArea' },
        ],
        _settings.previewTriggerMode || 'release',
        v => { _settings.previewTriggerMode = v }
      )
    ))
    if (_settings.previewTriggerMode !== 'release') {
      inner.appendChild(_settingRow('labelPos', null, () =>
        _makeOptionGroup(
          [
            { value: 'bottom', labelKey: 'posBottom' },
            { value: 'top', labelKey: 'posTop' },
          ],
          _settings.dropZonePosition || 'bottom',
          v => { _settings.dropZonePosition = v }
        )
      ))
    }
    return inner
  }))

  wrap.appendChild(_sectionBody(ICONS.preview, 'labelWindowDefaults', () => {
    const inner = document.createDocumentFragment()
    inner.appendChild(_settingRow('labelMaxPreviewWindows', null, () => {
      const input = document.createElement('input')
      input.type = 'number'
      input.min = '1'
      input.max = '12'
      input.value = String(_settings.maxPreviewWindows || 1)
      input.addEventListener('change', () => {
        const v = parseInt(input.value, 10)
        if (!isNaN(v) && v >= 1 && v <= 12) _settings.maxPreviewWindows = v
      })
      return input
    }))

    inner.appendChild(_sliderRow('labelWindowWidth', _settings.defaultWindowScale?.width || 75, '%',
      _makeSlider(30, 100, _settings.defaultWindowScale?.width || 75, v => {
        _settings.defaultWindowScale = { ..._settings.defaultWindowScale, width: v }
      })
    ))
    inner.appendChild(_sliderRow('labelWindowHeight', _settings.defaultWindowScale?.height || 82, '%',
      _makeSlider(30, 100, _settings.defaultWindowScale?.height || 82, v => {
        _settings.defaultWindowScale = { ..._settings.defaultWindowScale, height: v }
      })
    ))
    inner.appendChild(_sliderRow('labelWindowOffset', _settings.newWindowOffset || 24, 'px',
      _makeSlider(0, 100, _settings.newWindowOffset || 24, v => { _settings.newWindowOffset = v })
    ))
    return inner
  }))

  wrap.appendChild(_sectionBody(ICONS.preview, 'labelPreferences', () => {
    const inner = document.createDocumentFragment()
    inner.appendChild(_settingRow('labelCorners', null, () =>
      _makeOptionGroup(
        [
          { value: 'rounded', labelKey: 'cornersRounded' },
          { value: 'square', labelKey: 'cornersSquare' },
        ],
        _settings.corners || 'rounded',
        v => { _settings.corners = v }
      )
    ))
    inner.appendChild(_sliderRow('labelCornerRadius', _settings.cornerRadius ?? 16, 'px',
      _makeSlider(0, 32, _settings.cornerRadius ?? 16, v => { _settings.cornerRadius = v })
    ))
    return inner
  }))

  wrap.appendChild(_sectionBody(ICONS.preview, 'labelAdvancedPreview', () => {
    const inner = document.createDocumentFragment()
    inner.appendChild(_settingRow('labelClosePreviewOnOpenNewTab', null, () =>
      _makeToggle(_settings.closePreviewOnOpenNewTab !== false, v => { _settings.closePreviewOnOpenNewTab = v })
    ))
    return inner
  }))

  wrap.appendChild(_sectionBody(ICONS.preview, 'labelHeaderActions', () => {
    const inner = document.createDocumentFragment()
    inner.appendChild(_settingRow('labelShowCloseOthersButton', null, () =>
      _makeToggle(_settings.showCloseOthersButton !== false, v => { _settings.showCloseOthersButton = v })
    ))
    inner.appendChild(_settingRow('labelShowCloseAllButton', null, () =>
      _makeToggle(_settings.showCloseAllButton !== false, v => { _settings.showCloseAllButton = v })
    ))
    return inner
  }))

  return wrap
}

function _renderBlacklistTab() {
  const wrap = document.createDocumentFragment()

  wrap.appendChild(_sectionBody(ICONS.blacklist, 'labelBlacklistControls', () => {
    const inner = document.createDocumentFragment()

    const inputRow = document.createElement('div')
    inputRow.className = 'blacklist-input-row'
    const input = document.createElement('input')
    input.type = 'text'
    input.placeholder = _t('placeholderBlacklistDomain')
    const addBtn = document.createElement('button')
    addBtn.className = 'btn btn-primary btn-sm'
    addBtn.textContent = _t('btnAddDomain')
    addBtn.addEventListener('click', () => {
      const domain = _normalizeDomainInput(input.value)
      if (!domain) { _showStatus(_t('blacklistInvalidDomain'), true); return }
      if (_settings.blacklistDomains.includes(domain)) { _showStatus(_t('blacklistDuplicateDomain'), true); return }
      _settings.blacklistDomains.push(domain)
      input.value = ''
      _renderBlacklistItems(listEl)
      _showStatus(_t('blacklistDomainAdded'))
    })
    input.addEventListener('keydown', e => { if (e.key === 'Enter') addBtn.click() })
    inputRow.append(input, addBtn)
    inner.appendChild(inputRow)

    const addCurrentBtn = document.createElement('button')
    addCurrentBtn.className = 'btn btn-secondary btn-xs'
    addCurrentBtn.textContent = _t('btnAddCurrentDomain')
    addCurrentBtn.addEventListener('click', async () => {
      const tabs = await nativeAPI.tabs.query({ active: true, currentWindow: true })
      if (tabs[0]?.url) {
        try {
          const hostname = new URL(tabs[0].url).hostname.toLowerCase()
          if (hostname && !_settings.blacklistDomains.includes(hostname)) {
            _settings.blacklistDomains.push(hostname)
            _renderBlacklistItems(listEl)
            _showStatus(_t('blacklistCurrentDomainAdded'))
          }
        } catch (e) {}
      } else { _showStatus(_t('blacklistCurrentDomainUnavailable'), true) }
    })
    inner.appendChild(addCurrentBtn)

    const listEl = document.createElement('div')
    listEl.className = 'blacklist-list'
    listEl.style.marginTop = '10px'

    function _renderBlacklistItems(container) {
      container.innerHTML = ''
      const domains = _normalizeBlacklistDomains(_settings.blacklistDomains)
      if (domains.length === 0) {
        const empty = document.createElement('div')
        empty.className = 'blacklist-empty'
        empty.textContent = _t('blacklistListEmpty')
        container.appendChild(empty)
        return
      }
      domains.forEach((domain, idx) => {
        const tag = document.createElement('div')
        tag.className = 'blacklist-item'
        tag.innerHTML = `<span>${domain}</span>`
        const delBtn = document.createElement('button')
        delBtn.className = 'delete-btn'
        delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
        delBtn.addEventListener('click', () => {
          _settings.blacklistDomains.splice(idx, 1)
          _renderBlacklistItems(container)
          _showStatus(_t('blacklistDomainRemoved'))
        })
        tag.appendChild(delBtn)
        container.appendChild(tag)
      })
    }

    _renderBlacklistItems(listEl)
    inner.appendChild(listEl)
    return inner
  }))

  return wrap
}

function _renderAboutTab() {
  const wrap = document.createDocumentFragment()

  const section = document.createElement('div')
  section.className = 'about-section'

  const meta = document.createElement('div')
  meta.className = 'about-meta'
  const addMeta = (label, value) => {
    const l = document.createElement('span'); l.className = 'about-meta-label'; l.textContent = label
    const v = document.createElement('span'); v.className = 'about-meta-value'; v.textContent = value
    meta.append(l, v)
  }
  addMeta(_t('aboutVersion'), nativeAPI.runtime.getManifest().version || '0.0.0')
  addMeta(_t('aboutAuthor'), 'farfaraway')
  addMeta(_t('aboutHomepage'), 'github.com/ffainy/glimpser')
  section.appendChild(meta)

  const desc = document.createElement('div')
  desc.className = 'about-desc'
  desc.textContent = _t('aboutDescText')
  section.appendChild(desc)

  wrap.appendChild(section)
  return wrap
}

// ── Save ───────────────────────────────────────────────────────────────

async function _save() {
  try {
    _settings.blacklistDomains = _normalizeBlacklistDomains(_settings.blacklistDomains)
    await nativeAPI.storage.sync.set(_settings)
    _showStatus(_t('saved'))
  } catch (e) {
    _showStatus(_t('saveFailed'), true)
  }
}

function _showStatus(msg, isError = false) {
  const bar = document.getElementById('status-bar')
  bar.textContent = msg
  bar.className = 'visible' + (isError ? ' error' : '')
  clearTimeout(bar._timeout)
  bar._timeout = setTimeout(() => { bar.className = '' }, 2500)
}

// ── Theme toggle ───────────────────────────────────────────────────────

function _applyTheme(theme) {
  _currentTheme = theme
  document.documentElement.dataset.theme = theme
  const icon = document.getElementById('themeIcon')
  if (theme === 'light') {
    icon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  } else {
    icon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  }
}

// ── Init ───────────────────────────────────────────────────────────────

async function init() {
  await applyLangPref(null)

  try {
    _settings = await nativeAPI.storage.sync.get(DEFAULT_SETTINGS)
    _settings.blacklistDomains = _normalizeBlacklistDomains(_settings.blacklistDomains)
  } catch (e) {
    _settings = { ...DEFAULT_SETTINGS }
  }

  document.title = _t('settingsTitle')

  const version = nativeAPI.runtime.getManifest().version || '0.0.0'
  document.getElementById('versionBadge').textContent = 'v' + version
  document.getElementById('footerVersion').textContent = 'v' + version

  // Tabs
  const nav = document.getElementById('tabs')
  const tabKeys = ['tabGeneral', 'tabPreview', 'tabBlacklist', 'tabAbout']
  TABS.forEach((key, i) => {
    const btn = document.createElement('button')
    btn.className = 'tab-btn' + (i === 0 ? ' active' : '')
    btn.dataset.tab = key
    btn.textContent = _t(tabKeys[i])
    btn.addEventListener('click', () => _switchTab(key))
    nav.appendChild(btn)
  })

  // Content
  const content = document.getElementById('tab-content')
  const tabFns = [_renderGeneralTab, _renderPreviewTab, _renderBlacklistTab, _renderAboutTab]
  tabFns.forEach((fn, i) => {
    const el = fn()
    if (el instanceof DocumentFragment) {
      const wrap = document.createElement('div')
      wrap.id = `tab-${TABS[i]}`
      wrap.className = 'tab-section' + (i === 0 ? ' active' : '')
      wrap.appendChild(el)
      content.appendChild(wrap)
    }
  })

  // Theme toggle
  const currentTheme = _settings.theme || _detectSystemTheme()
  _applyTheme(currentTheme)

  document.getElementById('themeToggle').addEventListener('click', async () => {
    const next = _currentTheme === 'dark' ? 'light' : 'dark'
    _applyTheme(next)
    _settings.theme = next
    try { await nativeAPI.storage.sync.set({ theme: next }) } catch (e) {}
  })
}

function _switchTab(tabKey) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabKey))
  document.querySelectorAll('.tab-section').forEach(s => s.classList.toggle('active', s.id === `tab-${tabKey}`))
}

document.addEventListener('DOMContentLoaded', init)

if (typeof exports !== 'undefined') {
  Object.assign(exports, { DEFAULT_SETTINGS })
}
