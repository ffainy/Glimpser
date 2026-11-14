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
const PROJECT_URL = 'https://github.com/ffainy/glimpser'
const RELEASES_URL = `${PROJECT_URL}/releases`
const AUTHOR_URL = 'https://github.com/ffainy'

let _settings = {}
let _activeTab = 'general'
let _savedSnapshot = null
let _isSaving = false
let _resetPending = false
let _segmentedId = 0

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
  _renderFooterAuthor()
}

function _safeHref(value) {
  if (typeof value !== 'string' || !value.trim()) return ''
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : ''
  } catch (e) {
    return ''
  }
}

function _externalLink(text, href) {
  const label = String(text || '')
  const safeHref = _safeHref(href)
  if (!safeHref) {
    const span = document.createElement('span')
    span.textContent = label
    return span
  }
  const link = document.createElement('a')
  link.className = 'text-link'
  link.href = safeHref
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  link.textContent = label
  return link
}

function _externalLinkPill(text, href) {
  const link = _externalLink(text, href)
  if (link.tagName !== 'A') return link

  const label = link.textContent
  link.className = 'about-pill'
  link.title = href
  link.replaceChildren()

  const textEl = document.createElement('span')
  textEl.className = 'about-pill-text'
  textEl.textContent = label

  const icon = document.createElement('span')
  icon.className = 'about-pill-icon'
  icon.setAttribute('aria-hidden', 'true')
  icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M7 17 17 7M9 7h8v8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'

  link.append(textEl, icon)
  return link
}

function _renderFooterAuthor() {
  const host = document.getElementById('footerAuthorText')
  if (!host) return

  const template = _t('footerAuthor')
  const author = nativeAPI.runtime.getManifest().author || 'farfaraway'
  const token = '{author}'
  const index = template.indexOf(token)

  host.replaceChildren()
  if (index === -1) {
    host.append(document.createTextNode(template))
    return
  }

  const before = template.slice(0, index)
  const after = template.slice(index + token.length)
  if (before) host.append(document.createTextNode(before))
  host.append(_externalLink(author, AUTHOR_URL))
  if (after) host.append(document.createTextNode(after))
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
  const controlEl = controlFn()
  if (controlEl.classList.contains('segmented-control')) {
    row.classList.add('has-segmented')
  }
  control.appendChild(controlEl)
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

function _makeSegmented(options, currentValue, onChange, ariaLabelKey) {
  const group = document.createElement('div')
  group.className = 'segmented-control'
  group.setAttribute('role', 'radiogroup')
  if (ariaLabelKey) group.setAttribute('aria-label', _t(ariaLabelKey))

  _segmentedId += 1
  const name = `segmented-${_segmentedId}`

  options.forEach(({ value, labelKey }) => {
    const option = document.createElement('label')
    option.className = 'segmented-option'

    const input = document.createElement('input')
    input.type = 'radio'
    input.name = name
    input.value = value
    input.checked = value === currentValue
    input.addEventListener('change', () => {
      if (input.checked) onChange(value)
    })

    const text = document.createElement('span')
    text.textContent = _t(labelKey)

    option.append(input, text)
    group.appendChild(option)
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

  wrap.appendChild(_sectionBody(ICONS.extensionStatus, 'sectionExtension', () => {
    const inner = document.createDocumentFragment()
    inner.appendChild(_settingRow('labelEnableExtension', 'hintEnableExtension', () =>
      _makeToggle(_settings.previewEnabled !== false, v => { _settings.previewEnabled = v })
    ))
    return inner
  }))

  wrap.appendChild(_sectionBody(ICONS.languageTheme, 'sectionLanguageTheme', () => {
    const inner = document.createDocumentFragment()
    inner.appendChild(_settingRow('labelLang', 'hintLanguage', () =>
      _makeSegmented(
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
        },
        'labelLang'
      )
    ))
    inner.appendChild(_settingRow('labelTheme', 'hintTheme', () =>
      _makeSegmented(
        [
          { value: 'system', labelKey: 'themeSystem' },
          { value: 'light', labelKey: 'themeLight' },
          { value: 'dark', labelKey: 'themeDark' },
        ],
        _settings.theme || 'system',
        v => {
          _settings.theme = v === 'system' ? null : v
          _applyTheme(_resolveTheme())
        },
        'labelTheme'
      )
    ))
    return inner
  }))

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

  wrap.appendChild(_sectionBody(ICONS.openBehavior, 'sectionPreviewOpenBehavior', () => {
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

  wrap.appendChild(_sectionBody(ICONS.windowLayout, 'sectionPreviewWindowLayout', () => {
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

  wrap.appendChild(_sectionBody(ICONS.windowAppearance, 'sectionPreviewWindowAppearance', () => {
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

    inner.appendChild(_settingRow('labelRoundedCorners', 'hintCorners', () =>
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

  wrap.appendChild(_sectionBody(ICONS.previewBehavior, 'sectionPreviewBehavior', () => {
    const inner = document.createDocumentFragment()
    inner.appendChild(_settingRow('labelClosePreviewOnOpenNewTab', 'hintClosePreviewOnOpenNewTab', () =>
      _makeToggle(_settings.closePreviewOnOpenNewTab !== false, v => { _settings.closePreviewOnOpenNewTab = v })
    ))
    return inner
  }))

  wrap.appendChild(_sectionBody(ICONS.toolbarButtons, 'labelHeaderActions', () => {
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

  wrap.appendChild(_sectionBody(ICONS.addDomain, 'labelBlacklistControls', () => {
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

  const hero = document.createElement('div')
  hero.className = 'about-hero'
  const logo = document.createElement('span')
  logo.className = 'about-logo'
  logo.setAttribute('aria-hidden', 'true')

  const heroText = document.createElement('div')
  heroText.className = 'about-hero-text'
  const name = document.createElement('div')
  name.className = 'about-name'
  name.textContent = 'Glimpser'
  const tagline = document.createElement('p')
  tagline.className = 'about-tagline'
  tagline.textContent = _t('aboutDescText')
  heroText.append(name, tagline)
  hero.append(logo, heroText)
  section.appendChild(hero)

  const meta = document.createElement('div')
  meta.className = 'about-meta'
  const addMeta = (iconSvg, label, valueEl) => {
    const row = document.createElement('div')
    row.className = 'about-meta-row'
    const l = document.createElement('span')
    l.className = 'about-meta-label'

    const icon = document.createElement('span')
    icon.className = 'about-meta-icon'
    icon.setAttribute('aria-hidden', 'true')
    icon.innerHTML = iconSvg

    const text = document.createElement('span')
    text.textContent = label
    l.append(icon, text)

    const v = document.createElement('span')
    v.className = 'about-meta-value'
    v.appendChild(valueEl)
    row.append(l, v)
    meta.appendChild(row)
  }
  const manifest = nativeAPI.runtime.getManifest()
  const version = manifest.version || '0.0.0'
  const homepage = manifest.homepage_url || PROJECT_URL
  addMeta(ICONS.version, _t('aboutVersion'), _externalLinkPill(`v${version}`, RELEASES_URL))
  addMeta(ICONS.author, _t('aboutAuthor'), _externalLinkPill(manifest.author || 'farfaraway', AUTHOR_URL))
  addMeta(ICONS.homepage, _t('aboutHomepage'), _externalLinkPill(homepage.replace(/^https?:\/\//, ''), homepage))
  section.appendChild(meta)

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
    const label = _t(tabKeys[i])
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'tab-btn' + (key === _activeTab ? ' active' : '')
    btn.dataset.tab = key
    btn.id = `tab-btn-${key}`
    btn.setAttribute('role', 'tab')
    btn.setAttribute('aria-selected', String(key === _activeTab))
    btn.setAttribute('aria-controls', `tab-${key}`)
    btn.setAttribute('aria-label', label)
    btn.title = label
    btn.tabIndex = key === _activeTab ? 0 : -1

    const icon = document.createElement('span')
    icon.className = 'tab-icon'
    icon.innerHTML = ICONS[key]
    const text = document.createElement('span')
    text.className = 'tab-label'
    text.textContent = label
    btn.append(icon, text)

    btn.addEventListener('click', () => _switchTab(key))
    btn.addEventListener('keydown', _tabKeydown)
    nav.appendChild(btn)
  })

  const content = document.getElementById('tab-content')
  content.innerHTML = ''
  const tabFns = [_renderGeneralTab, _renderPreviewTab, _renderBlacklistTab, _renderAboutTab]
  tabFns.forEach((fn, i) => {
    const wrap = document.createElement('div')
    wrap.id = `tab-${TABS[i]}`
    wrap.className = 'tab-section' + (TABS[i] === _activeTab ? ' active' : '')
    wrap.setAttribute('role', 'tabpanel')
    wrap.setAttribute('aria-labelledby', `tab-btn-${TABS[i]}`)
    wrap.appendChild(fn())
    content.appendChild(wrap)
  })
}

function _tabKeydown(event) {
  const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
  if (!keys.includes(event.key)) return

  event.preventDefault()
  const current = TABS.indexOf(_activeTab)
  let next = current
  if (event.key === 'ArrowLeft') next = (current - 1 + TABS.length) % TABS.length
  if (event.key === 'ArrowRight') next = (current + 1) % TABS.length
  if (event.key === 'Home') next = 0
  if (event.key === 'End') next = TABS.length - 1
  _switchTab(TABS[next], true)
}

function _switchTab(tabKey, focusTab = false) {
  _activeTab = tabKey
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    const active = btn.dataset.tab === tabKey
    btn.classList.toggle('active', active)
    btn.setAttribute('aria-selected', String(active))
    btn.tabIndex = active ? 0 : -1
    if (active && focusTab) btn.focus()
  })
  document.querySelectorAll('.tab-section').forEach((section) => {
    section.classList.toggle('active', section.id === `tab-${tabKey}`)
  })
}

document.addEventListener('DOMContentLoaded', init)

if (typeof exports !== 'undefined') {
  Object.assign(exports, { DEFAULT_SETTINGS })
}
