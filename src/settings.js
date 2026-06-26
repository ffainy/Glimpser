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

function _t(key) {
  return typeof t === 'function' ? t(key) : key
}

function _normalizeDomainInput(value) {
  const trimmed = String(value || '').trim().toLowerCase().replace(/\.+$/, '')
  if (!trimmed) return ''
  const normalizeHostname = (hostname) => {
    const normalized = String(hostname || '').trim().toLowerCase().replace(/\.+$/, '')
    if (!normalized) return ''
    const labels = normalized.split('.')
    if (labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))) return ''
    return normalized
  }
  if (!trimmed.includes('/') && !trimmed.includes(':')) return normalizeHostname(trimmed)
  const candidates = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? [trimmed] : [`https://${trimmed}`]
  for (const candidate of candidates) {
    try {
      const parsed = new URL(candidate)
      return normalizeHostname(parsed.hostname)
    } catch (e) {}
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

// ── Tab rendering ───────────────────────────────────────────────────────

function _renderTabs() {
  const nav = document.getElementById('tabs')
  nav.innerHTML = ''
  const tabKeys = ['tabGeneral', 'tabPreview', 'tabBlacklist', 'tabAbout']
  TABS.forEach((key, i) => {
    const btn = document.createElement('button')
    btn.className = 'tab-btn' + (i === 0 ? ' active' : '')
    btn.role = 'tab'
    btn.dataset.tab = key
    btn.textContent = _t(tabKeys[i])
    btn.addEventListener('click', () => _switchTab(key))
    nav.appendChild(btn)
  })
}

function _switchTab(tabKey) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabKey))
  document.querySelectorAll('.tab-section').forEach(s => s.classList.toggle('active', s.id === `tab-${tabKey}`))
}

function _showStatus(msg, isError = false) {
  const bar = document.getElementById('status-bar')
  bar.textContent = msg
  bar.className = 'visible' + (isError ? ' error' : '')
  clearTimeout(bar._timeout)
  bar._timeout = setTimeout(() => { bar.className = '' }, 2500)
}

function _field(name, labelKey, controlFn, hintKey) {
  const row = document.createElement('div')
  row.className = 'field-row'
  const label = document.createElement('div')
  label.className = 'field-label'
  label.textContent = _t(labelKey)
  row.appendChild(label)
  row.appendChild(controlFn())
  if (hintKey) {
    const hint = document.createElement('div')
    hint.className = 'field-hint'
    hint.textContent = _t(hintKey)
    label.appendChild(hint)
  }
  return row
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

function _makeToggle(currentValue, onChange) {
  const cb = document.createElement('input')
  cb.type = 'checkbox'
  cb.checked = !!currentValue
  cb.addEventListener('change', () => onChange(cb.checked))
  return cb
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

function _makeSlider(labelKey, min, max, value, unit, onChange) {
  const row = document.createElement('div')
  row.className = 'slider-row'
  const header = document.createElement('div')
  header.className = 'slider-header'
  const lbl = document.createElement('span')
  lbl.className = 'field-label'
  lbl.textContent = _t(labelKey)
  const val = document.createElement('span')
  val.className = 'slider-value'
  val.textContent = unit ? `${value} ${unit}` : String(value)
  const slider = document.createElement('input')
  slider.type = 'range'
  slider.min = String(min)
  slider.max = String(max)
  slider.value = String(value)
  slider.addEventListener('input', () => {
    const next = parseInt(slider.value, 10)
    val.textContent = unit ? `${next} ${unit}` : String(next)
    onChange(next)
  })
  header.append(lbl, val)
  row.append(header, slider)
  return row
}

function _makeCard(titleKey, contentFn) {
  const card = document.createElement('div')
  card.className = 'card'
  if (titleKey) {
    const title = document.createElement('div')
    title.className = 'card-title'
    title.textContent = _t(titleKey)
    card.appendChild(title)
  }
  card.appendChild(contentFn())
  return card
}

function _makeNumberInput(value, min, max, onChange) {
  const input = document.createElement('input')
  input.type = 'number'
  input.value = String(value)
  input.min = String(min)
  input.max = String(max)
  input.addEventListener('change', () => {
    const v = parseInt(input.value, 10)
    if (!isNaN(v) && v >= min && v <= max) onChange(v)
  })
  return input
}

// ── Tab content builders ─────────────────────────────────────────────────

function _renderGeneralTab() {
  const wrap = document.createElement('div')

  wrap.appendChild(_makeCard('labelPreferences', () => {
    const inner = document.createDocumentFragment()
    inner.appendChild(_field('language', 'labelLang', () =>
      _makeSelect(
        [{ value: 'en', labelKey: 'themeLight' }, { value: 'zh_CN', labelKey: 'themeDark' }],
        _settings.language || 'en',
        v => { _settings.language = v === 'en' ? null : v }
      ), 'hintLanguage'
    ))
    inner.appendChild(_field('theme', 'labelTheme', () => {
      const group = document.createElement('div')
      group.className = 'btn-group'
      const modes = [
        { value: 'dark', label: _t('themeDark') },
        { value: 'light', label: _t('themeLight') },
      ]
      const current = _settings.theme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      modes.forEach(({ value, label }) => {
        const btn = document.createElement('button')
        btn.className = 'option-btn' + (value === current ? ' active' : '')
        btn.textContent = label
        btn.addEventListener('click', () => {
          group.querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'))
          btn.classList.add('active')
          _settings.theme = value
        })
        group.appendChild(btn)
      })
      return group
    }, 'hintThemeDark'))
    inner.appendChild(_field('previewEnabled', 'labelPreviewEnabled', () => _makeToggle(_settings.previewEnabled !== false, v => { _settings.previewEnabled = v })))
    return inner
  }))

  wrap.appendChild(_makeCard(null, () => {
    const btn = document.createElement('button')
    btn.className = 'btn btn-primary'
    btn.textContent = _t('btnSave')
    btn.addEventListener('click', _save)
    return btn
  }))

  return wrap
}

function _labelPreviewEnabled() {
  // i18n key might not exist; use hardcoded fallback
  return 'Enable preview'
}

function _renderPreviewTab() {
  const wrap = document.createElement('div')

  wrap.appendChild(_makeCard('labelPreviewTrigger', () => {
    const inner = document.createDocumentFragment()
    inner.appendChild(_field('triggerMode', 'labelPreviewTrigger', () =>
      _makeOptionGroup(
        [{ value: 'release', labelKey: 'triggerRelease' }, { value: 'drop-area', labelKey: 'triggerDropArea' }],
        _settings.previewTriggerMode || 'release',
        v => { _settings.previewTriggerMode = v }
      )
    ))
    if (_settings.previewTriggerMode !== 'release') {
      inner.appendChild(_field('dropZonePosition', 'labelPos', () =>
        _makeOptionGroup(
          [{ value: 'bottom', labelKey: 'posBottom' }, { value: 'top', labelKey: 'posTop' }],
          _settings.dropZonePosition || 'bottom',
          v => { _settings.dropZonePosition = v }
        )
      ))
    }
    return inner
  }))

  wrap.appendChild(_makeCard('labelWindowDefaults', () => {
    const inner = document.createDocumentFragment()
    inner.appendChild(_field('maxWindows', 'labelMaxPreviewWindows', () =>
      _makeNumberInput(_settings.maxPreviewWindows || 1, 1, 12, v => { _settings.maxPreviewWindows = v })
    ))
    inner.appendChild(_makeSlider('labelWindowWidth', 30, 100, _settings.defaultWindowScale?.width || 75, '%', v => {
      _settings.defaultWindowScale = { ..._settings.defaultWindowScale, width: v }
    }))
    inner.appendChild(_makeSlider('labelWindowHeight', 30, 100, _settings.defaultWindowScale?.height || 82, '%', v => {
      _settings.defaultWindowScale = { ..._settings.defaultWindowScale, height: v }
    }))
    inner.appendChild(_makeSlider('labelWindowOffset', 0, 100, _settings.newWindowOffset || 24, 'px', v => { _settings.newWindowOffset = v }))
    return inner
  }))

  wrap.appendChild(_makeCard('labelPreferences', () => {
    const inner = document.createDocumentFragment()
    inner.appendChild(_field('corners', 'labelCorners', () =>
      _makeOptionGroup(
        [{ value: 'rounded', labelKey: 'cornersRounded' }, { value: 'square', labelKey: 'cornersSquare' }],
        _settings.corners || 'rounded',
        v => { _settings.corners = v }
      )
    ))
    inner.appendChild(_makeSlider('labelCornerRadius', 0, 32, _settings.cornerRadius ?? 16, 'px', v => { _settings.cornerRadius = v }))
    return inner
  }))

  wrap.appendChild(_makeCard('labelAdvancedPreview', () => {
    const inner = document.createDocumentFragment()
    inner.appendChild(_field('closeOnNewTab', 'labelClosePreviewOnOpenNewTab', () =>
      _makeToggle(_settings.closePreviewOnOpenNewTab !== false, v => { _settings.closePreviewOnOpenNewTab = v })
    ))
    return inner
  }))

  wrap.appendChild(_makeCard('labelHeaderActions', () => {
    const inner = document.createDocumentFragment()
    inner.appendChild(_field('showCloseOthers', 'labelShowCloseOthersButton', () =>
      _makeToggle(_settings.showCloseOthersButton !== false, v => { _settings.showCloseOthersButton = v })
    ))
    inner.appendChild(_field('showCloseAll', 'labelShowCloseAllButton', () =>
      _makeToggle(_settings.showCloseAllButton !== false, v => { _settings.showCloseAllButton = v })
    ))
    return inner
  }))

  return wrap
}

function _renderBlacklistTab() {
  const wrap = document.createElement('div')

  const card = _makeCard('labelBlacklistControls', () => {
    const inner = document.createDocumentFragment()
    const row = document.createElement('div')
    row.className = 'blacklist-input-row'
    const input = document.createElement('input')
    input.type = 'text'
    input.placeholder = _t('placeholderBlacklistDomain')
    const addBtn = document.createElement('button')
    addBtn.className = 'btn btn-primary'
    addBtn.textContent = _t('btnAddDomain')
    addBtn.addEventListener('click', () => {
      const domain = _normalizeDomainInput(input.value)
      if (!domain) {
        _showStatus(_t('blacklistInvalidDomain'), true)
        return
      }
      if (_settings.blacklistDomains.includes(domain)) {
        _showStatus(_t('blacklistDuplicateDomain'), true)
        return
      }
      _settings.blacklistDomains.push(domain)
      input.value = ''
      _renderBlacklist(listEl, addBtn)
      _showStatus(_t('blacklistDomainAdded'))
    })
    row.append(input, addBtn)
    inner.appendChild(row)

    const addCurrentBtn = document.createElement('button')
    addCurrentBtn.className = 'btn btn-primary btn-sm'
    addCurrentBtn.textContent = _t('btnAddCurrentDomain')
    addCurrentBtn.addEventListener('click', async () => {
      const tabs = await nativeAPI.tabs.query({ active: true, currentWindow: true })
      if (tabs[0]?.url) {
        try {
          const hostname = new URL(tabs[0].url).hostname.toLowerCase()
          if (hostname && !_settings.blacklistDomains.includes(hostname)) {
            _settings.blacklistDomains.push(hostname)
            _renderBlacklist(listEl)
            _showStatus(_t('blacklistCurrentDomainAdded'))
          }
        } catch (e) {}
      } else {
        _showStatus(_t('blacklistCurrentDomainUnavailable'), true)
      }
    })
    inner.appendChild(addCurrentBtn)

    const listEl = document.createElement('div')
    listEl.style.marginTop = '12px'

    function _renderBlacklist(listContainer) {
      listContainer.innerHTML = ''
      const domains = _normalizeBlacklistDomains(_settings.blacklistDomains)
      if (domains.length === 0) {
        const empty = document.createElement('div')
        empty.className = 'blacklist-empty'
        empty.textContent = _t('blacklistListEmpty')
        listContainer.appendChild(empty)
        return
      }
      domains.forEach((domain, idx) => {
        const item = document.createElement('div')
        item.className = 'blacklist-item'
        const span = document.createElement('span')
        span.textContent = domain
        const btnGroup = document.createElement('div')
        btnGroup.className = 'btn-group'
        const delBtn = document.createElement('button')
        delBtn.className = 'btn btn-danger btn-sm'
        delBtn.textContent = _t('btnDelete')
        delBtn.addEventListener('click', () => {
          _settings.blacklistDomains.splice(idx, 1)
          _renderBlacklist(listContainer)
          _showStatus(_t('blacklistDomainRemoved'))
        })
        btnGroup.appendChild(delBtn)
        item.append(span, btnGroup)
        listContainer.appendChild(item)
      })
    }

    _renderBlacklist(listEl)
    inner.appendChild(listEl)
    return inner
  })

  wrap.appendChild(card)
  return wrap
}

function _renderAboutTab() {
  const wrap = document.createElement('div')

  const card = document.createElement('div')
  card.className = 'card'

  const meta = document.createElement('div')
  meta.className = 'about-meta'

  const addMeta = (label, value) => {
    const l = document.createElement('span')
    l.className = 'about-meta-label'
    l.textContent = label
    const v = document.createElement('span')
    v.className = 'about-meta-value'
    v.textContent = value
    meta.append(l, v)
  }

  addMeta(_t('aboutVersion'), nativeAPI.runtime.getManifest().version || '0.0.0')
  addMeta(_t('aboutAuthor'), 'farfaraway')
  addMeta(_t('aboutHomepage'), 'github.com/ffainy/glimpser')

  card.appendChild(meta)

  const desc = document.createElement('div')
  desc.className = 'about-desc'
  desc.textContent = _t('aboutDescText')
  card.appendChild(desc)

  wrap.appendChild(card)
  return wrap
}

// ── Save ─────────────────────────────────────────────────────────────────

async function _save() {
  try {
    _settings.blacklistDomains = _normalizeBlacklistDomains(_settings.blacklistDomains)
    await nativeAPI.storage.sync.set(_settings)
    _showStatus(_t('saved'))
  } catch (e) {
    _showStatus(_t('saveFailed'), true)
  }
}

// ── Init ─────────────────────────────────────────────────────────────────

async function init() {
  await applyLangPref(null)

  try {
    _settings = await nativeAPI.storage.sync.get(DEFAULT_SETTINGS)
    _settings.blacklistDomains = _normalizeBlacklistDomains(_settings.blacklistDomains)
  } catch (e) {
    _settings = { ...DEFAULT_SETTINGS }
  }

  document.title = _t('settingsTitle')

  _renderTabs()

  const content = document.getElementById('tab-content')
  content.innerHTML = ''
  const tabs = [_renderGeneralTab(), _renderPreviewTab(), _renderBlacklistTab(), _renderAboutTab()]
  tabs.forEach((el, i) => {
    el.id = `tab-${TABS[i]}`
    el.className = 'tab-section' + (i === 0 ? ' active' : '')
    content.appendChild(el)
  })
}

document.addEventListener('DOMContentLoaded', init)

if (typeof exports !== 'undefined') {
  Object.assign(exports, { DEFAULT_SETTINGS })
}
