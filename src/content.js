// content.js — Content Script
// Injects Drop Zone and Modal overlay into each page.
// Handles drag-and-drop events and manages the iframe preview lifecycle.

/**
 * Modal size mappings from ModalSize enum to CSS vw/vh dimensions.
 * @type {Record<string, { width: string, height: string }>}
 */
const MODAL_SIZES = {
  small:  { width: '60vw',                  height: '65vh' },
  medium: { width: '75vw',                  height: '82vh' },
  large:  { width: 'calc(100vw - 120px)',   height: '92vh' },
};

/**
 * Default settings used when storage.sync is unavailable or returns no data.
 * @type {GlimpserSettings}
 */
const DEFAULT_SETTINGS = {
  dropZonePosition: 'bottom',
  dropZoneCustomSize: { width: 300, height: 150 },
  modalSize: 'medium',
  language: null,
  theme: null,
  corners: 'rounded',
  controlBarSide: 'right',
};

/**
 * Validates that a URL uses the http or https protocol.
 * Silently rejects null and empty strings.
 * Logs a warning for non-empty URLs that are not http/https.
 *
 * @param {string|null|undefined} url
 * @returns {boolean}
 */
function validateURL(url) {
  if (url === null || url === undefined || url === '') {
    return false;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return true;
  }

  console.warn(t('warnBlockedUrl') + url);
  return false;
}

/**
 * Detects the URL of a link being dragged from a dragstart event.
 * Walks up the DOM from the event target to find the nearest <a> ancestor.
 *
 * @param {DragEvent} event
 * @returns {string|null} The href of the nearest <a> ancestor, or null
 */
function detectDraggedLink(event) {
  if (!event || !event.target) {
    return null;
  }

  let target = event.target;

  // If the target is a text node, move up to its parent element
  if (target.nodeType === Node.TEXT_NODE) {
    target = target.parentNode;
  }

  if (!target || typeof target.closest !== 'function') {
    return null;
  }

  const anchor = target.closest('a');

  if (anchor === null || anchor.href === '') {
    return null;
  }

  return anchor.href;
}

/**
 * Loads user settings from storage.sync.
 * Falls back to DEFAULT_SETTINGS if storage is unavailable or read fails.
 *
 * @returns {Promise<typeof DEFAULT_SETTINGS>}
 */
async function loadSettings() {
  try {
    const nativeAPI = typeof browser !== 'undefined' ? browser : chrome;
    const result = await nativeAPI.storage.sync.get(DEFAULT_SETTINGS);
    return result;
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Applies the given theme to all injected Glimpser elements by setting
 * data-dp-theme on the overlay and backdrop elements.
 * @param {'dark'|'light'} theme
 */
function applyContentTheme(theme) {
  const val = (theme === 'light') ? 'light' : 'dark';
  if (_overlay)  _overlay.setAttribute('data-dp-theme', val);
  if (_backdrop) _backdrop.setAttribute('data-dp-theme', val);
  // Also apply to drop zone if present
  const zone = _shadowRoot ? _shadowRoot.getElementById('glimpser-zone') : null;
  if (zone) zone.setAttribute('data-dp-theme', val);
  // And fullscreen overlay
  const fsOverlay = _shadowRoot ? _shadowRoot.getElementById('glimpser-fullscreen-overlay') : null;
  if (fsOverlay) fsOverlay.setAttribute('data-dp-theme', val);
  // Store for use when elements are created later
  _currentTheme = val;
}

/**
 * Applies the corners setting to the overlay by updating --gs-overlay-radius.
 * @param {'rounded'|'square'} corners
 */
function applyContentCorners(corners) {
  if (_overlay) {
    _overlay.style.setProperty('--gs-overlay-radius', corners === 'square' ? '0px' : '8px');
  }
}

/**
 * Applies the control bar side setting by toggling the bar-left class.
 * @param {'right'|'left'} side
 */
function applyContentControlBarSide(side) {
  if (_controlBar) {
    _controlBar.classList.toggle('bar-left', side === 'left');
  }
}

/**
 * Detect theme from prefers-color-scheme.
 * @returns {'dark'|'light'}
 */
function _detectSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Module-level state object for the Glimpser extension.
 * @type {{ isVisible: boolean, currentUrl: string|null, isLoading: boolean, history: string[], draggedLink: string|null }}
 */
const state = {
  isVisible: false,
  currentUrl: null,
  isLoading: false,
  draggedLink: null
};

// Module-level DOM references set by initGlimpser
let _overlay = null;
let _iframe = null;
let _spinner = null;
let _errorMsg = null;
let _controlBar = null;
let _backdrop = null;

// Shadow DOM host and root
let _shadowHost = null;
let _shadowRoot = null;

// Module-level settings reference set by initGlimpser
let _settings = null;
let _currentTheme = 'dark';

// Stored drag event handlers for cleanup on reinit
let _dragHandlers = [];

function _removeDragHandlers() {
  for (const { target, type, fn } of _dragHandlers) {
    target.removeEventListener(type, fn);
  }
  _dragHandlers = [];
}

/**
 * Clamps a numeric value within [min, max].
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Creates the Control Bar DOM structure with five action buttons.
 * Positioned absolutely to float on the right side of the Modal overlay.
 *
 * Requirements 7.1, 7.2
 *
 * @returns {HTMLElement} The control bar element
 */
const ICON_CLOSE = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M5.72 5.72a.75.75 0 0 1 1.06 0L12 10.94l5.22-5.22a.749.749 0 0 1 1.275.326a.75.75 0 0 1-.215.734L13.06 12l5.22 5.22a.749.749 0 0 1-.326 1.275a.75.75 0 0 1-.734-.215L12 13.06l-5.22 5.22a.75.75 0 0 1-1.042-.018a.75.75 0 0 1-.018-1.042L10.94 12L5.72 6.78a.75.75 0 0 1 0-1.06"/></svg>`;
const ICON_OPEN_CURRENT = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M9.47 13.47a.749.749 0 1 1 1.06 1.06l-5.719 5.72H9a.75.75 0 0 1 0 1.5H3a1 1 0 0 1-.133-.013l-.016-.003l-.039-.011q-.051-.012-.099-.031a1 1 0 0 1-.083-.044a.7.7 0 0 1-.279-.279A.7.7 0 0 1 2.25 21v-6a.75.75 0 0 1 1.5 0v4.189zM21 2.25a1 1 0 0 1 .132.012l.016.003l.04.011q.05.012.098.031a1 1 0 0 1 .083.044a.7.7 0 0 1 .279.279a.66.66 0 0 1 .102.37v6a.75.75 0 0 1-1.5 0V4.811l-5.72 5.719a.749.749 0 1 1-1.06-1.06l5.719-5.72H15a.75.75 0 0 1 0-1.5z"/></svg>`;
const ICON_OPEN_NEW_TAB = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M15.5 2.25a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-1.5 0V4.06l-6.22 6.22a.75.75 0 1 1-1.06-1.06L19.94 3h-3.69a.75.75 0 0 1-.75-.75"/><path fill="currentColor" d="M2.5 4.25c0-.966.784-1.75 1.75-1.75h8.5a.75.75 0 0 1 0 1.5h-8.5a.25.25 0 0 0-.25.25v15.5c0 .138.112.25.25.25h15.5a.25.25 0 0 0 .25-.25v-8.5a.75.75 0 0 1 1.5 0v8.5a1.75 1.75 0 0 1-1.75 1.75H4.25a1.75 1.75 0 0 1-1.75-1.75z"/></svg>`;
const ICON_COPY_URL = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M14.513 6a.75.75 0 0 1 .75.75v2h1.987a.75.75 0 0 1 0 1.5h-1.987v2a.75.75 0 1 1-1.5 0v-2H11.75a.75.75 0 0 1 0-1.5h2.013v-2a.75.75 0 0 1 .75-.75"/><path fill="currentColor" d="M7.024 3.75c0-.966.784-1.75 1.75-1.75H20.25c.966 0 1.75.784 1.75 1.75v11.498a1.75 1.75 0 0 1-1.75 1.75H8.774a1.75 1.75 0 0 1-1.75-1.75Zm1.75-.25a.25.25 0 0 0-.25.25v11.498c0 .139.112.25.25.25H20.25a.25.25 0 0 0 .25-.25V3.75a.25.25 0 0 0-.25-.25Z"/><path fill="currentColor" d="M1.995 10.749a1.75 1.75 0 0 1 1.75-1.751H5.25a.75.75 0 1 1 0 1.5H3.745a.25.25 0 0 0-.25.25L3.5 20.25c0 .138.111.25.25.25h9.5a.25.25 0 0 0 .25-.25v-1.51a.75.75 0 1 1 1.5 0v1.51A1.75 1.75 0 0 1 13.25 22h-9.5A1.75 1.75 0 0 1 2 20.25z"/></svg>`;
const ICON_COPY_SUCCESS = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M3.5 3.75a.25.25 0 0 1 .25-.25h13.5a.25.25 0 0 1 .25.25v10a.75.75 0 0 0 1.5 0v-10A1.75 1.75 0 0 0 17.25 2H3.75A1.75 1.75 0 0 0 2 3.75v16.5c0 .966.784 1.75 1.75 1.75h7a.75.75 0 0 0 0-1.5h-7a.25.25 0 0 1-.25-.25z"/><path fill="currentColor" d="M6.25 7a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5zm-.75 4.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75m16.28 4.53a.75.75 0 1 0-1.06-1.06l-4.97 4.97l-1.97-1.97a.75.75 0 1 0-1.06 1.06l2.5 2.5a.75.75 0 0 0 1.06 0z"/></svg>`;
const ICON_SETTINGS = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M11 18.25a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1-.75-.75m-8-12a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 3 6.25m13 6a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75M8.75 16a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3a.75.75 0 0 1 .75-.75"/><path fill="currentColor" d="M3 18.25a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75m0-6a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1-.75-.75M16.75 10a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3a.75.75 0 0 1 .75-.75M14 6.25a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1-.75-.75M11.25 4a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3a.75.75 0 0 1 .75-.75"/></svg>`;

function _createControlBar() {
  const controlBar = document.createElement('div');
  controlBar.className = 'glimpser-control-bar';

  const buttons = [
    { action: 'close',         icon: ICON_CLOSE,        title: t('btnClose') },
    { action: 'open-current',  icon: ICON_OPEN_CURRENT, title: t('btnOpenCurrent') },
    { action: 'open-new-tab',  icon: ICON_OPEN_NEW_TAB, title: t('btnOpenNewTab') },
    { action: 'copy-url',      icon: ICON_COPY_URL,     title: t('btnCopyUrl') },
    { action: 'open-settings', icon: ICON_SETTINGS,     title: t('btnOpenSettings') },
  ];

  for (const { action, icon, title } of buttons) {
    const btn = document.createElement('button');
    btn.dataset.action = action;
    btn.title = title;
    btn.innerHTML = icon;
    controlBar.appendChild(btn);
  }

  return controlBar;
}

/**
 * Creates and injects the Modal overlay DOM structure into document.body.
 * Includes the overlay container, iframe, loading spinner, error message area,
 * and the control bar.
 * Applies the modal size from settings using MODAL_SIZES mapping.
 *
 * @param {typeof DEFAULT_SETTINGS} settings
 * @returns {{ overlay: HTMLElement, iframe: HTMLIFrameElement, spinner: HTMLElement, errorMsg: HTMLElement, controlBar: HTMLElement }}
 */
function _createModalOverlay(settings) {
  const sizeKey = (settings && settings.modalSize) || 'medium';
  const size = MODAL_SIZES[sizeKey] || MODAL_SIZES.medium;

  // Backdrop — sits behind the overlay, click to close
  const backdrop = document.createElement('div');
  backdrop.id = 'glimpser-backdrop';
  _shadowRoot.appendChild(backdrop);

  // Overlay container — singleton sentinel via id
  const overlay = document.createElement('div');
  overlay.id = 'glimpser-overlay';
  overlay.style.width = size.width;
  overlay.style.height = size.height;

  // iframe for page preview
  const iframe = document.createElement('iframe');
  iframe.src = 'about:blank';
  iframe.setAttribute('allowfullscreen', '');
  overlay.appendChild(iframe);

  // Loading spinner
  const spinner = document.createElement('div');
  spinner.className = 'glimpser-spinner';
  spinner.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><g><circle cx="12" cy="3" r="1" fill="#36aa6d"><animate id="SVGelgoqhuA" attributeName="r" begin="0;SVGSRzJybSJ.end-0.5s" calcMode="spline" dur="0.6s" keySplines=".27,.42,.37,.99;.53,0,.61,.73" values="1;2;1"/></circle><circle cx="16.5" cy="4.21" r="1" fill="#36aa6d"><animate id="SVGBcQu6cCi" attributeName="r" begin="SVGelgoqhuA.begin+0.1s" calcMode="spline" dur="0.6s" keySplines=".27,.42,.37,.99;.53,0,.61,.73" values="1;2;1"/></circle><circle cx="7.5" cy="4.21" r="1" fill="#36aa6d"><animate id="SVGSRzJybSJ" attributeName="r" begin="SVGeZGzNdVZ.begin+0.1s" calcMode="spline" dur="0.6s" keySplines=".27,.42,.37,.99;.53,0,.61,.73" values="1;2;1"/></circle><circle cx="19.79" cy="7.5" r="1" fill="#36aa6d"><animate id="SVGG5Q0fe0M" attributeName="r" begin="SVGBcQu6cCi.begin+0.1s" calcMode="spline" dur="0.6s" keySplines=".27,.42,.37,.99;.53,0,.61,.73" values="1;2;1"/></circle><circle cx="4.21" cy="7.5" r="1" fill="#36aa6d"><animate id="SVGeZGzNdVZ" attributeName="r" begin="SVGUTnihcal.begin+0.1s" calcMode="spline" dur="0.6s" keySplines=".27,.42,.37,.99;.53,0,.61,.73" values="1;2;1"/></circle><circle cx="21" cy="12" r="1" fill="#36aa6d"><animate id="SVG8aQG8dpc" attributeName="r" begin="SVGG5Q0fe0M.begin+0.1s" calcMode="spline" dur="0.6s" keySplines=".27,.42,.37,.99;.53,0,.61,.73" values="1;2;1"/></circle><circle cx="3" cy="12" r="1" fill="#36aa6d"><animate id="SVGUTnihcal" attributeName="r" begin="SVGHktsvT5Q.begin+0.1s" calcMode="spline" dur="0.6s" keySplines=".27,.42,.37,.99;.53,0,.61,.73" values="1;2;1"/></circle><circle cx="19.79" cy="16.5" r="1" fill="#36aa6d"><animate id="SVGqCF3Scrd" attributeName="r" begin="SVG8aQG8dpc.begin+0.1s" calcMode="spline" dur="0.6s" keySplines=".27,.42,.37,.99;.53,0,.61,.73" values="1;2;1"/></circle><circle cx="4.21" cy="16.5" r="1" fill="#36aa6d"><animate id="SVGHktsvT5Q" attributeName="r" begin="SVGSFNCBbxb.begin+0.1s" calcMode="spline" dur="0.6s" keySplines=".27,.42,.37,.99;.53,0,.61,.73" values="1;2;1"/></circle><circle cx="16.5" cy="19.79" r="1" fill="#36aa6d"><animate id="SVGMFYo1cJN" attributeName="r" begin="SVGqCF3Scrd.begin+0.1s" calcMode="spline" dur="0.6s" keySplines=".27,.42,.37,.99;.53,0,.61,.73" values="1;2;1"/></circle><circle cx="7.5" cy="19.79" r="1" fill="#36aa6d"><animate id="SVGSFNCBbxb" attributeName="r" begin="SVGLSoLpdOI.begin+0.1s" calcMode="spline" dur="0.6s" keySplines=".27,.42,.37,.99;.53,0,.61,.73" values="1;2;1"/></circle><circle cx="12" cy="21" r="1" fill="#36aa6d"><animate id="SVGLSoLpdOI" attributeName="r" begin="SVGMFYo1cJN.begin+0.1s" calcMode="spline" dur="0.6s" keySplines=".27,.42,.37,.99;.53,0,.61,.73" values="1;2;1"/></circle><animateTransform attributeName="transform" dur="6s" repeatCount="indefinite" type="rotate" values="360 12 12;0 12 12"/></g></svg>`;
  overlay.appendChild(spinner);

  // Error message area
  const errorMsg = document.createElement('div');
  errorMsg.className = 'glimpser-error';
  errorMsg.style.display = 'none';
  overlay.appendChild(errorMsg);

  // Control bar — floats to the right of the modal
  const controlBar = _createControlBar();
  overlay.appendChild(controlBar);

  _shadowRoot.appendChild(overlay);

  return { overlay, iframe, spinner, errorMsg, controlBar, backdrop };
}

/**
 * Tears down the current Drop Zone and rebuilds it with updated settings.
 * Called after settings are saved.
 */
function reinitDropZone() {
  // Remove old drag event listeners
  _removeDragHandlers();

  // Remove existing drop zone element
  const oldZone = _shadowRoot.getElementById('glimpser-zone');
  if (oldZone) oldZone.remove();

  // Remove fullscreen overlay if present
  const oldFsOverlay = _shadowRoot.getElementById('glimpser-fullscreen-overlay');
  if (oldFsOverlay) oldFsOverlay.remove();
  document.body.classList.remove('glimpser-fullscreen-active');

  // Use already-updated _settings (set by caller before reinitDropZone)
  state.draggedLink = null;

  // Apply modal size immediately
  if (_overlay && _settings.modalSize) {
    const size = MODAL_SIZES[_settings.modalSize] || MODAL_SIZES.medium;
    _overlay.style.width = size.width;
    _overlay.style.height = size.height;
  }

  const position = _settings.dropZonePosition || 'bottom';
  if (position === 'fullscreen') {
    _bindFullscreenDragEvents();
  } else {
    const dropZone = _createDropZoneElement(position, _settings.dropZoneCustomSize);
    _shadowRoot.appendChild(dropZone);
    _bindDropZoneEvents(dropZone);
  }
}

/**
 * Initializes the Glimpser extension UI.
 * Injects Drop Zone and Modal overlay into the page, binds events.
 * Guards against duplicate injection via singleton check.
 *
 * @returns {Promise<void>}
 */
async function initGlimpser() {
  // Singleton guard via shadow host id
  if (document.getElementById('glimpser-host')) {
    return;
  }

  // Inject page-level styles (scroll lock, fullscreen blur) into document head
  // These must live outside shadow DOM since they target html/body
  const pageStyle = document.createElement('style');
  pageStyle.id = 'glimpser-page-style';
  pageStyle.textContent = `
    html.glimpser-open { overflow: hidden; scrollbar-gutter: stable; }
    body.glimpser-fullscreen-active > *:not(#glimpser-host) {
      filter: blur(3px);
      transition: filter 0.2s ease;
    }
  `;
  document.head.appendChild(pageStyle);

  // Create shadow host and attach shadow root
  _shadowHost = document.createElement('div');
  _shadowHost.id = 'glimpser-host';
  _shadowHost.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;pointer-events:none;z-index:2147483645';
  document.documentElement.appendChild(_shadowHost);
  _shadowRoot = _shadowHost.attachShadow({ mode: 'open' });

  // Inject styles.css into shadow root
  try {
    const nativeAPI = typeof browser !== 'undefined' ? browser : chrome;
    const cssUrl = nativeAPI.runtime.getURL('styles.css');
    const cssText = await fetch(cssUrl).then(r => r.text());
    const styleEl = document.createElement('style');
    styleEl.textContent = cssText;
    _shadowRoot.appendChild(styleEl);
  } catch (e) {
    console.warn('[Glimpser] Failed to load styles.css into shadow root', e);
  }

  // Load user settings, falling back to defaults on failure
  const settings = await loadSettings();
  _settings = settings;
  await applyLangPref(settings.language);

  // Inject Modal overlay DOM structure
  ({ overlay: _overlay, iframe: _iframe, spinner: _spinner, errorMsg: _errorMsg, controlBar: _controlBar, backdrop: _backdrop } = _createModalOverlay(settings));

  // Apply theme to injected elements
  const theme = settings.theme || _detectSystemTheme();
  applyContentTheme(theme);
  applyContentCorners(settings.corners || 'rounded');
  applyContentControlBarSide(settings.controlBarSide || 'right');

  // Click backdrop to close modal
  _backdrop.addEventListener('click', () => closeModal());

  // Bind control bar click events
  _controlBar.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    handleControlAction(action, state.currentUrl, action === 'copy-url' ? btn : null);
  });

  // Bind iframe load/error events
  _iframe.onload = () => {
    if (_iframe.src === 'about:blank') return;
    hideLoadingSpinner();
    state.isLoading = false;
    _iframe.classList.add('loaded');
  };

  _iframe.onerror = () => {
    hideLoadingSpinner();
    _errorMsg.style.display = '';
    _errorMsg.textContent = t('errorLoadFailed');
  };

  // Bind ESC key to close Modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.isVisible) closeModal();
  });

  const position = settings.dropZonePosition || 'bottom';

  if (position === 'fullscreen') {
    _bindFullscreenDragEvents();
  } else {
    const dropZone = _createDropZoneElement(position, settings.dropZoneCustomSize);
    _shadowRoot.appendChild(dropZone);
    _bindDropZoneEvents(dropZone);
  }
}

/**
 * Creates and returns the Drop Zone element for bottom/top modes.
 * @param {'bottom'|'top'} position
 * @param {{ width: number, height: number }} customSize
 * @returns {HTMLElement}
 */
function _createDropZoneElement(position, customSize) {
  const width = clamp((customSize && customSize.width) || 300, 100, 1200);
  const height = clamp((customSize && customSize.height) || 150, 60, 400);

  const zone = document.createElement('div');
  zone.id = 'glimpser-zone';
  zone.dataset.position = position;
  zone.setAttribute('data-dp-theme', _currentTheme);
  zone.style.width = width + 'px';
  zone.style.height = height + 'px';
  zone.innerHTML = `<span class="gs-drop-hint">${t('dropHintZone')}</span>`;

  return zone;
}

/**
 * Shows the loading spinner and hides the error message area.
 */
function showLoadingSpinner() {
  if (_spinner) {
    _spinner.style.display = '';
  }
  if (_errorMsg) {
    _errorMsg.style.display = 'none';
  }
}

/**
 * Hides the loading spinner.
 */
function hideLoadingSpinner() {
  if (_spinner) {
    _spinner.style.display = 'none';
  }
}

/**
 * Opens the Modal preview for the given URL.
 * Sets iframe src, shows overlay, updates state, shows loading spinner,
 * and optionally updates history (dedup + max 20 + persist).
 *
 * @param {string} url - A validated http/https URL
 * @param {typeof state} stateObj - The module state object
 * @param {typeof DEFAULT_SETTINGS} settingsObj - The current settings
 */
function openModal(url, stateObj, settingsObj) {
  if (_iframe) {
    _iframe.src = url;
  }
  if (_overlay) {
    _overlay.classList.add('visible');
  }
  if (_backdrop) {
    _backdrop.classList.add('visible');
  }
  document.documentElement.classList.add('glimpser-open');

  stateObj.isVisible = true;
  stateObj.currentUrl = url;
  stateObj.isLoading = true;

  showLoadingSpinner();
}

/**
 * Handles the drop event on the Drop Zone.
 * Reads the URL from state or dataTransfer, validates it, and opens the Modal.
 *
 * @param {DragEvent} event
 * @param {{ draggedLink: string|null }} state
 * @param {HTMLElement} dropZone
 */
function handleDrop(event, state, dropZone) {
  event.preventDefault();
  event.stopPropagation();

  dropZone.classList.remove('active', 'hovered');

  const url =
    state.draggedLink ||
    event.dataTransfer.getData('text/uri-list') ||
    event.dataTransfer.getData('URL') ||
    event.dataTransfer.getData('text/plain');

  if (validateURL(url)) {
    openModal(url, state, _settings || DEFAULT_SETTINGS);
  } else {
    console.warn(t('warnInvalidUrl'));
  }

  state.draggedLink = null;
}

/**
 * Binds drag events for bottom/top drop zone element.
 * @param {HTMLElement} dropZone
 */
function _bindDropZoneEvents(dropZone) {
  const onDragStart = (event) => {
    const url = detectDraggedLink(event);
    if (!url) return;
    state.draggedLink = url;
    // Small timeout matches nozo's approach: avoids triggering on accidental
    // micro-movements during a regular click
    setTimeout(() => {
      dropZone.classList.add('active');
    }, 100);
  };

  const onDragEnd = () => {
    setTimeout(() => {
      dropZone.classList.remove('active', 'hovered');
      state.draggedLink = null;
    }, 100);
  };

  document.addEventListener('dragstart', onDragStart);
  document.addEventListener('dragend', onDragEnd);
  _dragHandlers.push(
    { target: document, type: 'dragstart', fn: onDragStart },
    { target: document, type: 'dragend',   fn: onDragEnd }
  );

  dropZone.addEventListener('dragenter', (event) => {
    event.preventDefault();
    dropZone.classList.add('hovered');
  });
  dropZone.addEventListener('dragleave', (event) => {
    if (event.relatedTarget && !dropZone.contains(event.relatedTarget)) {
      dropZone.classList.remove('hovered');
    }
  });
  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  });
  dropZone.addEventListener('drop', (event) => {
    handleDrop(event, state, dropZone);
  });
}

/**
 * Binds drag events for fullscreen mode.
 * On dragstart, shows a fullscreen overlay; on dragend/drop, hides it.
 */
function _bindFullscreenDragEvents() {
  const onDragStart = (event) => {
    const url = detectDraggedLink(event);
    if (!url) return;
    state.draggedLink = url;
    setTimeout(() => {
      let overlay = _shadowRoot.getElementById('glimpser-fullscreen-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'glimpser-fullscreen-overlay';
        overlay.setAttribute('data-dp-theme', _currentTheme);
        overlay.innerHTML = `<span class="gs-drop-hint">${t('dropHintFullscreen')}</span>`;
        _shadowRoot.appendChild(overlay);
      }
      overlay.classList.add('active');
      document.body.classList.add('glimpser-fullscreen-active');
    }, 100);
  };

  const onDragEnd = () => {
    setTimeout(() => {
      _hideFullscreenOverlay();
    }, 100);
  };

  const onBodyDragOver = (event) => { if (state.draggedLink) event.preventDefault(); };
  const onBodyDrop = (event) => {
    if (!state.draggedLink) return;
    event.preventDefault();
    const url = state.draggedLink;
    _hideFullscreenOverlay();
    openModal(url, state, _settings || DEFAULT_SETTINGS);
  };

  document.addEventListener('dragstart', onDragStart);
  document.addEventListener('dragend', onDragEnd);
  document.body.addEventListener('dragover', onBodyDragOver);
  document.body.addEventListener('drop', onBodyDrop);
  _dragHandlers.push(
    { target: document,      type: 'dragstart', fn: onDragStart },
    { target: document,      type: 'dragend',   fn: onDragEnd },
    { target: document.body, type: 'dragover',  fn: onBodyDragOver },
    { target: document.body, type: 'drop',      fn: onBodyDrop }
  );
}

/**
 * Hides and removes the fullscreen overlay.
 */
function _hideFullscreenOverlay() {
  const overlay = _shadowRoot ? _shadowRoot.getElementById('glimpser-fullscreen-overlay') : null;
  if (overlay) {
    overlay.classList.remove('active');
  }
  document.body.classList.remove('glimpser-fullscreen-active');
  state.draggedLink = null;
}

/**
 * Handles a control bar button action.
 *
 * Actions:
 *   close         — closes the Modal
 *   open-current  — closes the Modal then navigates to url
 *   open-new-tab  — opens url in a new tab then closes the Modal
 *   copy-url      — writes url to clipboard; on success briefly shows ✓ on copyBtn
 *   open-settings — opens the extension options page via nativeAPI
 *
 * Requirements 7.3, 7.4, 7.5, 7.6, 7.7, 7.8
 *
 * @param {string} action - One of the ControlAction values
 * @param {string|null} url - The current preview URL
 * @param {HTMLElement|null} [copyBtn] - The copy button element (used for icon feedback)
 */
function handleControlAction(action, url, copyBtn) {
  switch (action) {
    case 'close':
      closeModal();
      break;

    case 'open-current':
      closeModal();
      location.href = url;
      break;

    case 'open-new-tab':
      window.open(url, '_blank');
      closeModal();
      break;

    case 'copy-url':
      navigator.clipboard.writeText(url).then(() => {
        if (copyBtn) {
          copyBtn.textContent = '✓';
          setTimeout(() => {
            copyBtn.textContent = '⎘';
          }, 1500);
        }
      }).catch((err) => {
        console.error(t('errorClipboard'), err);
      });
      break;

    case 'open-settings':
      window.__glimpserSettingsPanel?.toggle();
      break;
  }
}

/**
 * Closes the Modal overlay.
 * Hides the overlay immediately, updates state, and resets iframe src after 350ms.
 *
 * Requirements 8.2, 8.3
 */
function closeModal() {
  if (_overlay) {
    _overlay.classList.remove('visible');
  }
  if (_backdrop) {
    _backdrop.classList.remove('visible');
  }
  document.documentElement.classList.remove('glimpser-open');

  state.isVisible = false;
  state.currentUrl = null;

  setTimeout(() => {
    if (_iframe) {
      _iframe.src = 'about:blank';
      _iframe.classList.remove('loaded');
    }
  }, 350);
}

// Auto-initialize when running as a content script in the browser
if (typeof exports === 'undefined') {
  initGlimpser();

  // Listen for settings panel toggle from background.js
  const _nativeAPI = typeof browser !== 'undefined' ? browser : chrome;
  _nativeAPI.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'toggleSettings') {
      window.__glimpserSettingsPanel?.toggle();
    }
  });

  // Listen for settings changes from the panel
  _nativeAPI.storage.onChanged.addListener((changes) => {
    const newSettings = {};
    for (const [key, { newValue }] of Object.entries(changes)) {
      newSettings[key] = newValue;
    }
    _settings = { ...(_settings || DEFAULT_SETTINGS), ...newSettings };
    if (newSettings.theme) {
      applyContentTheme(newSettings.theme);
    }
    if (newSettings.corners) {
      applyContentCorners(newSettings.corners);
    }
    if (newSettings.controlBarSide) {
      applyContentControlBarSide(newSettings.controlBarSide);
    }
    applyLangPref(_settings.language).then(() => reinitDropZone());
  });
}

// Export for testing (Node.js / vitest environment only)
if (typeof exports !== 'undefined') {
  Object.assign(exports, { validateURL, detectDraggedLink, initGlimpser, state, handleDrop, MODAL_SIZES, _createModalOverlay, _createControlBar, openModal, showLoadingSpinner, hideLoadingSpinner, closeModal, handleControlAction, loadSettings, DEFAULT_SETTINGS });
}
