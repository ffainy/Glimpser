const nativeAPI = typeof browser !== 'undefined' ? browser : chrome

const DEFAULT_SETTINGS = {
  language: null,
  theme: null,
  previewEnabled: true,
  previewTriggerMode: 'release',
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
let _activeTab = 'general'
let _savedSnapshot = null
let _isSaving = false
let _resetPending = false

const ICONS = {
  general: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  preview: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  blacklist: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  about: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/><path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
}

function _t(key) {
  return typeof t === 'function' ? t(key) : key
}

function _applyStaticI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = _t(el.dataset.i18n)
  })
  document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
    el.setAttribute('aria-label', _t(el.dataset.i18nAriaLabel))
  })
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.setAttribute('title', _t(el.dataset.i18nTitle))
  })
}

function _clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function _clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function _stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(_stableStringify).join(',')}]`
  }
  if (value && typeof value === 'object') {
    const entries = Object.keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${_stableStringify(value[key])}`)
    return `{${entries.join(',')}}`
  }
  return JSON.stringify(value)
}

function _snapshotSettings() {
  return _stableStringify(_settings)
}

function _isDirty() {
  return _savedSnapshot !== null && _snapshotSettings() !== _savedSnapshot
}

function _buildResetSettings() {
  return {
    ..._clone(DEFAULT_SETTINGS),
    // The blacklist is managed separately and must survive a form reset.
    blacklistDomains: _clone(_settings.blacklistDomains || []),
    // `debug` has no settings UI, so preserve it explicitly.
    debug: _settings.debug,
  }
}

function _updateDirtyState() {
  const saveBtn = document.getElementById('btnSave')
  const resetBtn = document.getElementById('btnReset')
  const stateText = document.getElementById('saveStateText')
  if (!saveBtn || !resetBtn || !stateText) return

  const dirty = _isDirty()
  document.body.classList.toggle('is-dirty', dirty)
  saveBtn.disabled = !dirty || _isSaving
  resetBtn.disabled = _isSaving

  if (_isSaving) {
    stateText.textContent = _t('stateSaving')
  } else if (!dirty) {
    stateText.textContent = _t('stateSaved')
  } else if (_resetPending) {
    stateText.textContent = _t('stateResetUnsaved')
  } else {
    stateText.textContent = _t('stateDirty')
  }
}

function _currentLang() {
  return typeof getLang === 'function' ? getLang() : 'en'
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

function _makeSelect(options, currentValue, onChange) {
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

function _sliderRow(labelKey, value, unit, controlEl, hintKey) {
  const row = document.createElement('div')
  row.className = 'slider-row'

  const labelGroup = document.createElement('div')
  labelGroup.className = 'slider-label-group'

  const lbl = document.createElement('span')
  lbl.className = 'slider-label'
  lbl.textContent = _t(labelKey)
  labelGroup.appendChild(lbl)

  if (hintKey) {
    const hint = document.createElement('span')
    hint.className = 'slider-hint'
    hint.textContent = _t(hintKey)
    labelGroup.appendChild(hint)
  }

  row.appendChild(labelGroup)
  row.appendChild(controlEl)
  const val = document.createElement('span')
  val.className = 'slider-value'
  const format = (next) => unit ? `${next} ${unit}` : String(next)
  val.textContent = format(value)
  controlEl.addEventListener('input', () => {
    val.textContent = format(controlEl.value)
  })
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
        _settings.language || _currentLang(),
        v => {
          _settings.language = v
          applyLangPref(v).then(() => {
            document.documentElement.lang = _currentLang()
            _applyStaticI18n()
            _renderTabsAndContent()
            _resetPending = false
            _updateDirtyState()
          })
        }
      )
    ))
    inner.appendChild(_settingRow('labelTheme', 'hintTheme', () =>
      _makeSelect(
        [
          { value: 'system', labelKey: 'themeSystem' },
          { value: 'light', labelKey: 'themeLight' },
          { value: 'dark', labelKey: 'themeDark' },
        ],
        _settings.theme || 'system',
        v => {
          _settings.theme = v === 'system' ? null : v
          _applyTheme(_resolveTheme())
        }
      )
    ))
    inner.appendChild(_settingRow('labelPreviewEnabled', null, () =>
      _makeToggle(_settings.previewEnabled !== false, v => { _settings.previewEnabled = v })
    ))
    return inner
  })
  wrap.appendChild(body1)

  return wrap
}

function _detectSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function _resolveTheme(theme = _settings.theme) {
  return theme === 'light' || theme === 'dark' ? theme : _detectSystemTheme()
}

function _renderPreviewTab() {
  const wrap = document.createDocumentFragment()

  wrap.appendChild(_sectionBody(ICONS.preview, 'labelPreviewTrigger', () => {
    const inner = document.createDocumentFragment()

    let triggerHint = null
    const syncHint = () => {
      if (!triggerHint) return
      const key = (_settings.previewTriggerMode || 'release') === 'release'
        ? 'hintPreviewTriggerRelease'
        : 'hintPreviewTriggerDropArea'
      triggerHint.textContent = _t(key)
    }

    const triggerRow = _settingRow('labelPreviewTrigger', 'hintPreviewTriggerRelease', () =>
      _makeToggle((_settings.previewTriggerMode || 'release') === 'drop-area', v => {
        _settings.previewTriggerMode = v ? 'drop-area' : 'release'
        syncHint()
      })
    )
    triggerHint = triggerRow.querySelector('.label-hint')

    syncHint()
    inner.appendChild(triggerRow)
    return inner
  }))

  wrap.appendChild(_sectionBody(ICONS.preview, 'labelWindowDefaults', () => {
    const inner = document.createDocumentFragment()
    inner.appendChild(_settingRow('labelMultiplePreviewWindows', 'hintMaxPreviewWindows', () =>
      _makeToggle((_settings.maxPreviewWindows || 1) > 1, v => {
        _settings.maxPreviewWindows = v ? 10 : 1
      })
    ))

    inner.appendChild(_sliderRow('labelWindowWidth', _settings.defaultWindowScale?.width ?? 75, '%',
      _makeSlider(35, 92, _settings.defaultWindowScale?.width ?? 75, v => {
        _settings.defaultWindowScale = { ..._settings.defaultWindowScale, width: v }
      }), 'hintDefaultWindowSize'
    ))
    inner.appendChild(_sliderRow('labelWindowHeight', _settings.defaultWindowScale?.height ?? 82, '%',
      _makeSlider(35, 92, _settings.defaultWindowScale?.height ?? 82, v => {
        _settings.defaultWindowScale = { ..._settings.defaultWindowScale, height: v }
      })
    ))
    inner.appendChild(_sliderRow('labelWindowOffset', _settings.newWindowOffset ?? 24, 'px',
      _makeSlider(0, 64, _settings.newWindowOffset ?? 24, v => { _settings.newWindowOffset = v }), 'hintWindowOffset'
    ))
    return inner
  }))

  wrap.appendChild(_sectionBody(ICONS.preview, 'labelPreferences', () => {
    const inner = document.createDocumentFragment()

    let radiusRow = null
    const syncCorners = () => {
      if (!radiusRow) return
      const square = _settings.corners === 'square'
      radiusRow.classList.toggle('is-disabled', square)
      const input = radiusRow.querySelector('input[type="range"]')
      if (input) {
        input.disabled = square
        input.setAttribute('aria-disabled', String(square))
      }
    }

    inner.appendChild(_settingRow('labelCorners', 'hintCorners', () =>
      _makeToggle(_settings.corners !== 'square', v => {
        _settings.corners = v ? 'rounded' : 'square'
        syncCorners()
      })
    ))

    radiusRow = _sliderRow('labelCornerRadius', _settings.cornerRadius ?? 16, 'px',
      _makeSlider(4, 28, _settings.cornerRadius ?? 16, v => { _settings.cornerRadius = v }), 'hintCornerRadius'
    )
    inner.appendChild(radiusRow)
    syncCorners()
    return inner
  }))

  wrap.appendChild(_sectionBody(ICONS.preview, 'labelAdvancedPreview', () => {
    const inner = document.createDocumentFragment()
    inner.appendChild(_settingRow('labelClosePreviewOnOpenNewTab', 'hintClosePreviewOnOpenNewTab', () =>
      _makeToggle(_settings.closePreviewOnOpenNewTab !== false, v => { _settings.closePreviewOnOpenNewTab = v })
    ))
    return inner
  }))

  wrap.appendChild(_sectionBody(ICONS.preview, 'labelHeaderActions', () => {
    const inner = document.createDocumentFragment()
    inner.appendChild(_settingRow('labelShowCloseOthersButton', 'hintShowCloseOthersButton', () =>
      _makeToggle(_settings.showCloseOthersButton !== false, v => { _settings.showCloseOthersButton = v })
    ))
    inner.appendChild(_settingRow('labelShowCloseAllButton', 'hintShowCloseAllButton', () =>
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
    input.setAttribute('aria-label', _t('labelDomainToBlock'))
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
      _resetPending = false
      _updateDirtyState()
      _showStatus(_t('blacklistDomainAdded'))
    })
    input.addEventListener('keydown', e => { if (e.key === 'Enter') addBtn.click() })
    inputRow.append(input, addBtn)
    inner.appendChild(inputRow)

    const addCurrentBtn = document.createElement('button')
    addCurrentBtn.className = 'btn btn-secondary btn-xs'
    addCurrentBtn.textContent = _t('btnAddCurrentDomain')
    addCurrentBtn.addEventListener('click', async () => {
      try {
        const tabs = await nativeAPI.tabs.query({})
        const candidates = tabs
          .filter(tab => /^https?:/i.test(tab.url || ''))
          .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))
        const hostname = candidates[0] ? _normalizeDomainInput(candidates[0].url) : ''
        if (!hostname) {
          _showStatus(_t('blacklistCurrentDomainUnavailable'), true)
          return
        }
        if (_settings.blacklistDomains.includes(hostname)) {
          _showStatus(_t('blacklistDuplicateDomain'), true)
          return
        }
        _settings.blacklistDomains.push(hostname)
        _renderBlacklistItems(listEl)
        _resetPending = false
        _updateDirtyState()
        _showStatus(_t('blacklistCurrentDomainAdded'))
      } catch (e) {
        _showStatus(_t('blacklistCurrentDomainUnavailable'), true)
      }
    })
    inner.appendChild(addCurrentBtn)

    const listEl = document.createElement('div')
    listEl.className = 'blacklist-list'
    listEl.style.marginTop = '10px'

    function _renderBlacklistItems(container) {
      container.replaceChildren()
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
        const domainLabel = document.createElement('span')
        domainLabel.textContent = domain
        tag.appendChild(domainLabel)
        const delBtn = document.createElement('button')
        delBtn.className = 'delete-btn'
        delBtn.setAttribute('aria-label', _t('btnDelete'))
        delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
        delBtn.addEventListener('click', () => {
          _settings.blacklistDomains.splice(idx, 1)
          _renderBlacklistItems(container)
          _resetPending = false
          _updateDirtyState()
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
  const manifest = nativeAPI.runtime.getManifest()
  addMeta(_t('aboutVersion'), manifest.version || '0.0.0')
  addMeta(_t('aboutAuthor'), manifest.author || '')
  addMeta(_t('aboutHomepage'), manifest.homepage_url || '')
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
  if (_isSaving) return
  _isSaving = true
  _updateDirtyState()
  try {
    _settings.blacklistDomains = _normalizeBlacklistDomains(_settings.blacklistDomains)
    await nativeAPI.storage.sync.set(_settings)
    _savedSnapshot = _snapshotSettings()
    _resetPending = false
    _showStatus(_t('saved'))
    // Best-effort cleanup for settings removed in the fullscreen-only redesign.
    Promise.resolve(nativeAPI.storage.sync.remove(['dropZonePosition', 'dropZoneCustomSize']))
      .catch(() => {})
  } catch (e) {
    _showStatus(_t('saveFailed'), true)
  } finally {
    _isSaving = false
    _updateDirtyState()
  }
}

async function _reset() {
  const next = _buildResetSettings()
  if (_stableStringify(next) === _snapshotSettings()) return
  if (!confirm(_t('confirmReset'))) return

  _settings = next
  _resetPending = true
  await applyLangPref(_settings.language)
  document.documentElement.lang = _currentLang()
  _applyStaticI18n()
  _applyTheme(_resolveTheme())
  _renderTabsAndContent()
  _updateDirtyState()
}

function _showStatus(msg, isError = false) {
  const bar = document.getElementById('status-bar')
  bar.textContent = msg
  bar.className = 'visible' + (isError ? ' error' : '')
  clearTimeout(bar._timeout)
  bar._timeout = setTimeout(() => { bar.className = '' }, 2500)
}

// ── Theme ──────────────────────────────────────────────────────────────

function _applyTheme(theme) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.dataset.dpTheme = theme
}

// ── Init ───────────────────────────────────────────────────────────────

async function init() {
  try {
    _settings = await nativeAPI.storage.sync.get(DEFAULT_SETTINGS)
    _settings.blacklistDomains = _normalizeBlacklistDomains(_settings.blacklistDomains)
  } catch (e) {
    _settings = {
      ...DEFAULT_SETTINGS,
      defaultWindowScale: { ...DEFAULT_SETTINGS.defaultWindowScale },
      blacklistDomains: [],
    }
  }

  delete _settings.dropZonePosition
  delete _settings.dropZoneCustomSize
  _savedSnapshot = _snapshotSettings()

  await applyLangPref(_settings.language)
  document.documentElement.lang = _currentLang()
  _applyStaticI18n()

  const version = nativeAPI.runtime.getManifest().version || '0.0.0'
  document.getElementById('versionBadge').textContent = 'v' + version
  document.getElementById('footerVersion').textContent = 'v' + version

  _renderTabsAndContent()
  _applyTheme(_resolveTheme())

  document.getElementById('btnSave').addEventListener('click', _save)
  document.getElementById('btnReset').addEventListener('click', _reset)

  const content = document.getElementById('tab-content')
  ;['input', 'change', 'click'].forEach((type) => {
    content.addEventListener(type, () => {
      _resetPending = false
      _updateDirtyState()
    })
  })

  window.addEventListener('beforeunload', (event) => {
    if (!_isDirty()) return
    event.preventDefault()
    event.returnValue = ''
  })

  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
  const onSystemThemeChange = () => {
    if (!_settings.theme) _applyTheme(_detectSystemTheme())
  }
  if (typeof systemTheme.addEventListener === 'function') {
    systemTheme.addEventListener('change', onSystemThemeChange)
  } else if (typeof systemTheme.addListener === 'function') {
    systemTheme.addListener(onSystemThemeChange)
  }

  _updateDirtyState()
}

function _renderTabsAndContent() {
  const nav = document.getElementById('tabs')
  nav.innerHTML = ''
  const tabKeys = ['tabGeneral', 'tabPreview', 'tabBlacklist', 'tabAbout']
  TABS.forEach((key, i) => {
    const btn = document.createElement('button')
    btn.className = 'tab-btn' + (key === _activeTab ? ' active' : '')
    btn.dataset.tab = key
    btn.textContent = _t(tabKeys[i])
    btn.addEventListener('click', () => _switchTab(key))
    nav.appendChild(btn)
  })

  const content = document.getElementById('tab-content')
  content.innerHTML = ''
  const tabFns = [_renderGeneralTab, _renderPreviewTab, _renderBlacklistTab, _renderAboutTab]
  tabFns.forEach((fn, i) => {
    const wrap = document.createElement('div')
    wrap.id = `tab-${TABS[i]}`
    wrap.className = 'tab-section' + (TABS[i] === _activeTab ? ' active' : '')
    wrap.appendChild(fn())
    content.appendChild(wrap)
  })
}

function _switchTab(tabKey) {
  _activeTab = tabKey
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabKey))
  document.querySelectorAll('.tab-section').forEach(s => s.classList.toggle('active', s.id === `tab-${tabKey}`))
}

document.addEventListener('DOMContentLoaded', init)

if (typeof exports !== 'undefined') {
  Object.assign(exports, { DEFAULT_SETTINGS })
}
