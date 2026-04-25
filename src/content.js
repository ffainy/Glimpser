// content.js — Content Script
// Injects a drop zone and creates floating preview windows for dragged links.

const DEFAULT_SETTINGS = {
  dropZonePosition: 'bottom',
  dropZoneCustomSize: { width: 300, height: 150 },
  previewTriggerMode: 'release',
  defaultWindowScale: { width: 75, height: 82 },
  maxPreviewWindows: 1,
  newWindowOffset: 24,
  closePreviewOnOpenNewTab: true,
  showCloseOthersButton: true,
  showCloseAllButton: true,
  blacklistDomains: [],
  language: null,
  theme: null,
  corners: 'rounded',
  cornerRadius: 16,
  debug: false,
}

const DROP_ZONE_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14"/></svg>'

const state = {
  draggedLink: null,
  dragSession: null,
}

const previewManager = {
  previews: new Map(),
  activeId: null,
  nextId: 1,
  nextZIndex: 2147483000,
  layer: null,
}

const MIN_PREVIEW_WIDTH = 360
const MIN_PREVIEW_HEIGHT = 240
const MAX_PREVIEW_WIDTH_RATIO = 0.92
const MAX_PREVIEW_HEIGHT_RATIO = 0.92
const VIEWPORT_MARGIN = 16
const FRAME_DRAG_MESSAGE = 'gs:frame-drag-link'
const FRAME_DRAG_END_MESSAGE = 'gs:frame-drag-end'
const FRAME_FOCUS_MESSAGE = 'gs:frame-focus'
const FRAME_ESCAPE_MESSAGE = 'gs:frame-escape'
const DROP_AREA_SHOW_DELAY_MS = 100
const PREVIEW_RELEASE_ARM_DELAY_MS = 180
const PREVIEW_RELEASE_MIN_DISTANCE_PX = 18
const GOOGLE_FONTS_STYLESHEET = 'https://fonts.googleapis.com/css2?family=Courier+Prime:wght@700&family=Nunito+Sans:wght@400;500;600;700;800&family=Young+Serif&display=swap'

const ICON_REFRESH = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"><path d="M3 12a9 9 0 0 1 16-5.658"/><path d="M19.5 3v4h-4m5.5 5a9 9 0 0 1-16 5.657"/><path d="M4.5 21v-4h4"/></g></svg>`
const ICON_OPEN_CURRENT = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 4H4v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5M9 15L20 4m-5 0h5v5"/></svg>`
const ICON_OPEN_NEW_TAB = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 4.001H5v14a2 2 0 0 0 2 2h8m1-5l3-3m0 0l-3-3m3 3H9"/></svg>`
const ICON_COPY_URL = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2.5"><path stroke-linecap="round" d="M7 21a2 2 0 0 1-2-2V3h9l5 5v11a2 2 0 0 1-2 2z"/><path d="M13 3v6h6"/></g></svg>`
const ICON_COPY_SUCCESS = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2.5"><path stroke-linecap="round" d="M7 21a2 2 0 0 1-2-2V3h9l5 5v11a2 2 0 0 1-2 2z"/><path d="M13 3v6h6"/><path stroke-linecap="round" d="m15 13l-4 4l-2-2"/></g></svg>`
const ICON_CLOSE = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="m7 7l10 10M7 17L17 7"/></svg>`
const ICON_CLOSE_OTHERS = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 6h18m-3-3v18M3 18h18M6 3v18"/></svg>`
const ICON_CLOSE_ALL = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 4v3a2 2 0 0 1-2 2H4m11 11v-3a2 2 0 0 1 2-2h3m0-6h-3a2 2 0 0 1-2-2V4M4 15h3a2 2 0 0 1 2 2v3"/></svg>`
const BRAND_LOGO_PATH = 'icons/logo.svg'

let _shadowHost = null
let _shadowRoot = null
let _previewLayer = null
let _previewBackdrop = null
let _tooltipLayer = null
let _settings = null
let _currentTheme = 'dark'
let _dragHandlers = []
let _activeTooltipTarget = null

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function _isDebugEnabled() {
  return !!(_settings && _settings.debug)
}

function _dlog(...args) {
  if (_isDebugEnabled()) {
    console.log('[Glimpser]', ...args)
  }
}

function validateURL(url) {
  if (url === null || url === undefined || url === '') {
    return false
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return true
  }

  console.warn(t('warnBlockedUrl') + url)
  return false
}

function _normalizeDomainInput(value) {
  const trimmed = String(value || '').trim().toLowerCase().replace(/\.+$/, '')
  if (!trimmed) {
    return ''
  }

  const normalizeHostname = (hostname) => {
    const normalized = String(hostname || '').trim().toLowerCase().replace(/\.+$/, '')
    if (!normalized) {
      return ''
    }

    const labels = normalized.split('.')
    if (labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))) {
      return ''
    }

    return normalized
  }

  if (!trimmed.includes('/') && !trimmed.includes(':')) {
    return normalizeHostname(trimmed)
  }

  const candidates = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
    ? [trimmed]
    : [`https://${trimmed}`]

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
    if (normalized && !unique.includes(normalized)) {
      unique.push(normalized)
    }
  }
  return unique
}

function _getCurrentPageDomain() {
  if (!/^https?:$/i.test(window.location.protocol)) {
    return ''
  }
  return _normalizeDomainInput(window.location.hostname)
}

function _getBlacklistDomains(settings = _settings || DEFAULT_SETTINGS) {
  return _normalizeBlacklistDomains(settings?.blacklistDomains)
}

function _isPreviewBlockedOnThisPage(settings = _settings || DEFAULT_SETTINGS) {
  const currentDomain = _getCurrentPageDomain()
  return !!currentDomain && _getBlacklistDomains(settings).includes(currentDomain)
}

function _resolvePreviewTriggerMode(settings = _settings || DEFAULT_SETTINGS) {
  return settings?.previewTriggerMode === 'drop-area' ? 'drop-area' : 'release'
}

function detectDraggedLink(event) {
  if (!event || !event.target) {
    return null
  }

  let target = event.target
  if (target.nodeType === Node.TEXT_NODE) {
    target = target.parentNode
  }

  if (!target || typeof target.closest !== 'function') {
    return null
  }

  const anchor = target.closest('a')
  if (anchor === null || anchor.href === '') {
    return null
  }

  return anchor.href
}

function _eventDragPoint(event) {
  if (!event) {
    return null
  }

  const screenX = Number(event.screenX)
  const screenY = Number(event.screenY)
  if (Number.isFinite(screenX) && Number.isFinite(screenY) && (screenX !== 0 || screenY !== 0)) {
    return { x: screenX, y: screenY }
  }

  const clientX = Number(event.clientX)
  const clientY = Number(event.clientY)
  if (Number.isFinite(clientX) && Number.isFinite(clientY) && (clientX !== 0 || clientY !== 0)) {
    return { x: clientX, y: clientY }
  }

  return null
}

function _dragDistance(startPoint, endPoint) {
  if (!startPoint || !endPoint) {
    return Infinity
  }
  return Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y)
}

function _startLinkDrag(url, event, source = 'page') {
  _clearLinkDragTimer()
  const point = source === 'frame' ? null : _eventDragPoint(event)
  state.draggedLink = url
  state.dragSession = {
    url,
    source,
    startedAt: performance.now(),
    startPoint: point,
    lastPoint: point,
    armTimer: null,
  }
  return state.dragSession
}

function _clearLinkDragTimer() {
  if (state.dragSession?.armTimer) {
    clearTimeout(state.dragSession.armTimer)
    state.dragSession.armTimer = null
  }
}

function _clearLinkDragState() {
  _clearLinkDragTimer()
  state.draggedLink = null
  state.dragSession = null
  _setDirectReleaseLayerActive(false)
}

function _updateLinkDragPoint(event) {
  const session = state.dragSession
  if (!session || session.source === 'frame') {
    return
  }

  const point = _eventDragPoint(event)
  if (!point) {
    return
  }

  session.lastPoint = point
  if (!session.startPoint) {
    session.startPoint = point
  }
}

function _isLinkReleaseIntentReady() {
  const session = state.dragSession
  if (!session) {
    return false
  }

  const elapsed = performance.now() - session.startedAt
  const distance = _dragDistance(session.startPoint, session.lastPoint)
  return elapsed >= PREVIEW_RELEASE_ARM_DELAY_MS && distance >= PREVIEW_RELEASE_MIN_DISTANCE_PX
}

function _getDroppedUrl(event) {
  return state.draggedLink ||
    event?.dataTransfer?.getData('text/uri-list') ||
    event?.dataTransfer?.getData('URL') ||
    event?.dataTransfer?.getData('text/plain') ||
    ''
}

async function loadSettings() {
  try {
    const nativeAPI = typeof browser !== 'undefined' ? browser : chrome
    const settings = await nativeAPI.storage.sync.get(DEFAULT_SETTINGS)
    settings.blacklistDomains = _normalizeBlacklistDomains(settings.blacklistDomains)
    return settings
  } catch (e) {
    return DEFAULT_SETTINGS
  }
}

function _detectSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function _removeDragHandlers() {
  for (const { target, type, fn, options } of _dragHandlers) {
    target.removeEventListener(type, fn, options)
  }
  _dragHandlers = []
}

function _formatUrlForDisplay(url) {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname === '/' ? '' : parsed.pathname
    return `${parsed.host}${path}${parsed.search}${parsed.hash}`
  } catch (e) {
    return url
  }
}

function _makeIconButton(className, title, icon) {
  const button = document.createElement('button')
  button.className = className
  button.type = 'button'
  button.dataset.tooltip = title
  button.setAttribute('aria-label', title)
  button.innerHTML = icon
  return button
}

function _runtimeUrl(path) {
  const nativeAPI = typeof browser !== 'undefined' ? browser : chrome
  return nativeAPI.runtime.getURL(path)
}

function _isCloseOthersButtonEnabled() {
  return _settings?.showCloseOthersButton !== false
}

function _isCloseAllButtonEnabled() {
  return _settings?.showCloseAllButton !== false
}

function ensurePreviewLayer() {
  if (_previewLayer) {
    return _previewLayer
  }

  _previewLayer = document.createElement('div')
  _previewLayer.id = 'gs-preview-layer'
  _previewLayer.setAttribute('data-dp-theme', _currentTheme)
  _shadowRoot.appendChild(_previewLayer)
  previewManager.layer = _previewLayer
  return _previewLayer
}

function ensurePreviewBackdrop() {
  if (_previewBackdrop) {
    _previewBackdrop.setAttribute('data-dp-theme', _currentTheme)
    return _previewBackdrop
  }

  _previewBackdrop = document.createElement('div')
  _previewBackdrop.className = 'gs-preview-backdrop'
  _previewBackdrop.setAttribute('aria-hidden', 'true')
  _previewBackdrop.setAttribute('data-dp-theme', _currentTheme)
  _previewBackdrop.addEventListener('pointerdown', (event) => {
    event.stopPropagation()
  })
  _previewBackdrop.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    const preview = getActivePreview() || _getTopmostPreview()
    if (preview) {
      closePreview(preview.id)
    }
  })

  ensurePreviewLayer().prepend(_previewBackdrop)
  return _previewBackdrop
}

function _resolvePreviewWindowLimit(settings = _settings) {
  const configured = settings && Number.isFinite(settings.maxPreviewWindows)
    ? settings.maxPreviewWindows
    : DEFAULT_SETTINGS.maxPreviewWindows
  return clamp(configured, 1, 12)
}

function _isSinglePreviewWindowMode() {
  return _resolvePreviewWindowLimit() === 1
}

function _syncPreviewBackdrop() {
  if (!_shadowRoot) {
    return
  }

  const shouldShow = _isSinglePreviewWindowMode() && previewManager.previews.size > 0
  const backdrop = shouldShow ? ensurePreviewBackdrop() : _previewBackdrop
  if (!backdrop) {
    return
  }

  backdrop.classList.toggle('active', shouldShow)
  backdrop.setAttribute('aria-hidden', shouldShow ? 'false' : 'true')
  backdrop.setAttribute('data-dp-theme', _currentTheme)
}

function ensureTooltipLayer() {
  if (_tooltipLayer) {
    return _tooltipLayer
  }

  _tooltipLayer = document.createElement('div')
  _tooltipLayer.className = 'gs-tooltip'
  _tooltipLayer.setAttribute('data-dp-theme', _currentTheme)
  _shadowRoot.appendChild(_tooltipLayer)
  return _tooltipLayer
}

function _showTooltip(target, text) {
  if (!target || !text || !_shadowRoot) {
    return
  }

  const tooltip = ensureTooltipLayer()
  const rect = target.getBoundingClientRect()

  _activeTooltipTarget = target
  tooltip.textContent = text
  tooltip.classList.add('visible')
  tooltip.setAttribute('data-dp-theme', _currentTheme)

  const tooltipRect = tooltip.getBoundingClientRect()
  const spacing = 10
  const viewport = _viewportRect()
  let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2)
  left = clamp(left, 12, Math.max(12, viewport.width - tooltipRect.width - 12))

  let top = rect.top - tooltipRect.height - spacing
  let placeBelow = false

  if (top < 12) {
    top = rect.bottom + spacing
    placeBelow = true
  }

  tooltip.classList.toggle('below', placeBelow)
  tooltip.style.left = `${Math.round(left)}px`
  tooltip.style.top = `${Math.round(top)}px`
}

function _hideTooltip(target = null) {
  if (!_tooltipLayer) {
    return
  }

  if (target && _activeTooltipTarget && target !== _activeTooltipTarget) {
    return
  }

  _activeTooltipTarget = null
  _tooltipLayer.classList.remove('visible', 'below')
}

function _bindTooltipEvents(preview, ...buttons) {
  for (const button of buttons) {
    button.addEventListener('pointerenter', () => {
      _showTooltip(button, button.dataset.tooltip || button.getAttribute('aria-label') || '')
    })

    button.addEventListener('pointerleave', () => {
      _hideTooltip(button)
    })

    button.addEventListener('focus', () => {
      _showTooltip(button, button.dataset.tooltip || button.getAttribute('aria-label') || '')
    })

    button.addEventListener('blur', () => {
      _hideTooltip(button)
    })
  }
}

function _showCopyToast(preview, text) {
  const toast = preview.elements.copyToast
  if (!toast) {
    return
  }

  if (preview.copyToastTimer) {
    clearTimeout(preview.copyToastTimer)
  }

  toast.textContent = text
  toast.classList.add('visible')

  preview.copyToastTimer = setTimeout(() => {
    toast.classList.remove('visible')
    preview.copyToastTimer = null
  }, 1200)
}

function _applyPreviewLayout(preview) {
  const { root } = preview.elements
  root.style.left = `${preview.x}px`
  root.style.top = `${preview.y}px`
  root.style.width = `${preview.width}px`
  root.style.height = `${preview.height}px`
  root.style.zIndex = String(preview.zIndex)
}

function _applyPreviewTheme(preview) {
  preview.elements.root.setAttribute('data-dp-theme', _currentTheme)
  if (_tooltipLayer) {
    _tooltipLayer.setAttribute('data-dp-theme', _currentTheme)
  }
}

function _viewportRect() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  }
}

async function _loadCssText(nativeAPI, paths) {
  await Promise.all(
    paths.map((path) => new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = nativeAPI.runtime.getURL(path)
      link.addEventListener('load', resolve, { once: true })
      link.addEventListener('error', () => reject(new Error(`Failed to load stylesheet: ${path}`)), { once: true })
      _shadowRoot.appendChild(link)
    }))
  )
}

async function _ensureDocumentStylesheet(href) {
  const existing = document.head.querySelector(`link[rel="stylesheet"][href="${href}"]`)
  if (existing) {
    return
  }

  await new Promise((resolve, reject) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.addEventListener('load', resolve, { once: true })
    link.addEventListener('error', () => reject(new Error(`Failed to load stylesheet: ${href}`)), { once: true })
    document.head.appendChild(link)
  })
}

function _normalizePreviewBounds(preview) {
  const viewport = _viewportRect()
  const maxWidth = Math.max(MIN_PREVIEW_WIDTH, Math.floor(viewport.width * MAX_PREVIEW_WIDTH_RATIO))
  const maxHeight = Math.max(MIN_PREVIEW_HEIGHT, Math.floor(viewport.height * MAX_PREVIEW_HEIGHT_RATIO))

  preview.width = clamp(preview.width, MIN_PREVIEW_WIDTH, Math.min(maxWidth, viewport.width - VIEWPORT_MARGIN * 2))
  preview.height = clamp(preview.height, MIN_PREVIEW_HEIGHT, Math.min(maxHeight, viewport.height - VIEWPORT_MARGIN * 2))
  preview.x = clamp(preview.x, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, viewport.width - preview.width - VIEWPORT_MARGIN))
  preview.y = clamp(preview.y, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, viewport.height - preview.height - VIEWPORT_MARGIN))
}

function _refreshPreviewViewportBounds() {
  for (const preview of previewManager.previews.values()) {
    _normalizePreviewBounds(preview)
    _applyPreviewLayout(preview)
  }
}

function _resolvePreviewSize(settings) {
  const viewport = _viewportRect()
  const configured = settings && settings.defaultWindowScale
  const widthPercent = clamp(
    typeof configured?.width === 'number' ? configured.width : DEFAULT_SETTINGS.defaultWindowScale.width,
    35,
    92
  )
  const heightPercent = clamp(
    typeof configured?.height === 'number' ? configured.height : DEFAULT_SETTINGS.defaultWindowScale.height,
    35,
    92
  )

  return {
    width: Math.round((viewport.width * widthPercent) / 100),
    height: Math.round((viewport.height * heightPercent) / 100),
  }
}

function _resolvePreviewPosition(width, height) {
  const active = getActivePreview()
  const viewport = _viewportRect()
  const configuredOffset = _settings && typeof _settings.newWindowOffset === 'number'
    ? _settings.newWindowOffset
    : DEFAULT_SETTINGS.newWindowOffset
  const offset = clamp(configuredOffset, 0, 64)

  if (!active) {
    return {
      x: Math.round((viewport.width - width) / 2),
      y: Math.round((viewport.height - height) / 2),
    }
  }

  return {
    x: clamp(active.x + offset, VIEWPORT_MARGIN, viewport.width - width - VIEWPORT_MARGIN),
    y: clamp(active.y + offset, VIEWPORT_MARGIN, viewport.height - height - VIEWPORT_MARGIN),
  }
}

function _createLoadingSpinner() {
  const spinner = document.createElement('div')
  spinner.className = 'gs-preview-spinner'
  spinner.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><g><circle cx="12" cy="3" r="1" fill="#36aa6d"><animate id="SVGelgoqhuA" attributeName="r" begin="0;SVGSRzJybSJ.end-0.5s" calcMode="spline" dur="0.6s" keySplines=".27,.42,.37,.99;.53,0,.61,.73" values="1;2;1"/></circle><circle cx="16.5" cy="4.21" r="1" fill="#36aa6d"><animate id="SVGBcQu6cCi" attributeName="r" begin="SVGelgoqhuA.begin+0.1s" calcMode="spline" dur="0.6s" keySplines=".27,.42,.37,.99;.53,0,.61,.73" values="1;2;1"/></circle><circle cx="7.5" cy="4.21" r="1" fill="#36aa6d"><animate id="SVGSRzJybSJ" attributeName="r" begin="SVGeZGzNdVZ.begin+0.1s" calcMode="spline" dur="0.6s" keySplines=".27,.42,.37,.99;.53,0,.61,.73" values="1;2;1"/></circle><circle cx="19.79" cy="7.5" r="1" fill="#36aa6d"><animate id="SVGG5Q0fe0M" attributeName="r" begin="SVGBcQu6cCi.begin+0.1s" calcMode="spline" dur="0.6s" keySplines=".27,.42,.37,.99;.53,0,.61,.73" values="1;2;1"/></circle><circle cx="4.21" cy="7.5" r="1" fill="#36aa6d"><animate id="SVGeZGzNdVZ" attributeName="r" begin="SVGUTnihcal.begin+0.1s" calcMode="spline" dur="0.6s" keySplines=".27,.42,.37,.99;.53,0,.61,.73" values="1;2;1"/></circle><circle cx="21" cy="12" r="1" fill="#36aa6d"><animate id="SVG8aQG8dpc" attributeName="r" begin="SVGG5Q0fe0M.begin+0.1s" calcMode="spline" dur="0.6s" keySplines=".27,.42,.37,.99;.53,0,.61,.73" values="1;2;1"/></circle><circle cx="3" cy="12" r="1" fill="#36aa6d"><animate id="SVGUTnihcal" attributeName="r" begin="SVGHktsvT5Q.begin+0.1s" calcMode="spline" dur="0.6s" keySplines=".27,.42,.37,.99;.53,0,.61,.73" values="1;2;1"/></circle><circle cx="19.79" cy="16.5" r="1" fill="#36aa6d"><animate id="SVGqCF3Scrd" attributeName="r" begin="SVG8aQG8dpc.begin+0.1s" calcMode="spline" dur="0.6s" keySplines=".27,.42,.37,.99;.53,0,.61,.73" values="1;2;1"/></circle><circle cx="4.21" cy="16.5" r="1" fill="#36aa6d"><animate id="SVGHktsvT5Q" attributeName="r" begin="SVGSFNCBbxb.begin+0.1s" calcMode="spline" dur="0.6s" keySplines=".27,.42,.37,.99;.53,0,.61,.73" values="1;2;1"/></circle><circle cx="16.5" cy="19.79" r="1" fill="#36aa6d"><animate id="SVGMFYo1cJN" attributeName="r" begin="SVGqCF3Scrd.begin+0.1s" calcMode="spline" dur="0.6s" keySplines=".27,.42,.37,.99;.53,0,.61,.73" values="1;2;1"/></circle><circle cx="7.5" cy="19.79" r="1" fill="#36aa6d"><animate id="SVGSFNCBbxb" attributeName="r" begin="SVGLSoLpdOI.begin+0.1s" calcMode="spline" dur="0.6s" keySplines=".27,.42,.37,.99;.53,0,.61,.73" values="1;2;1"/></circle><circle cx="12" cy="21" r="1" fill="#36aa6d"><animate id="SVGLSoLpdOI" attributeName="r" begin="SVGMFYo1cJN.begin+0.1s" calcMode="spline" dur="0.6s" keySplines=".27,.42,.37,.99;.53,0,.61,.73" values="1;2;1"/></circle><animateTransform attributeName="transform" dur="6s" repeatCount="indefinite" type="rotate" values="360 12 12;0 12 12"/></g></svg>`
  return spinner
}

function _createPreviewWindow(url, settings) {
  const id = previewManager.nextId++
  const size = _resolvePreviewSize(settings)
  const position = _resolvePreviewPosition(size.width, size.height)

  const root = document.createElement('div')
  root.className = 'gs-preview-window'
  root.dataset.id = String(id)

  const header = document.createElement('div')
  header.className = 'gs-preview-header'

  const leftActions = document.createElement('div')
  leftActions.className = 'gs-preview-group'

  const brandIcon = document.createElement('div')
  brandIcon.className = 'gs-preview-brand'
  brandIcon.dataset.tooltip = 'Glimpser'
  brandIcon.setAttribute('aria-label', 'Glimpser')

  const brandLogo = document.createElement('img')
  brandLogo.className = 'gs-preview-brand-logo'
  brandLogo.src = _runtimeUrl(BRAND_LOGO_PATH)
  brandLogo.alt = ''
  brandLogo.draggable = false
  brandLogo.setAttribute('aria-hidden', 'true')
  brandIcon.appendChild(brandLogo)

  const refreshButton = _makeIconButton('gs-pill-action', t('btnRefresh'), ICON_REFRESH)
  refreshButton.dataset.action = 'refresh'
  leftActions.append(brandIcon)

  const urlPill = document.createElement('div')
  urlPill.className = 'gs-preview-urlbar'

  const urlText = document.createElement('span')
  urlText.className = 'gs-preview-urltext'
  urlText.textContent = _formatUrlForDisplay(url)
  urlText.title = url

  const copyButton = _makeIconButton('gs-pill-action', t('btnCopyUrl'), ICON_COPY_URL)
  copyButton.dataset.action = 'copy-url'

  urlPill.append(refreshButton, urlText, copyButton)

  const rightActions = document.createElement('div')
  rightActions.className = 'gs-preview-group gs-preview-toolbar'

  const openActions = document.createElement('div')
  openActions.className = 'gs-preview-group'

  const closeActions = document.createElement('div')
  closeActions.className = 'gs-preview-group gs-preview-group--danger'

  const openCurrentButton = _makeIconButton('gs-preview-action', t('btnOpenCurrent'), ICON_OPEN_CURRENT)
  openCurrentButton.dataset.action = 'open-current'

  const openNewTabButton = _makeIconButton('gs-preview-action', t('btnOpenNewTab'), ICON_OPEN_NEW_TAB)
  openNewTabButton.dataset.action = 'open-new-tab'

  const closeOthersButton = _makeIconButton('gs-preview-action gs-preview-action-bulk-close', t('btnCloseOthers'), ICON_CLOSE_OTHERS)
  closeOthersButton.dataset.action = 'close-others'

  const closeAllButton = _makeIconButton('gs-preview-action gs-preview-action-bulk-close', t('btnCloseAll'), ICON_CLOSE_ALL)
  closeAllButton.dataset.action = 'close-all'

  const closeButton = _makeIconButton('gs-preview-action gs-preview-action-close', t('btnClose'), ICON_CLOSE)
  closeButton.dataset.action = 'close'

  openActions.append(openCurrentButton, openNewTabButton)
  closeActions.append(closeOthersButton, closeAllButton, closeButton)
  rightActions.append(openActions, closeActions)
  header.append(leftActions, urlPill, rightActions)

  const body = document.createElement('div')
  body.className = 'gs-preview-body'

  const iframe = document.createElement('iframe')
  iframe.src = 'about:blank'
  iframe.setAttribute('allowfullscreen', '')
  iframe.className = 'gs-preview-frame'

  const spinner = _createLoadingSpinner()

  const error = document.createElement('div')
  error.className = 'gs-preview-error'
  error.style.display = 'none'

  const copyToast = document.createElement('div')
  copyToast.className = 'gs-toast'

  const resizeDirections = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']
  const resizeHandles = resizeDirections.map((direction) => {
    const handle = document.createElement('div')
    handle.className = `gs-preview-resize-handle gs-preview-resize-${direction}`
    handle.dataset.direction = direction
    return handle
  })

  body.append(iframe, spinner, error, copyToast)
  root.append(header, body, ...resizeHandles)

  const preview = {
    id,
    currentUrl: url,
    x: position.x,
    y: position.y,
    width: size.width,
    height: size.height,
    zIndex: previewManager.nextZIndex++,
    isLoading: true,
    hasError: false,
    elements: {
      root,
      header,
      refreshButton,
      urlText,
      copyButton,
      copyToast,
      openCurrentButton,
      openNewTabButton,
      closeOthersButton,
      closeAllButton,
      closeButton,
      iframe,
      spinner,
      error,
      resizeHandles,
    },
  }

  _applyPreviewTheme(preview)
  _syncPreviewActionVisibility(preview)
  _applyPreviewLayout(preview)
  _bindPreviewEvents(preview)
  _bindTooltipEvents(
    preview,
    brandIcon,
    refreshButton,
    copyButton,
    openCurrentButton,
    openNewTabButton,
    closeOthersButton,
    closeAllButton,
    closeButton
  )

  return preview
}

function _bindPreviewEvents(preview) {
  const { root, header, iframe, refreshButton, resizeHandles } = preview.elements

  root.addEventListener('pointerdown', () => {
    focusPreview(preview.id)
  })

  header.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) {
      return
    }

    event.preventDefault()
    focusPreview(preview.id)
    _startPreviewDrag(preview, event, header)
  })

  header.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]')
    if (!button) {
      return
    }
    handlePreviewAction(preview.id, button.dataset.action, button)
  })

  for (const handle of resizeHandles) {
    handle.addEventListener('pointerdown', (event) => {
      event.preventDefault()
      event.stopPropagation()
      focusPreview(preview.id)
      _startPreviewResize(preview, event, handle.dataset.direction, handle)
    })
  }

  iframe.addEventListener('load', () => {
    if (iframe.src === 'about:blank') {
      return
    }
    _setPreviewLoading(preview, false)
    _setPreviewError(preview)
    iframe.classList.add('loaded')
    _dlog('preview loaded', preview.currentUrl)
  })

  iframe.addEventListener('error', () => {
    _setPreviewLoading(preview, false)
    _setPreviewError(preview, t('errorLoadFailed'))
  })

  refreshButton.addEventListener('animationend', () => {
    refreshButton.classList.remove('is-loading')
  })
}

function _updatePreviewLabels() {
  for (const preview of previewManager.previews.values()) {
    const {
      brandIcon,
      refreshButton,
      copyButton,
      urlText,
      openCurrentButton,
      openNewTabButton,
      closeOthersButton,
      closeAllButton,
      closeButton,
    } = preview.elements
    brandIcon.dataset.tooltip = 'Glimpser'
    brandIcon.setAttribute('aria-label', 'Glimpser')
    refreshButton.dataset.tooltip = t('btnRefresh')
    refreshButton.setAttribute('aria-label', t('btnRefresh'))
    copyButton.dataset.tooltip = t('btnCopyUrl')
    copyButton.setAttribute('aria-label', t('btnCopyUrl'))
    openCurrentButton.dataset.tooltip = t('btnOpenCurrent')
    openCurrentButton.setAttribute('aria-label', t('btnOpenCurrent'))
    openNewTabButton.dataset.tooltip = t('btnOpenNewTab')
    openNewTabButton.setAttribute('aria-label', t('btnOpenNewTab'))
    closeOthersButton.dataset.tooltip = t('btnCloseOthers')
    closeOthersButton.setAttribute('aria-label', t('btnCloseOthers'))
    closeAllButton.dataset.tooltip = t('btnCloseAll')
    closeAllButton.setAttribute('aria-label', t('btnCloseAll'))
    closeButton.dataset.tooltip = t('btnClose')
    closeButton.setAttribute('aria-label', t('btnClose'))

    urlText.title = preview.currentUrl
  }
}

function _syncPreviewActionVisibility(preview) {
  const { closeOthersButton, closeAllButton } = preview.elements
  const previewCount = previewManager.previews.size

  closeOthersButton.hidden = !_isCloseOthersButtonEnabled()
  closeOthersButton.disabled = closeOthersButton.hidden || previewCount <= 1

  closeAllButton.hidden = !_isCloseAllButtonEnabled()
  closeAllButton.disabled = closeAllButton.hidden || previewCount <= 0
}

function _syncAllPreviewActionVisibility() {
  for (const preview of previewManager.previews.values()) {
    _syncPreviewActionVisibility(preview)
  }
}

function _startPreviewDrag(preview, event) {
  const startX = event.clientX
  const startY = event.clientY
  const initialX = preview.x
  const initialY = preview.y
  const viewport = _viewportRect()
  const interaction = _beginPreviewInteraction(preview, event.currentTarget || event.target, event.pointerId, 'dragging')

  const onMove = (moveEvent) => {
    preview.x = clamp(initialX + (moveEvent.clientX - startX), VIEWPORT_MARGIN, viewport.width - preview.width - VIEWPORT_MARGIN)
    preview.y = clamp(initialY + (moveEvent.clientY - startY), VIEWPORT_MARGIN, viewport.height - preview.height - VIEWPORT_MARGIN)
    _applyPreviewLayout(preview)
  }

  const onUp = () => interaction.cleanup()

  interaction.bind(onMove, onUp)
}

function _startPreviewResize(preview, event, direction, handle) {
  const startX = event.clientX
  const startY = event.clientY
  const initialX = preview.x
  const initialY = preview.y
  const initialWidth = preview.width
  const initialHeight = preview.height
  const interaction = _beginPreviewInteraction(preview, handle || event.currentTarget || event.target, event.pointerId, 'resizing')

  const onMove = (moveEvent) => {
    const viewport = _viewportRect()
    const deltaX = moveEvent.clientX - startX
    const deltaY = moveEvent.clientY - startY

    let nextX = initialX
    let nextY = initialY
    let nextWidth = initialWidth
    let nextHeight = initialHeight

    if (direction.includes('e')) {
      nextWidth = initialWidth + deltaX
    }

    if (direction.includes('s')) {
      nextHeight = initialHeight + deltaY
    }

    if (direction.includes('w')) {
      nextX = clamp(initialX + deltaX, VIEWPORT_MARGIN, initialX + initialWidth - MIN_PREVIEW_WIDTH)
      nextWidth = initialWidth - (nextX - initialX)
    }

    if (direction.includes('n')) {
      nextY = clamp(initialY + deltaY, VIEWPORT_MARGIN, initialY + initialHeight - MIN_PREVIEW_HEIGHT)
      nextHeight = initialHeight - (nextY - initialY)
    }

    nextWidth = clamp(nextWidth, MIN_PREVIEW_WIDTH, viewport.width - nextX - VIEWPORT_MARGIN)
    nextHeight = clamp(nextHeight, MIN_PREVIEW_HEIGHT, viewport.height - nextY - VIEWPORT_MARGIN)

    preview.x = nextX
    preview.y = nextY
    preview.width = nextWidth
    preview.height = nextHeight
    _normalizePreviewBounds(preview)
    _applyPreviewLayout(preview)
  }

  const onUp = () => interaction.cleanup()

  interaction.bind(onMove, onUp)
}

function _beginPreviewInteraction(preview, target, pointerId, mode) {
  const { root, iframe } = preview.elements
  let moveHandler = null
  let upHandler = null

  root.classList.add('is-interacting', `is-${mode}`)
  iframe.style.pointerEvents = 'none'
  document.body.style.cursor = mode === 'resizing' ? getComputedStyle(target).cursor || 'default' : 'grabbing'

  if (target && typeof target.setPointerCapture === 'function' && pointerId !== undefined) {
    try {
      target.setPointerCapture(pointerId)
    } catch {}
  }

  return {
    bind(onMove, onUp) {
      moveHandler = onMove
      upHandler = onUp
      window.addEventListener('pointermove', moveHandler, true)
      window.addEventListener('pointerup', upHandler, true)
      window.addEventListener('pointercancel', upHandler, true)
      window.addEventListener('blur', upHandler, true)
    },
    cleanup() {
      root.classList.remove('is-interacting', `is-${mode}`)
      iframe.style.pointerEvents = ''
      document.body.style.cursor = ''
      if (moveHandler) {
        window.removeEventListener('pointermove', moveHandler, true)
      }
      if (upHandler) {
        window.removeEventListener('pointerup', upHandler, true)
        window.removeEventListener('pointercancel', upHandler, true)
        window.removeEventListener('blur', upHandler, true)
      }
      if (target && typeof target.releasePointerCapture === 'function' && pointerId !== undefined) {
        try {
          target.releasePointerCapture(pointerId)
        } catch {}
      }
    }
  }
}

function _setPreviewLoading(preview, isLoading) {
  preview.isLoading = isLoading
  preview.elements.root.classList.toggle('is-loading', isLoading)
  preview.elements.spinner.style.display = isLoading ? '' : 'none'
  preview.elements.refreshButton.classList.toggle('is-loading', isLoading)
  preview.elements.refreshButton.disabled = isLoading
  preview.elements.refreshButton.setAttribute('aria-busy', isLoading ? 'true' : 'false')
}

function _setPreviewError(preview, message = '') {
  const hasError = !!message
  preview.hasError = hasError
  preview.elements.root.classList.toggle('has-error', hasError)
  preview.elements.error.style.display = hasError ? '' : 'none'
  preview.elements.error.textContent = hasError ? message : ''
}

function _loadPreviewUrl(preview, url) {
  preview.currentUrl = url
  preview.elements.urlText.textContent = _formatUrlForDisplay(url)
  preview.elements.urlText.title = url
  _setPreviewError(preview)
  preview.elements.iframe.classList.remove('loaded')
  _setPreviewLoading(preview, true)
  preview.elements.iframe.src = 'about:blank'
  requestAnimationFrame(() => {
    preview.elements.iframe.src = url
  })
}

function getActivePreview() {
  return previewManager.activeId ? previewManager.previews.get(previewManager.activeId) || null : null
}

function focusPreview(id) {
  const target = previewManager.previews.get(id)
  if (!target) {
    return
  }

  previewManager.activeId = id
  target.zIndex = previewManager.nextZIndex++

  for (const preview of previewManager.previews.values()) {
    preview.elements.root.classList.toggle('active', preview.id === id)
    if (preview.id === id) {
      preview.elements.root.style.zIndex = String(target.zIndex)
    }
  }

  _applyPreviewLayout(target)
}

function _getTopmostPreview() {
  let candidate = null
  for (const preview of previewManager.previews.values()) {
    if (!candidate || preview.zIndex > candidate.zIndex) {
      candidate = preview
    }
  }
  return candidate
}

function _getOldestPreview(preferNonActive = true) {
  let candidate = null
  for (const preview of previewManager.previews.values()) {
    if (preferNonActive && preview.id === previewManager.activeId) {
      continue
    }
    if (!candidate || preview.id < candidate.id) {
      candidate = preview
    }
  }

  if (candidate || !preferNonActive) {
    return candidate
  }

  return _getOldestPreview(false)
}

function _enforcePreviewWindowLimit({ reserveSlot = false } = {}) {
  const limit = _resolvePreviewWindowLimit()
  const targetCount = reserveSlot ? Math.max(0, limit - 1) : limit

  while (previewManager.previews.size > targetCount) {
    const oldest = _getOldestPreview(true)
    if (!oldest) {
      break
    }
    closePreview(oldest.id)
  }

  _syncPreviewBackdrop()
}

function closePreview(id) {
  const preview = previewManager.previews.get(id)
  if (!preview) {
    return
  }

  preview.elements.root.remove()
  previewManager.previews.delete(id)
  _hideTooltip()

  if (previewManager.activeId === id) {
    const next = _getTopmostPreview()
    previewManager.activeId = next ? next.id : null
    if (next) {
      focusPreview(next.id)
    }
  }

  _syncAllPreviewActionVisibility()
  _syncPreviewBackdrop()
}

function closeAllPreviews(exceptId = null) {
  const ids = Array.from(previewManager.previews.keys()).filter((id) => id !== exceptId)
  for (const id of ids) {
    closePreview(id)
  }

  if (exceptId !== null && previewManager.previews.has(exceptId)) {
    focusPreview(exceptId)
  }
}

function openPreview(url) {
  if (_isPreviewBlockedOnThisPage()) {
    return null
  }

  if (!validateURL(url)) {
    console.warn(t('warnInvalidUrl'))
    return null
  }

  _enforcePreviewWindowLimit({ reserveSlot: true })
  const preview = _createPreviewWindow(url, _settings || DEFAULT_SETTINGS)
  _normalizePreviewBounds(preview)
  ensurePreviewLayer().appendChild(preview.elements.root)
  previewManager.previews.set(preview.id, preview)
  focusPreview(preview.id)
  _syncAllPreviewActionVisibility()
  _syncPreviewBackdrop()
  _loadPreviewUrl(preview, url)
  return preview
}

function reloadPreview(id) {
  const preview = previewManager.previews.get(id)
  if (!preview) {
    return
  }
  focusPreview(id)

  _setPreviewError(preview)
  preview.elements.iframe.classList.remove('loaded')
  _setPreviewLoading(preview, true)

  try {
    if (preview.elements.iframe.contentWindow) {
      preview.elements.iframe.contentWindow.location.reload()
      return
    }
  } catch (e) {
    _dlog('reload fallback', e)
  }

  const url = preview.currentUrl
  preview.elements.iframe.src = 'about:blank'
  window.setTimeout(() => {
    preview.elements.iframe.src = url
  }, 30)
}

function handlePreviewAction(id, action, buttonEl) {
  const preview = previewManager.previews.get(id)
  if (!preview) {
    return
  }

  switch (action) {
    case 'refresh':
      reloadPreview(id)
      break

    case 'close':
      closePreview(id)
      break

    case 'close-others':
      closeAllPreviews(id)
      break

    case 'close-all':
      closeAllPreviews()
      break

    case 'open-current':
      closePreview(id)
      location.href = preview.currentUrl
      break

    case 'open-new-tab':
      window.open(preview.currentUrl, '_blank')
      if (_settings?.closePreviewOnOpenNewTab !== false) {
        closePreview(id)
      }
      break

    case 'copy-url':
      navigator.clipboard.writeText(preview.currentUrl).then(() => {
        if (!buttonEl) {
          return
        }
        buttonEl.innerHTML = ICON_COPY_SUCCESS
        _hideTooltip()
        _showCopyToast(preview, t('toastCopySuccess'))
        setTimeout(() => {
          buttonEl.innerHTML = ICON_COPY_URL
        }, 1200)
      }).catch((err) => {
        console.error(t('errorClipboard'), err)
      })
      break
  }
}

function applyContentTheme(theme) {
  const resolvedTheme = theme === 'light' ? 'light' : 'dark'
  _currentTheme = resolvedTheme

  if (_shadowHost) {
    _shadowHost.setAttribute('data-dp-theme', resolvedTheme)
  }

  if (_previewLayer) {
    _previewLayer.setAttribute('data-dp-theme', resolvedTheme)
  }

  if (_previewBackdrop) {
    _previewBackdrop.setAttribute('data-dp-theme', resolvedTheme)
  }

  const directReleaseLayer = _shadowRoot ? _shadowRoot.getElementById('gs-direct-release-layer') : null
  if (directReleaseLayer) {
    directReleaseLayer.setAttribute('data-dp-theme', resolvedTheme)
  }

  const zone = _shadowRoot ? _shadowRoot.getElementById('gs-dropzone') : null
  if (zone) {
    zone.setAttribute('data-dp-theme', resolvedTheme)
  }

  const fullscreen = _shadowRoot ? _shadowRoot.getElementById('gs-dropzone-overlay') : null
  if (fullscreen) {
    fullscreen.setAttribute('data-dp-theme', resolvedTheme)
  }

  for (const preview of previewManager.previews.values()) {
    _applyPreviewTheme(preview)
  }
}

function applyContentCorners(corners) {
  if (_shadowHost) {
    const configuredRadius = typeof _settings?.cornerRadius === 'number' ? _settings.cornerRadius : DEFAULT_SETTINGS.cornerRadius
    const radius = corners === 'square' ? 0 : clamp(configuredRadius, 4, 28)
    _shadowHost.style.setProperty('--gs-window-radius', `${radius}px`)
  }
}

function _buildDropHintInner({ iconClass, title, copyClass = '', kicker = '' }) {
  const kickerMarkup = kicker ? `<div class="gs-drop-kicker">${kicker}</div>` : ''
  const copyClasses = ['gs-drop-copy', copyClass].filter(Boolean).join(' ')

  return `
    <div class="gs-drop-icon-shell ${iconClass}">
      ${DROP_ZONE_ICON_SVG}
    </div>
    <div class="${copyClasses}">
      ${kickerMarkup}
      <div class="gs-drop-title">${title}</div>
    </div>
  `
}

function _createDropZoneElement(position, customSize) {
  const width = clamp((customSize && customSize.width) || 300, 100, 1200)
  const height = clamp((customSize && customSize.height) || 150, 60, 400)

  const zone = document.createElement('div')
  zone.id = 'gs-dropzone'
  zone.dataset.position = position
  zone.setAttribute('data-dp-theme', _currentTheme)
  zone.style.width = `${width}px`
  zone.style.height = `${height}px`
  zone.innerHTML = `
    <div class="gs-drop-surface gs-drop-surface--slot">
      <div class="gs-drop-slot-pill">
        ${_buildDropHintInner({
          iconClass: 'gs-drop-icon-shell--slot',
          title: t('dropHintZone'),
        })}
      </div>
    </div>
  `
  return zone
}

function _setFullscreenOverlayActive(isActive) {
  const overlay = _shadowRoot ? _shadowRoot.getElementById('gs-dropzone-overlay') : null
  if (overlay) {
    overlay.classList.toggle('active', isActive)
    overlay.setAttribute('data-dp-theme', _currentTheme)
  }

  document.body.classList.toggle('gs-dropzone-fullscreen-active', isActive)

  if (!isActive) {
    _clearLinkDragState()
  }
}

function _ensureDirectReleaseLayer() {
  let layer = _shadowRoot.getElementById('gs-direct-release-layer')
  if (layer) {
    layer.setAttribute('data-dp-theme', _currentTheme)
    return layer
  }

  layer = document.createElement('div')
  layer.id = 'gs-direct-release-layer'
  layer.setAttribute('data-dp-theme', _currentTheme)
  _shadowRoot.appendChild(layer)
  return layer
}

function _setDirectReleaseLayerActive(isActive) {
  const layer = _shadowRoot ? _shadowRoot.getElementById('gs-direct-release-layer') : null
  if (!layer) {
    return
  }

  layer.classList.toggle('active', isActive)
  layer.setAttribute('data-dp-theme', _currentTheme)
}

function _maybeActivateDirectReleaseLayer(event) {
  if (_isPreviewBlockedOnThisPage() || _resolvePreviewTriggerMode() !== 'release' || !state.draggedLink) {
    return false
  }

  _updateLinkDragPoint(event)
  const isReady = _isLinkReleaseIntentReady()
  if (isReady) {
    _setDirectReleaseLayerActive(true)
  }
  return isReady
}

function _scheduleDirectReleaseLayerActivation() {
  const session = state.dragSession
  if (!session) {
    return
  }

  _clearLinkDragTimer()
  session.armTimer = setTimeout(() => {
    _maybeActivateDirectReleaseLayer()
  }, PREVIEW_RELEASE_ARM_DELAY_MS)
}

function _handleDirectReleaseDrop(event) {
  if (!state.draggedLink) {
    return
  }

  event.preventDefault()
  event.stopPropagation()

  const url = _getDroppedUrl(event)
  const isReady = _isLinkReleaseIntentReady()
  _clearLinkDragState()

  if (!isReady) {
    _dlog('preview release ignored before drag intent threshold')
    return
  }

  if (validateURL(url)) {
    openPreview(url)
  } else {
    console.warn(t('warnInvalidUrl'))
  }
}

function _bindDropZoneEvents(dropZone) {
  const onDragStart = (event) => {
    if (_isPreviewBlockedOnThisPage()) {
      return
    }
    const url = detectDraggedLink(event)
    if (!url) {
      return
    }
    _startLinkDrag(url, event)
    setTimeout(() => {
      dropZone.classList.add('active')
    }, DROP_AREA_SHOW_DELAY_MS)
  }

  const onDragEnd = () => {
    setTimeout(() => {
      dropZone.classList.remove('active', 'hovered')
      _clearLinkDragState()
    }, DROP_AREA_SHOW_DELAY_MS)
  }

  document.addEventListener('dragstart', onDragStart)
  document.addEventListener('dragend', onDragEnd)
  _dragHandlers.push(
    { target: document, type: 'dragstart', fn: onDragStart },
    { target: document, type: 'dragend', fn: onDragEnd }
  )

  dropZone.addEventListener('dragenter', (event) => {
    event.preventDefault()
    dropZone.classList.add('hovered')
  })

  dropZone.addEventListener('dragleave', (event) => {
    if (event.relatedTarget && !dropZone.contains(event.relatedTarget)) {
      dropZone.classList.remove('hovered')
    }
  })

  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'copy'
  })

  dropZone.addEventListener('drop', (event) => {
    if (_isPreviewBlockedOnThisPage()) {
      _clearLinkDragState()
      return
    }
    event.preventDefault()
    event.stopPropagation()
    dropZone.classList.remove('active', 'hovered')

    const url = _getDroppedUrl(event)
    _clearLinkDragState()
    if (validateURL(url)) {
      openPreview(url)
    } else {
      console.warn(t('warnInvalidUrl'))
    }
  })
}

function _bindDirectReleaseDragEvents() {
  const layer = _ensureDirectReleaseLayer()

  const onDragStart = (event) => {
    if (_isPreviewBlockedOnThisPage()) {
      return
    }
    const url = detectDraggedLink(event)
    if (!url) {
      return
    }
    _startLinkDrag(url, event)
    _scheduleDirectReleaseLayerActivation()
  }

  const onDragOver = (event) => {
    if (!state.draggedLink) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    const isReady = _maybeActivateDirectReleaseLayer(event)
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = isReady ? 'copy' : 'none'
    }
  }

  const onDrop = (event) => {
    _handleDirectReleaseDrop(event)
  }

  const onDragEnd = () => {
    setTimeout(() => {
      _clearLinkDragState()
    }, DROP_AREA_SHOW_DELAY_MS)
  }

  document.addEventListener('dragstart', onDragStart, true)
  document.addEventListener('dragover', onDragOver, true)
  document.addEventListener('drop', onDrop, true)
  document.addEventListener('dragend', onDragEnd, true)
  layer.addEventListener('dragover', onDragOver)
  layer.addEventListener('drop', onDrop)

  _dragHandlers.push(
    { target: document, type: 'dragstart', fn: onDragStart, options: true },
    { target: document, type: 'dragover', fn: onDragOver, options: true },
    { target: document, type: 'drop', fn: onDrop, options: true },
    { target: document, type: 'dragend', fn: onDragEnd, options: true },
    { target: layer, type: 'dragover', fn: onDragOver },
    { target: layer, type: 'drop', fn: onDrop }
  )
}

function _bindFrameDragBridge() {
  const onDragStart = (event) => {
    const url = detectDraggedLink(event)
    if (!url || !validateURL(url)) {
      return
    }

    // Let the top document decide whether preview is blocked so allowed pages
    // with third-party iframes keep working as expected.
    try {
      window.top.postMessage({ type: FRAME_DRAG_MESSAGE, url }, '*')
    } catch (e) {
      _dlog('frame drag bridge failed', e)
    }
  }

  const onDragEnd = () => {
    try {
      window.top.postMessage({ type: FRAME_DRAG_END_MESSAGE }, '*')
    } catch (e) {
      _dlog('frame drag end bridge failed', e)
    }
  }

  const onPointerDown = () => {
    try {
      window.top.postMessage({ type: FRAME_FOCUS_MESSAGE }, '*')
    } catch (e) {
      _dlog('frame focus bridge failed', e)
    }
  }

  const onKeyDown = (event) => {
    if (event.key !== 'Escape') {
      return
    }

    try {
      event.preventDefault()
      event.stopPropagation()
      window.top.postMessage({ type: FRAME_ESCAPE_MESSAGE }, '*')
    } catch (e) {
      _dlog('frame escape bridge failed', e)
    }
  }

  document.addEventListener('dragstart', onDragStart)
  document.addEventListener('dragend', onDragEnd)
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onKeyDown, true)
}

function _getPreviewByFrameWindow(frameWindow) {
  for (const preview of previewManager.previews.values()) {
    if (preview.elements.iframe.contentWindow === frameWindow) {
      return preview
    }
  }
  return null
}

function _hideFullscreenOverlay() {
  _setFullscreenOverlayActive(false)
}

function _ensureFullscreenOverlay() {
  let overlay = _shadowRoot.getElementById('gs-dropzone-overlay')
  if (overlay) {
    overlay.setAttribute('data-dp-theme', _currentTheme)
    return overlay
  }

  overlay = document.createElement('div')
  overlay.id = 'gs-dropzone-overlay'
  overlay.setAttribute('data-dp-theme', _currentTheme)
  overlay.innerHTML = `
    <div class="gs-drop-overlay-stage">
      <div class="gs-drop-surface gs-drop-surface--overlay">
        ${_buildDropHintInner({
          iconClass: 'gs-drop-icon-shell--overlay',
          title: t('dropHintFullscreen'),
          copyClass: 'gs-drop-copy--overlay',
          kicker: 'Glimpser',
        })}
      </div>
    </div>
  `
  _shadowRoot.appendChild(overlay)
  return overlay
}

function _bindFullscreenDragEvents() {
  const onDragStart = (event) => {
    if (_isPreviewBlockedOnThisPage()) {
      return
    }
    const url = detectDraggedLink(event)
    if (!url) {
      return
    }
    _startLinkDrag(url, event)
    setTimeout(() => {
      _ensureFullscreenOverlay()
      _setFullscreenOverlayActive(true)
    }, DROP_AREA_SHOW_DELAY_MS)
  }

  const onDragEnd = () => {
    setTimeout(() => {
      _hideFullscreenOverlay()
    }, DROP_AREA_SHOW_DELAY_MS)
  }

  const onOverlayDragOver = (event) => {
    if (_isPreviewBlockedOnThisPage()) {
      return
    }
    if (state.draggedLink) {
      event.preventDefault()
      event.stopPropagation()
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy'
      }
    }
  }

  const onOverlayDrop = (event) => {
    if (_isPreviewBlockedOnThisPage()) {
      _clearLinkDragState()
      return
    }
    if (!state.draggedLink) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    const url = state.draggedLink
    _hideFullscreenOverlay()
    openPreview(url)
  }

  const overlay = _ensureFullscreenOverlay()
  overlay.addEventListener('dragover', onOverlayDragOver)
  overlay.addEventListener('drop', onOverlayDrop)

  document.addEventListener('dragstart', onDragStart)
  document.addEventListener('dragend', onDragEnd)
  _dragHandlers.push(
    { target: document, type: 'dragstart', fn: onDragStart },
    { target: document, type: 'dragend', fn: onDragEnd },
    { target: overlay, type: 'dragover', fn: onOverlayDragOver },
    { target: overlay, type: 'drop', fn: onOverlayDrop }
  )
}

function reinitDropZone() {
  _removeDragHandlers()
  _setFullscreenOverlayActive(false)

  const oldZone = _shadowRoot.getElementById('gs-dropzone')
  if (oldZone) {
    oldZone.remove()
  }

  const oldFullscreen = _shadowRoot.getElementById('gs-dropzone-overlay')
  if (oldFullscreen) {
    oldFullscreen.remove()
  }

  const oldDirectReleaseLayer = _shadowRoot.getElementById('gs-direct-release-layer')
  if (oldDirectReleaseLayer) {
    oldDirectReleaseLayer.remove()
  }

  _clearLinkDragState()

  if (_isPreviewBlockedOnThisPage()) {
    return
  }

  if (_resolvePreviewTriggerMode() === 'release') {
    _bindDirectReleaseDragEvents()
    return
  }

  const position = _settings.dropZonePosition || 'bottom'
  if (position === 'fullscreen') {
    _bindFullscreenDragEvents()
  } else {
    const dropZone = _createDropZoneElement(position, _settings.dropZoneCustomSize)
    _shadowRoot.appendChild(dropZone)
    _bindDropZoneEvents(dropZone)
  }
}

async function initGlimpser() {
  if (window !== top) {
    _settings = await loadSettings()
    _bindFrameDragBridge()
    return
  }

  if (document.getElementById('gs-host')) {
    return
  }

  const pageStyle = document.createElement('style')
  pageStyle.id = 'gs-page-style'
  pageStyle.textContent = `
    body.gs-dropzone-fullscreen-active > *:not(#gs-host) {
      filter: blur(3px);
      transition: filter 0.2s ease;
    }
  `
  document.head.appendChild(pageStyle)

  _shadowHost = document.createElement('div')
  _shadowHost.id = 'gs-host'
  _shadowHost.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;pointer-events:none;z-index:2147483645'
  document.documentElement.appendChild(_shadowHost)
  _shadowRoot = _shadowHost.attachShadow({ mode: 'open' })

  try {
    const nativeAPI = typeof browser !== 'undefined' ? browser : chrome
    await _ensureDocumentStylesheet(GOOGLE_FONTS_STYLESHEET)
    await _loadCssText(nativeAPI, [
      'css/foundation.css',
      'css/preview.css',
    ])
  } catch (e) {
    console.warn('[Glimpser] Failed to load preview CSS into shadow root', e)
  }

  _settings = await loadSettings()
  await applyLangPref(_settings.language)

  ensurePreviewLayer()
  const theme = _settings.theme || _detectSystemTheme()
  applyContentTheme(theme)
  applyContentCorners(_settings.corners || 'rounded')
  reinitDropZone()
  ensureTooltipLayer()

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      const active = getActivePreview()
      if (active) {
        closePreview(active.id)
      }
    }
  })

  window.addEventListener('resize', _refreshPreviewViewportBounds)
  window.addEventListener('scroll', () => _hideTooltip(), true)
}

if (typeof exports === 'undefined') {
  initGlimpser()

  const nativeAPI = typeof browser !== 'undefined' ? browser : chrome
  window.addEventListener('message', (event) => {
    if (event.source === window) {
      return
    }

    if (event.data?.type === FRAME_DRAG_MESSAGE && !_isPreviewBlockedOnThisPage() && validateURL(event.data.url)) {
      if (_resolvePreviewTriggerMode() === 'release') {
        _startLinkDrag(event.data.url, null, 'frame')
        _scheduleDirectReleaseLayerActivation()
        return
      }

      _startLinkDrag(event.data.url, null, 'frame')
      const zone = _shadowRoot ? _shadowRoot.getElementById('gs-dropzone') : null
      const fullscreen = _shadowRoot ? _shadowRoot.getElementById('gs-dropzone-overlay') : null
      if (zone) {
        zone.classList.add('active')
      }
      if (fullscreen) {
        fullscreen.classList.add('active')
      }
    }

    if (event.data?.type === FRAME_DRAG_END_MESSAGE) {
      if (_resolvePreviewTriggerMode() === 'release') {
        setTimeout(() => {
          _clearLinkDragState()
        }, DROP_AREA_SHOW_DELAY_MS)
        return
      }

      const zone = _shadowRoot ? _shadowRoot.getElementById('gs-dropzone') : null
      const fullscreen = _shadowRoot ? _shadowRoot.getElementById('gs-dropzone-overlay') : null
      if (zone) {
        zone.classList.remove('active', 'hovered')
      }
      if (fullscreen) {
        fullscreen.classList.remove('active')
      }
      _clearLinkDragState()
    }

    if (event.data?.type === FRAME_FOCUS_MESSAGE) {
      const preview = _getPreviewByFrameWindow(event.source)
      if (preview) {
        focusPreview(preview.id)
      }
    }

    if (event.data?.type === FRAME_ESCAPE_MESSAGE) {
      const preview = getActivePreview() || _getPreviewByFrameWindow(event.source)
      if (preview) {
        closePreview(preview.id)
      }
    }
  })

  nativeAPI.runtime.onMessage.addListener((msg) => {
    if (window !== top) {
      return
    }
    if (msg.action === 'toggleSettings') {
      window.__gsSettingsPanel?.toggle()
    }
  })

  nativeAPI.storage.onChanged.addListener((changes) => {
    const newSettings = {}
    for (const [key, { newValue }] of Object.entries(changes)) {
      newSettings[key] = newValue
    }

    _settings = { ...(_settings || DEFAULT_SETTINGS), ...newSettings }
    _settings.blacklistDomains = _normalizeBlacklistDomains(_settings.blacklistDomains)

    if (window !== top) {
      return
    }

    if (Object.prototype.hasOwnProperty.call(newSettings, 'maxPreviewWindows')) {
      _enforcePreviewWindowLimit()
    }

    if (newSettings.theme || newSettings.language) {
      const theme = _settings.theme || _detectSystemTheme()
      applyContentTheme(theme)
    }

    if (newSettings.corners || typeof newSettings.cornerRadius === 'number') {
      applyContentCorners(_settings.corners)
    }

    applyLangPref(_settings.language).then(() => {
      _updatePreviewLabels()
      _syncAllPreviewActionVisibility()
      reinitDropZone()
    })
  })
}

if (typeof exports !== 'undefined') {
  Object.assign(exports, {
    validateURL,
    detectDraggedLink,
    loadSettings,
    DEFAULT_SETTINGS,
    state,
    openPreview,
    closePreview,
    reloadPreview,
    handlePreviewAction,
    focusPreview,
    previewManager,
  })
}
