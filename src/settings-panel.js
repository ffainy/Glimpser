// settings-panel.js — In-page settings panel (Shadow DOM)
// Injected by content.js; communicates with storage directly.

/* global browser, chrome */

(function () {
  'use strict';

  if (window !== top) {
    window.__gsSettingsPanel = {
      toggle() {},
      show() {},
      hide() {},
    };
    return;
  }

  const nativeAPI = typeof browser !== 'undefined' ? browser : chrome;
  const HOST_ID   = 'gs-settings-host';
  const GOOGLE_FONTS_STYLESHEET = 'https://fonts.googleapis.com/css2?family=Courier+Prime:wght@700&family=Nunito+Sans:wght@400;500;600;700;800&family=Young+Serif&display=swap';
  const BRAND_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 0C4.492 2.746-.885 11.312.502 19.963C.502 19.963 4.989 24 12 24s11.496-4.037 11.496-4.037C24.882 11.312 19.508 2.746 12 0m0 1.846s2.032.726 3.945 2.488c.073.067.13.163.129.277c-.001.168-.128.287-.301.287a.5.5 0 0 1-.137-.027a6.5 6.5 0 0 0-2.316-.4a6.63 6.63 0 0 0-3.914 1.273l-.002.002a7.98 7.98 0 0 1 6.808.768C20.48 9.11 22.597 14.179 21.902 19c0 0-1.646 1.396-4.129 2.172a.37.37 0 0 1-.303-.026c-.144-.084-.185-.255-.1-.404a.5.5 0 0 1 .094-.103a6.6 6.6 0 0 0 1.504-1.809a6.63 6.63 0 0 0 .856-4.027l-.002-.002a7.95 7.95 0 0 1-3.838 5.383c-4.42 2.552-9.99 1.882-13.885-1.184c0 0-.388-2.124.182-4.662a.37.37 0 0 1 .176-.25c.145-.084.31-.033.396.117a.5.5 0 0 1 .045.13c.126.762.405 1.5.814 2.208a6.64 6.64 0 0 0 3.059 2.756a8 8 0 0 1-1.672-2.033a7.93 7.93 0 0 1-1.066-4.205C4.128 8.047 7.464 3.659 12 1.846m0 7.623c-2.726 0-5.117.93-6.483 2.332c-.064.32-.1.65-.1.984c0 3.146 2.947 5.695 6.583 5.695c3.635 0 6.584-2.549 6.584-5.695c0-.334-.038-.664-.102-.984C17.116 10.4 14.724 9.469 12 9.469m0 .693a3.12 3.12 0 0 1 0 6.238a3.118 3.118 0 0 1-2.872-4.336a1.3 1.3 0 1 0 1.657-1.656A3.1 3.1 0 0 1 12 10.162"/></svg>`;

  // ── Tab definitions ────────────────────────────────────────────────────
  const TABS = [
    {
      key: 'appearance',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" d="m7.533 11.862l.01-.003m5.581 7.143c-.5.515-.92.847-1.06.89c-.48.145-5.43-1.28-6.238-3.33c-.81-2.051-1.831-5.816-1.89-6.22c-.06-.404 1.56-1.724 3.597-2.61m1.989 8.055c-.227.262-.39.56-.556.847M13.5 12c.5.5 1 1.049 2 1.049S17 12.5 17.5 12m-4-4h.01m3.99 0h.01M10.5 5.5c0-.29 2.5-1.5 5-1.5s5 1.136 5 1.5V12c0 1.966-4.291 5-5 5c-.743 0-5-3.034-5-5z"/></svg>',
    },
    {
      key: 'preview',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-5l-3 3v-3H6a2 2 0 0 1-2-2zm4 3h8m-8-3h8"/></svg>',
    },
    {
      key: 'blacklist',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.5 11.5L11 13l4-3.5M12 20a16.4 16.4 0 0 1-5.092-5.804A16.7 16.7 0 0 1 5 6.666L12 4l7 2.667a16.7 16.7 0 0 1-1.908 7.529A16.4 16.4 0 0 1 12 20"/></svg>',
    },
    {
      key: 'about',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M12 10.5v4m0-7.25h.01"/></svg>',
    },
  ];

  const DEFAULT_SETTINGS = {
    dropZonePosition:   'bottom',
    dropZoneCustomSize: { width: 300, height: 150 },
    defaultWindowScale: { width: 75, height: 82 },
    maxPreviewWindows:  1,
    newWindowOffset:    24,
    closePreviewOnOpenNewTab: true,
    showCloseOthersButton: true,
    showCloseAllButton: true,
    blacklistDomains:   [],
    language:           null,
    theme:              null,
    corners:            'rounded',
    cornerRadius:       16,
    debug:              false,
  };

  // ── Panel singleton ────────────────────────────────────────────────────
  let _host = null;
  let _shadow = null;
  let _fontsLink = null;
  let _activeTab = 'appearance';
  let _settings = null;
  let _scrollLockState = null;
  let _blacklistDraft = '';
  let _blacklistEditingIndex = -1;
  let _blacklistEditDraft = '';
  let _blacklistNotice = null;

  function _t(key) {
    return typeof t === 'function' ? t(key) : key;
  }

  function _resolveDefaultWindowScale(settings) {
    return {
      width: settings?.defaultWindowScale?.width ?? DEFAULT_SETTINGS.defaultWindowScale.width,
      height: settings?.defaultWindowScale?.height ?? DEFAULT_SETTINGS.defaultWindowScale.height,
    };
  }

  function _getTabLabel(key) {
    return _t('tab' + key.charAt(0).toUpperCase() + key.slice(1));
  }

  function _getActiveThemeLabel() {
    return _settings?.theme === 'light' ? _t('themeLight') : _t('themeDark');
  }

  function _detectPreferredLanguage() {
    const nav = (navigator.language || navigator.userLanguage || '').toLowerCase();
    return nav.startsWith('zh') ? 'zh' : 'en';
  }

  function _getSelectedLanguageValue() {
    return (_settings?.language === 'zh' || _settings?.language === 'zh_CN')
      ? 'zh'
      : (_settings?.language === 'en')
        ? 'en'
        : _detectPreferredLanguage();
  }

  function _getSelectedLanguageLabel() {
    return _getSelectedLanguageValue() === 'zh' ? '中文' : 'English';
  }

  function _getTabDescription(key) {
    switch (key) {
      case 'appearance':
        return `${_t('labelTheme')} · ${_t('labelLang')} · ${_t('labelCorners')}`;
      case 'preview':
        return `${_t('labelPos')} · ${_t('labelDefaultWindowSize')} · ${_t('labelAdvancedPreview')}`;
      case 'blacklist':
        return `${_t('labelBlacklistDomains')} · ${_t('hintBlacklistExactMatchShort')}`;
      case 'about':
        return `${_t('aboutVersion')} · ${_t('aboutAuthor')} · ${_t('aboutHomepage')}`;
      default:
        return _t('aboutDescText');
    }
  }

  function _getAboutInfo() {
    const manifest = nativeAPI.runtime.getManifest();
    const version = manifest.version || '—';
    const author = manifest.author || '—';
    const homepage = manifest.homepage_url || '';
    const releaseLink = homepage ? `${homepage.replace(/\/$/, '')}/releases/tag/v${version}` : '';
    const homepageHost = homepage ? (() => {
      try {
        return new URL(homepage).hostname;
      } catch (e) {
        return homepage;
      }
    })() : '—';

    return {
      name: _t('extName') || manifest.name || 'Glimpser',
      description: _t('aboutDescText'),
      version,
      author,
      homepage,
      homepageHost,
      releaseLink,
      authorLink: 'https://github.com/ffainy',
    };
  }

  function _normalizeDomainInput(value) {
    const trimmed = String(value || '').trim().toLowerCase().replace(/\.+$/, '');
    if (!trimmed) {
      return '';
    }

    const normalizeHostname = (hostname) => {
      const normalized = String(hostname || '').trim().toLowerCase().replace(/\.+$/, '');
      if (!normalized) {
        return '';
      }

      const labels = normalized.split('.');
      if (labels.some(label => !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))) {
        return '';
      }

      return normalized;
    };

    if (!trimmed.includes('/') && !trimmed.includes(':')) {
      return normalizeHostname(trimmed);
    }

    const candidates = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
      ? [trimmed]
      : [`https://${trimmed}`];

    for (const candidate of candidates) {
      try {
        const parsed = new URL(candidate);
        return normalizeHostname(parsed.hostname);
      } catch (e) {}
    }

    return '';
  }

  function _normalizeBlacklistDomains(domains) {
    const unique = [];
    (Array.isArray(domains) ? domains : []).forEach((domain) => {
      const normalized = _normalizeDomainInput(domain);
      if (normalized && !unique.includes(normalized)) {
        unique.push(normalized);
      }
    });
    return unique;
  }

  function _getCurrentPageDomain() {
    if (!/^https?:$/i.test(window.location.protocol)) {
      return '';
    }
    return _normalizeDomainInput(window.location.hostname);
  }

  function _isCurrentPageBlacklisted() {
    const currentDomain = _getCurrentPageDomain();
    return !!currentDomain && _getBlacklistDomains().includes(currentDomain);
  }

  function _getBlacklistDomains() {
    const normalized = _normalizeBlacklistDomains(_settings?.blacklistDomains);
    if (_settings && JSON.stringify(normalized) !== JSON.stringify(_settings.blacklistDomains || [])) {
      _settings.blacklistDomains = normalized;
    }
    return normalized;
  }

  function _setBlacklistNotice(key, tone = 'info') {
    _blacklistNotice = key ? { key, tone } : null;
  }

  function _resetBlacklistEditor() {
    _blacklistDraft = '';
    _blacklistEditingIndex = -1;
    _blacklistEditDraft = '';
  }

  function _addBlacklistDomain(rawValue, successKey = 'blacklistDomainAdded') {
    const domain = _normalizeDomainInput(rawValue);
    if (!domain) {
      _setBlacklistNotice('blacklistInvalidDomain', 'error');
      return false;
    }

    const domains = _getBlacklistDomains();
    if (domains.includes(domain)) {
      _setBlacklistNotice('blacklistDuplicateDomain', 'error');
      return false;
    }

    _settings.blacklistDomains = [...domains, domain];
    _blacklistDraft = '';
    _setBlacklistNotice(successKey, 'success');
    return true;
  }

  function _updateBlacklistDomain(index, rawValue) {
    const domain = _normalizeDomainInput(rawValue);
    if (!domain) {
      _setBlacklistNotice('blacklistInvalidDomain', 'error');
      return false;
    }

    const domains = _getBlacklistDomains();
    if (domains.some((existing, existingIndex) => existing === domain && existingIndex !== index)) {
      _setBlacklistNotice('blacklistDuplicateDomain', 'error');
      return false;
    }

    _settings.blacklistDomains = domains.map((existing, existingIndex) => existingIndex === index ? domain : existing);
    _blacklistEditingIndex = -1;
    _blacklistEditDraft = '';
    _setBlacklistNotice('blacklistDomainUpdated', 'success');
    return true;
  }

  function _removeBlacklistDomain(index) {
    const domains = _getBlacklistDomains();
    _settings.blacklistDomains = domains.filter((_, existingIndex) => existingIndex !== index);
    if (_blacklistEditingIndex === index) {
      _blacklistEditingIndex = -1;
      _blacklistEditDraft = '';
    }
    _setBlacklistNotice('blacklistDomainRemoved', 'success');
  }

  function _getHeaderMetaItems() {
    switch (_activeTab) {
      case 'appearance':
        return [
          { label: _t('labelTheme'), value: _getActiveThemeLabel() },
          { label: _t('labelLang'), value: _getSelectedLanguageLabel() },
          { label: _t('labelCorners'), value: _settings?.corners === 'square' ? _t('cornersSquare') : _t('cornersRounded') },
        ];
      case 'preview':
        return [
          { label: _t('labelPos'), value: _t(`pos${(_settings?.dropZonePosition || 'bottom').charAt(0).toUpperCase()}${(_settings?.dropZonePosition || 'bottom').slice(1)}`) },
          { label: _t('labelDefaultWindowSize'), value: `${_settings?.defaultWindowScale?.width ?? DEFAULT_SETTINGS.defaultWindowScale.width}% × ${_settings?.defaultWindowScale?.height ?? DEFAULT_SETTINGS.defaultWindowScale.height}%` },
          { label: _t('labelMaxPreviewWindows'), value: String(_settings?.maxPreviewWindows ?? DEFAULT_SETTINGS.maxPreviewWindows) },
        ];
      case 'blacklist': {
        const currentDomain = _getCurrentPageDomain();
        return [
          { label: _t('labelBlacklistCount'), value: String(_getBlacklistDomains().length) },
          { label: _t('labelCurrentDomain'), value: currentDomain || _t('blacklistCurrentDomainUnavailable') },
          {
            label: _t('labelCurrentSiteStatus'),
            value: currentDomain ? _t(_isCurrentPageBlacklisted() ? 'blacklistCurrentSiteBlocked' : 'blacklistCurrentSiteAllowed') : '—',
            tone: currentDomain && _isCurrentPageBlacklisted() ? 'danger' : '',
          },
        ];
      }
      case 'about': {
        const about = _getAboutInfo();
        return [
          { label: _t('aboutVersion'), value: `v${about.version}` },
          { label: _t('aboutAuthor'), value: about.author },
          { label: _t('aboutHomepage'), value: about.homepageHost },
        ];
      }
      default:
        return [];
    }
  }

  function _syncHeaderState(title, metaRow) {
    if (title) {
      title.textContent = _getTabLabel(_activeTab);
    }
    if (metaRow) {
      metaRow.innerHTML = '';
      _getHeaderMetaItems().forEach(({ label, value, tone }) => {
        metaRow.appendChild(_makeMetaItem(label, value, tone));
      });
    }
  }

  function _syncThemeState(theme, themeBadge = null, metaRow = null) {
    if (_host) {
      _host.setAttribute('data-dp-theme', theme);
    }

    if (_shadow?.host) {
      _shadow.host.setAttribute('data-dp-theme', theme);
    }

    if (document.documentElement.dataset.dpStandalone) {
      document.body.setAttribute('data-dp-theme', theme);
    }

    if (themeBadge) {
      themeBadge.innerHTML = `
        <span class="gs-settings-theme-swatch" data-theme="${theme}"></span>
        <span>${_getActiveThemeLabel()}</span>
      `;
    }

    if (metaRow) {
      _syncHeaderState(null, metaRow);
    }
  }

  function _cloneDefaultSettings() {
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }

  async function _appendStylesheets(shadowRoot, paths) {
    await Promise.all(
      paths.map((path) => new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = nativeAPI.runtime.getURL(path);
        link.addEventListener('load', resolve, { once: true });
        link.addEventListener('error', () => reject(new Error(`Failed to load stylesheet: ${path}`)), { once: true });
        shadowRoot.appendChild(link);
      }))
    );
  }

  async function _ensureDocumentStylesheet(href) {
    const existing = document.head.querySelector(`link[rel="stylesheet"][href="${href}"]`);
    if (existing) {
      _fontsLink = existing;
      return;
    }

    await new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.addEventListener('load', resolve, { once: true });
      link.addEventListener('error', () => reject(new Error(`Failed to load stylesheet: ${href}`)), { once: true });
      document.head.appendChild(link);
      _fontsLink = link;
    });
  }

  // ── Build Shadow DOM ───────────────────────────────────────────────────
  async function _buildPanel() {
    _host = document.createElement('div');
    _host.id = HOST_ID;
    _host.style.position = 'fixed';
    _host.style.inset = '0';
    _host.style.zIndex = '2147483640';
    _host.style.pointerEvents = 'none';
    document.documentElement.appendChild(_host);

    _shadow = _host.attachShadow({ mode: 'open' });

    try {
      await _ensureDocumentStylesheet(GOOGLE_FONTS_STYLESHEET);
      await _appendStylesheets(_shadow, [
        'css/foundation.css',
        'css/settings.css',
      ]);
    } catch (e) {
      console.warn('[Glimpser] Failed to load settings CSS', e);
    }

    _render();
  }

  function _lockPageScroll() {
    if (document.documentElement.dataset.dpStandalone || _scrollLockState) return;

    const html = document.documentElement;
    const body = document.body;
    const scrollbarWidth = Math.max(0, window.innerWidth - html.clientWidth);

    _scrollLockState = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body ? body.style.overflow : '',
      bodyPaddingRight: body ? body.style.paddingRight : '',
    };

    html.style.overflow = 'hidden';

    if (body) {
      body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }
  }

  function _unlockPageScroll() {
    if (document.documentElement.dataset.dpStandalone || !_scrollLockState) return;

    const html = document.documentElement;
    const body = document.body;

    html.style.overflow = _scrollLockState.htmlOverflow;

    if (body) {
      body.style.overflow = _scrollLockState.bodyOverflow;
      body.style.paddingRight = _scrollLockState.bodyPaddingRight;
    }

    _scrollLockState = null;
  }

  // ── Render ─────────────────────────────────────────────────────────────
  function _render() {
    // Remove old content except linked stylesheets
    const styles = Array.from(_shadow.querySelectorAll('link[rel="stylesheet"]'));
    _shadow.innerHTML = '';
    styles.forEach((style) => _shadow.appendChild(style));

    const theme = _settings?.theme || 'dark';
    _syncThemeState(theme);

    const overlay = document.createElement('div');
    overlay.className = 'gs-settings-overlay';

    const shell = document.createElement('div');
    shell.className = 'gs-settings-shell';

    const sidebar = document.createElement('aside');
    sidebar.className = 'gs-settings-sidebar';

    const sidebarGlow = document.createElement('div');
    sidebarGlow.className = 'gs-settings-sidebar-glow';

    const brand = document.createElement('div');
    brand.className = 'gs-settings-brand';

    const brandTop = document.createElement('div');
    brandTop.className = 'gs-settings-brand-top';

    const brandBadge = document.createElement('div');
    brandBadge.className = 'gs-settings-brand-badge';
    brandBadge.innerHTML = BRAND_ICON_SVG;

    const brandNameBlock = document.createElement('div');
    brandNameBlock.className = 'gs-settings-brand-name-block';

    const brandTitle = document.createElement('div');
    brandTitle.className = 'gs-settings-brand-title';
    brandTitle.textContent = 'Glimpser';

    brandNameBlock.appendChild(brandTitle);
    brandTop.append(brandBadge, brandNameBlock);

    brand.append(sidebarGlow, brandTop);

    const tabNav = document.createElement('nav');
    tabNav.className = 'gs-settings-tabs';
    tabNav.setAttribute('aria-label', _t('settingsTitle'));

    TABS.forEach(tab => {
      const btn = document.createElement('button');
      btn.className = 'gs-settings-tab' + (_activeTab === tab.key ? ' active' : '');
      btn.dataset.tab = tab.key;
      btn.type = 'button';
      btn.innerHTML = `
        <span class="gs-settings-tab-icon">${tab.svg}</span>
        <span class="gs-settings-tab-copy">
          <span class="gs-settings-tab-label">${_getTabLabel(tab.key)}</span>
          <span class="gs-settings-tab-hint">${_getTabDescription(tab.key)}</span>
        </span>
      `;
      btn.addEventListener('click', () => {
        _activeTab = tab.key;
        _shadow.querySelectorAll('.gs-settings-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab.key));
        _shadow.querySelectorAll('.gs-settings-section').forEach(c => {
          const isActive = c.dataset.tab === tab.key;
          c.classList.remove('active');
          if (isActive) { void c.offsetWidth; c.classList.add('active'); }
        });
        _syncHeaderState(title, metaRow);
      });
      tabNav.appendChild(btn);
    });
    sidebar.append(brand, tabNav);

    const panel = document.createElement('div');
    panel.className = 'gs-settings-panel';

    const header = document.createElement('div');
    header.className = 'gs-settings-header';

    const headerTop = document.createElement('div');
    headerTop.className = 'gs-settings-header-top';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'gs-settings-title-group';

    const title = document.createElement('div');
    title.className = 'gs-settings-title';
    title.textContent = _getTabLabel(_activeTab);

    titleGroup.append(title);

    const themeBadge = document.createElement('div');
    themeBadge.className = 'gs-settings-theme-badge';
    themeBadge.innerHTML = `
      <span class="gs-settings-theme-swatch" data-theme="${_settings?.theme || 'dark'}"></span>
      <span>${_getActiveThemeLabel()}</span>
    `;

    headerTop.append(titleGroup, themeBadge);

    const metaRow = document.createElement('div');
    metaRow.className = 'gs-settings-meta';
    _getHeaderMetaItems().forEach(({ label, value, tone }) => {
      metaRow.appendChild(_makeMetaItem(label, value, tone));
    });

    header.append(headerTop, metaRow);

    const scroll = document.createElement('div');
    scroll.className = 'gs-settings-scroll';

    scroll.appendChild(_renderAppearanceTab());
    scroll.appendChild(_renderPreviewTab());
    scroll.appendChild(_renderBlacklistTab());
    scroll.appendChild(_renderAboutTab());

    // Footer
    const footer = document.createElement('div');
    footer.className = 'gs-settings-footer';

    const footerStart = document.createElement('div');
    footerStart.className = 'gs-settings-footer-start';

    const footerEnd = document.createElement('div');
    footerEnd.className = 'gs-settings-footer-end';

    const status = document.createElement('span');
    status.className = 'gs-settings-status';

    const resetBtn = document.createElement('button');
    resetBtn.className = 'gs-btn gs-btn-secondary gs-btn-reset';
    resetBtn.textContent = _t('btnReset');
    resetBtn.addEventListener('click', () => {
      _settings = _cloneDefaultSettings();
      _resetBlacklistEditor();
      _setBlacklistNotice(null);
      _settings.theme = _host?.getAttribute('data-dp-theme') || _settings.theme || 'dark';
      _render();
    });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'gs-btn gs-btn-secondary';
    closeBtn.textContent = _t('settingsClose');
    if (document.documentElement.dataset.dpStandalone) {
      closeBtn.addEventListener('click', () => window.close());
    } else {
      closeBtn.addEventListener('click', hide);
    }

    const saveBtn = document.createElement('button');
    saveBtn.className = 'gs-btn gs-btn-primary';
    saveBtn.textContent = _t('btnSave');
    saveBtn.addEventListener('click', () => _save(status));

    footerStart.append(resetBtn);
    footerEnd.append(status, closeBtn, saveBtn);
    footer.append(footerStart, footerEnd);
    panel.append(header, scroll, footer);
    shell.append(sidebar, panel);
    overlay.appendChild(shell);
    _shadow.appendChild(overlay);

    // Close on backdrop click — disabled in standalone settings page
    if (!document.documentElement.dataset.dpStandalone) {
      overlay.addEventListener('click', e => { if (e.target === overlay) hide(); });
    }

    // ESC to close — disabled in standalone settings page
    if (!document.documentElement.dataset.dpStandalone) {
      document.addEventListener('keydown', _onKeyDown);
    }

    // Animate in
    requestAnimationFrame(() => overlay.classList.add('visible'));
  }

  // ── Tab: Appearance ────────────────────────────────────────────────────
  function _renderAppearanceTab() {
    const tab = _makeTab('appearance');

    // Language
    tab.appendChild(_makeCard(_t('labelLang'), _makeOptionGroup([
      { label: 'English', value: 'en' },
      { label: '中文',    value: 'zh' },
    ], _getSelectedLanguageValue(), v => {
      _settings.language = v;
      applyLangPref(v).then(() => {
        _render();
      }).catch(() => {
        _render();
      });
    })));

    // Theme
    tab.appendChild(_makeCard(_t('labelTheme'), _makeOptionGroupWithHints([
      { label: _t('themeDark'),  value: 'dark',  hint: _t('hintThemeDark')  },
      { label: _t('themeLight'), value: 'light', hint: _t('hintThemeLight') },
    ], _settings?.theme || 'dark', v => {
      _settings.theme = v;
      _syncThemeState(v, _shadow?.querySelector('.gs-settings-theme-badge'), _shadow?.querySelector('.gs-settings-meta'));
    })));

    // Corners
    tab.appendChild(_makeCard(_t('labelCorners'), () => {
      const wrap = document.createDocumentFragment();
      const radiusRow = _makeSliderRow(
        _t('labelCornerRadius'),
        4,
        28,
        _settings?.cornerRadius ?? 16,
        (value) => { _settings.cornerRadius = value; },
        'px'
      );

      const cornersGroup = document.createElement('div');
      cornersGroup.className = 'gs-setting-group';

      const radiusGroup = document.createElement('div');
      radiusGroup.className = 'gs-setting-group';

      const group = _makeOptionGroup([
        { label: _t('cornersRounded'), value: 'rounded' },
        { label: _t('cornersSquare'),  value: 'square'  },
      ], _settings?.corners || 'rounded', v => {
        _settings.corners = v;
        radiusRow.style.opacity = v === 'square' ? '0.5' : '1';
        radiusRow.style.pointerEvents = v === 'square' ? 'none' : '';
      });

      radiusRow.style.opacity = (_settings?.corners || 'rounded') === 'square' ? '0.5' : '1';
      radiusRow.style.pointerEvents = (_settings?.corners || 'rounded') === 'square' ? 'none' : '';

      cornersGroup.appendChild(group);
      cornersGroup.appendChild(_makeHint(_t('hintCorners')));
      radiusGroup.appendChild(radiusRow);
      radiusGroup.appendChild(_makeHint(_t('hintCornerRadius')));

      wrap.appendChild(cornersGroup);
      wrap.appendChild(radiusGroup);
      return wrap;
    }));

    return tab;
  }

  // ── Tab: Preview ───────────────────────────────────────────────────────
  function _renderPreviewTab() {
    const tab = _makeTab('preview');

    // Position — each option has its own hint shown below the group
    const posHints = {
      bottom:     _t('hintPosBottom'),
      top:        _t('hintPosTop'),
      fullscreen: _t('hintPosFullscreen'),
    };
    const posHintEl = _makeHint(posHints[_settings?.dropZonePosition || 'bottom']);

    const posGroup = _makeOptionGroup([
      { label: _t('posBottom'),     value: 'bottom'     },
      { label: _t('posTop'),        value: 'top'        },
      { label: _t('posFullscreen'), value: 'fullscreen' },
    ], _settings?.dropZonePosition || 'bottom', v => {
      _settings.dropZonePosition = v;
      posHintEl.textContent = posHints[v];
      dropSizeBlock.style.display = v === 'fullscreen' ? 'none' : '';
    });

    const posContent = document.createDocumentFragment();
    posContent.appendChild(posGroup);
    posContent.appendChild(posHintEl);

    const dropSizeContent = document.createDocumentFragment();
    dropSizeContent.appendChild(_makeSliderRow(
      _t('labelW'), 100, 1200,
      _settings?.dropZoneCustomSize?.width ?? 300,
      v => {
        _settings.dropZoneCustomSize = _settings.dropZoneCustomSize || {};
        _settings.dropZoneCustomSize.width = v;
      },
      'px'
    ));
    dropSizeContent.appendChild(_makeSliderRow(
      _t('labelH'), 60, 400,
      _settings?.dropZoneCustomSize?.height ?? 150,
      v => {
        _settings.dropZoneCustomSize = _settings.dropZoneCustomSize || {};
        _settings.dropZoneCustomSize.height = v;
      },
      'px'
    ));
    dropSizeContent.appendChild(_makeHint(_t('hintSize')));

    const dropTargetContent = document.createDocumentFragment();
    const dropSizeBlock = _makeLabeledBlock(_t('labelSize'), dropSizeContent);
    if (_settings?.dropZonePosition === 'fullscreen') dropSizeBlock.style.display = 'none';
    dropTargetContent.appendChild(_makeLabeledBlock(_t('labelPos'), posContent));
    dropTargetContent.appendChild(dropSizeBlock);
    tab.appendChild(_makeCard(_t('labelDropTarget'), dropTargetContent, 'gs-card--feature'));

    const windowScale = _resolveDefaultWindowScale(_settings);
    const previewSizeContent = document.createDocumentFragment();
    previewSizeContent.appendChild(_makeSliderRow(
      _t('labelWindowWidth'),
      35,
      92,
      windowScale.width,
      (value) => {
        _settings.defaultWindowScale = _settings.defaultWindowScale || {};
        _settings.defaultWindowScale.width = value;
      },
      '%'
    ));
    previewSizeContent.appendChild(_makeSliderRow(
      _t('labelWindowHeight'),
      35,
      92,
      windowScale.height,
      (value) => {
        _settings.defaultWindowScale = _settings.defaultWindowScale || {};
        _settings.defaultWindowScale.height = value;
      },
      '%'
    ));
    previewSizeContent.appendChild(_makeHint(_t('hintDefaultWindowSize')));

    const maxWindowsContent = document.createDocumentFragment();
    maxWindowsContent.appendChild(_makeSliderRow(
      _t('labelMaxPreviewWindows'),
      1,
      12,
      _settings?.maxPreviewWindows ?? DEFAULT_SETTINGS.maxPreviewWindows,
      (value) => { _settings.maxPreviewWindows = value; },
      ''
    ));
    maxWindowsContent.appendChild(_makeHint(_t('hintMaxPreviewWindows')));

    const offsetContent = document.createDocumentFragment();
    offsetContent.appendChild(_makeSliderRow(
      _t('labelWindowOffset'),
      0,
      64,
      _settings?.newWindowOffset ?? 24,
      (value) => { _settings.newWindowOffset = value; }
    ));
    offsetContent.appendChild(_makeHint(_t('hintWindowOffset')));

    const windowDefaultsContent = document.createDocumentFragment();
    const maxWindowsGroup = document.createElement('div');
    maxWindowsGroup.className = 'gs-setting-group';
    maxWindowsGroup.appendChild(maxWindowsContent);

    const offsetGroup = document.createElement('div');
    offsetGroup.className = 'gs-setting-group';
    offsetGroup.appendChild(offsetContent);

    windowDefaultsContent.appendChild(_makeLabeledBlock(_t('labelDefaultWindowSize'), previewSizeContent));
    windowDefaultsContent.appendChild(maxWindowsGroup);
    windowDefaultsContent.appendChild(offsetGroup);
    tab.appendChild(_makeCard(_t('labelWindowDefaults'), windowDefaultsContent, 'gs-card--feature'));

    const openBehaviorContent = document.createDocumentFragment();
    openBehaviorContent.appendChild(_makeOptionGroup([
      { label: _t('optionOn'), value: true },
      { label: _t('optionOff'), value: false },
    ], _settings?.closePreviewOnOpenNewTab ?? true, (value) => {
      _settings.closePreviewOnOpenNewTab = value;
    }));
    openBehaviorContent.appendChild(_makeHint(_t('hintClosePreviewOnOpenNewTab')));

    const headerActionsContent = document.createDocumentFragment();

    const closeOthersContent = document.createElement('div');
    closeOthersContent.className = 'gs-option-hint-group';
    closeOthersContent.appendChild(_makeOptionGroup([
      { label: _t('optionOn'), value: true },
      { label: _t('optionOff'), value: false },
    ], _settings?.showCloseOthersButton ?? true, (value) => {
      _settings.showCloseOthersButton = value;
    }));
    closeOthersContent.appendChild(_makeHint(_t('hintShowCloseOthersButton')));
    headerActionsContent.appendChild(_makeLabeledBlock(_t('labelShowCloseOthersButton'), closeOthersContent));

    const closeAllContent = document.createElement('div');
    closeAllContent.className = 'gs-option-hint-group';
    closeAllContent.appendChild(_makeOptionGroup([
      { label: _t('optionOn'), value: true },
      { label: _t('optionOff'), value: false },
    ], _settings?.showCloseAllButton ?? true, (value) => {
      _settings.showCloseAllButton = value;
    }));
    closeAllContent.appendChild(_makeHint(_t('hintShowCloseAllButton')));
    headerActionsContent.appendChild(_makeLabeledBlock(_t('labelShowCloseAllButton'), closeAllContent));

    const advancedContent = document.createDocumentFragment();
    advancedContent.appendChild(_makeLabeledBlock(_t('labelClosePreviewOnOpenNewTab'), openBehaviorContent));
    advancedContent.appendChild(_makeLabeledBlock(_t('labelHeaderActions'), headerActionsContent));
    tab.appendChild(_makeCard(_t('labelAdvancedPreview'), advancedContent, 'gs-card--feature'));

    return tab;
  }

  function _renderBlacklistTab() {
    const tab = _makeTab('blacklist');
    const currentDomain = _getCurrentPageDomain();
    const domains = _getBlacklistDomains();
    const currentDomainBlocked = !!currentDomain && domains.includes(currentDomain);
    const manualDraftEmpty = !String(_blacklistDraft || '').trim();

    const quickActions = document.createDocumentFragment();

    const currentDomainBlock = document.createElement('div');
    currentDomainBlock.className = 'gs-setting-group';

    const currentDomainLabel = document.createElement('div');
    currentDomainLabel.className = 'gs-field-label';
    currentDomainLabel.textContent = _t('labelCurrentDomain');

    const currentDomainRow = document.createElement('div');
    currentDomainRow.className = 'gs-blacklist-input-row';

    const currentDomainValue = document.createElement('div');
    currentDomainValue.className = 'gs-blacklist-domain-chip';
    currentDomainValue.textContent = currentDomain || _t('blacklistCurrentDomainUnavailable');

    const addCurrentButton = document.createElement('button');
    addCurrentButton.className = 'gs-btn gs-btn-secondary gs-btn-small';
    addCurrentButton.type = 'button';
    addCurrentButton.textContent = _t('btnAddCurrentDomain');
    addCurrentButton.disabled = !currentDomain || currentDomainBlocked;
    addCurrentButton.addEventListener('click', () => {
      _addBlacklistDomain(currentDomain, 'blacklistCurrentDomainAdded');
      _render();
    });

    currentDomainRow.append(currentDomainValue, addCurrentButton);
    currentDomainBlock.append(currentDomainLabel, currentDomainRow, _makeHint(currentDomain ? _t('hintBlacklistCurrentDomain') : _t('blacklistCurrentDomainUnavailable')));
    quickActions.appendChild(currentDomainBlock);

    const manualBlock = document.createElement('div');
    manualBlock.className = 'gs-setting-group';

    const manualLabel = document.createElement('div');
    manualLabel.className = 'gs-field-label';
    manualLabel.textContent = _t('labelBlacklistDomains');

    const manualRow = document.createElement('div');
    manualRow.className = 'gs-blacklist-input-row';

    const manualInput = document.createElement('input');
    manualInput.className = 'gs-text-input';
    manualInput.type = 'text';
    manualInput.inputMode = 'url';
    manualInput.autocomplete = 'off';
    manualInput.autocapitalize = 'none';
    manualInput.spellcheck = false;
    manualInput.placeholder = _t('placeholderBlacklistDomain');
    manualInput.value = _blacklistDraft;
    manualInput.addEventListener('input', () => {
      _blacklistDraft = manualInput.value;
      addButton.disabled = !String(manualInput.value || '').trim();
      _setBlacklistNotice(null);
    });
    manualInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        _addBlacklistDomain(_blacklistDraft);
        _render();
      }
    });

    const addButton = document.createElement('button');
    addButton.className = 'gs-btn gs-btn-primary gs-btn-small';
    addButton.type = 'button';
    addButton.textContent = _t('btnAddDomain');
    addButton.disabled = manualDraftEmpty;
    addButton.addEventListener('click', () => {
      _addBlacklistDomain(_blacklistDraft);
      _render();
    });

    manualRow.append(manualInput, addButton);
    manualBlock.append(manualLabel, manualRow, _makeHint(_t('hintBlacklistExactMatch')));
    quickActions.appendChild(manualBlock);

    if (_blacklistNotice) {
      const notice = document.createElement('div');
      notice.className = `gs-blacklist-notice is-${_blacklistNotice.tone}`;
      notice.textContent = _t(_blacklistNotice.key);
      quickActions.appendChild(notice);
    }

    tab.appendChild(_makeCard(_t('labelBlacklistControls'), quickActions, 'gs-card--feature'));

    tab.appendChild(_makeCard(_t('labelBlacklistDomains'), () => {
      const fragment = document.createDocumentFragment();
      const list = document.createElement('div');
      list.className = 'gs-blacklist-list';

      if (!domains.length) {
        const empty = document.createElement('div');
        empty.className = 'gs-blacklist-empty';
        empty.textContent = _t('blacklistListEmpty');
        list.appendChild(empty);
      }

      domains.forEach((domain, index) => {
        const row = document.createElement('div');
        row.className = 'gs-blacklist-row';
        const isEditing = _blacklistEditingIndex === index;
        const editDraftEmpty = !String(_blacklistEditDraft || '').trim();
        let saveButton = null;

        const main = document.createElement('div');
        main.className = 'gs-blacklist-row-main';

        if (isEditing) {
          const editInput = document.createElement('input');
          editInput.className = 'gs-text-input';
          editInput.type = 'text';
          editInput.inputMode = 'url';
          editInput.autocomplete = 'off';
          editInput.autocapitalize = 'none';
          editInput.spellcheck = false;
          editInput.value = _blacklistEditDraft;
          editInput.addEventListener('input', () => {
            _blacklistEditDraft = editInput.value;
            if (saveButton) {
              saveButton.disabled = !String(editInput.value || '').trim();
            }
            _setBlacklistNotice(null);
          });
          editInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              _updateBlacklistDomain(index, _blacklistEditDraft);
              _render();
            }
          });
          main.appendChild(editInput);
        } else {
          const domainText = document.createElement('div');
          domainText.className = 'gs-blacklist-domain';
          domainText.textContent = domain;
          main.appendChild(domainText);

          if (currentDomain && currentDomain === domain) {
            const badge = document.createElement('div');
            badge.className = 'gs-blacklist-domain-tag';
            badge.textContent = _t('blacklistCurrentSiteBadge');
            main.appendChild(badge);
          }
        }

        const actions = document.createElement('div');
        actions.className = 'gs-blacklist-actions';

        if (isEditing) {
          saveButton = document.createElement('button');
          saveButton.className = 'gs-btn gs-btn-primary gs-btn-small';
          saveButton.type = 'button';
          saveButton.textContent = _t('btnSave');
          saveButton.disabled = editDraftEmpty;
          saveButton.addEventListener('click', () => {
            _updateBlacklistDomain(index, _blacklistEditDraft);
            _render();
          });

          const cancelButton = document.createElement('button');
          cancelButton.className = 'gs-btn gs-btn-secondary gs-btn-small';
          cancelButton.type = 'button';
          cancelButton.textContent = _t('btnCancel');
          cancelButton.addEventListener('click', () => {
            _blacklistEditingIndex = -1;
            _blacklistEditDraft = '';
            _setBlacklistNotice(null);
            _render();
          });

          actions.append(saveButton, cancelButton);
        } else {
          const editButton = document.createElement('button');
          editButton.className = 'gs-btn gs-btn-secondary gs-btn-small';
          editButton.type = 'button';
          editButton.textContent = _t('btnEdit');
          editButton.addEventListener('click', () => {
            _blacklistEditingIndex = index;
            _blacklistEditDraft = domain;
            _setBlacklistNotice(null);
            _render();
          });

          const deleteButton = document.createElement('button');
          deleteButton.className = 'gs-btn gs-btn-secondary gs-btn-small gs-btn-danger-soft';
          deleteButton.type = 'button';
          deleteButton.textContent = _t('btnDelete');
          deleteButton.addEventListener('click', () => {
            _removeBlacklistDomain(index);
            _render();
          });

          actions.append(editButton, deleteButton);
        }

        row.append(main, actions);
        list.appendChild(row);
      });

      fragment.append(list);
      fragment.appendChild(_makeHint(_t('hintBlacklistList')));
      return fragment;
    }, 'gs-card--feature'));

    return tab;
  }

  function _renderAboutTab() {
    const tab = _makeTab('about');
    const about = _getAboutInfo();

    tab.appendChild(_makeCard('', () => {
      const content = document.createElement('div');
      content.className = 'gs-settings-about-content';

      const header = document.createElement('div');
      header.className = 'gs-settings-about-header';

      const nameBlock = document.createElement('div');
      nameBlock.className = 'gs-settings-about-name-block';

      const name = document.createElement('div');
      name.className = 'gs-settings-about-name';
      name.textContent = about.name;

      nameBlock.append(name);
      header.append(nameBlock);

      const desc = document.createElement('div');
      desc.className = 'gs-settings-about-desc';
      desc.textContent = about.description;

      const details = document.createElement('div');
      details.className = 'gs-settings-about-details';

      [
        { label: _t('aboutVersion'), value: `v${about.version}`, link: about.releaseLink },
        { label: _t('aboutAuthor'), value: about.author, link: about.authorLink },
        { label: _t('aboutHomepage'), value: about.homepage || '—', link: about.homepage || '' },
      ].forEach(({ label, value, link }) => {
        const row = document.createElement('div');
        row.className = 'gs-settings-about-row';

        const labelEl = document.createElement('div');
        labelEl.className = 'gs-settings-about-label';
        labelEl.textContent = label;

        const valueEl = link ? document.createElement('a') : document.createElement('div');
        valueEl.className = link ? 'gs-settings-about-value gs-settings-about-link' : 'gs-settings-about-value';
        valueEl.textContent = value;

        if (link) {
          valueEl.href = link;
          valueEl.target = '_blank';
          valueEl.rel = 'noopener noreferrer';
        }

        row.append(labelEl, valueEl);
        details.appendChild(row);
      });

      content.append(header, desc, details);
      return content;
    }, 'gs-card--about gs-card--feature'));

    return tab;
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  function _makeTab(key) {
    const div = document.createElement('div');
    div.className = 'gs-settings-section' + (_activeTab === key ? ' active' : '');
    div.dataset.tab = key;
    return div;
  }

  function _makeMetaItem(label, value, tone = '') {
    const item = document.createElement('div');
    item.className = 'gs-settings-meta-item';

    const labelEl = document.createElement('div');
    labelEl.className = 'gs-settings-meta-label';
    labelEl.textContent = label;

    const valueEl = document.createElement('div');
    valueEl.className = `gs-settings-meta-value${tone ? ` is-${tone}` : ''}`;
    valueEl.textContent = value;

    item.append(labelEl, valueEl);
    return item;
  }

  function _makeCard(titleText, content, className = '') {
    const card = document.createElement('div');
    card.className = `gs-card${className ? ` ${className}` : ''}`;
    const contentWrap = document.createElement('div');
    contentWrap.className = 'gs-card-content';
    if (titleText) {
      const t = document.createElement('div');
      t.className = 'gs-card-title';
      t.textContent = titleText;
      card.appendChild(t);
    }
    if (typeof content === 'function') {
      const result = content();
      if (result instanceof DocumentFragment || result instanceof Node) {
        contentWrap.appendChild(result);
      }
    } else if (content instanceof Node) {
      contentWrap.appendChild(content);
    } else if (content instanceof DocumentFragment) {
      contentWrap.appendChild(content);
    }
    card.appendChild(contentWrap);
    return card;
  }

  function _makeHint(text) {
    const el = document.createElement('div');
    el.className = 'gs-field-hint';
    el.textContent = text;
    return el;
  }

  function _makeLabeledBlock(label, content) {
    const block = document.createElement('div');
    block.className = 'gs-setting-group';

    const title = document.createElement('div');
    title.className = 'gs-field-label';
    title.textContent = label;

    block.appendChild(title);
    block.appendChild(content);
    return block;
  }

  function _makeSliderRow(label, min, max, value, onChange, unit = 'px') {
    const row = document.createElement('div');
    row.className = 'gs-slider-row';

    const header = document.createElement('div');
    header.className = 'gs-slider-header';

    const lbl = document.createElement('span');
    lbl.className = 'gs-field-label';
    lbl.textContent = label;

    const val = document.createElement('span');
    val.className = 'gs-value-chip';
    val.textContent = unit ? `${value} ${unit}` : String(value);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'gs-slider';
    slider.min = String(min);
    slider.max = String(max);
    slider.value = String(value);
    slider.addEventListener('input', () => {
      const next = parseInt(slider.value, 10);
      val.textContent = unit ? `${next} ${unit}` : String(next);
      onChange(next);
    });

    header.append(lbl, val);
    row.append(header, slider);
    return row;
  }

  // Option group where each option shows a per-option hint below when active
  function _makeOptionGroupWithHints(options, currentValue, onChange) {
    const wrap = document.createElement('div');
    wrap.className = 'gs-option-hint-group';

    const group = document.createElement('div');
    group.className = 'gs-option-group';

    const hintEl = _makeHint(options.find(o => o.value === currentValue)?.hint ?? '');

    options.forEach(({ label, value, hint }) => {
      const btn = document.createElement('button');
      btn.className = 'gs-option-btn' + (value === currentValue ? ' active' : '');
      btn.textContent = label;
      btn.addEventListener('click', () => {
        group.querySelectorAll('.gs-option-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        hintEl.textContent = hint;
        onChange(value);
      });
      group.appendChild(btn);
    });

    wrap.appendChild(group);
    wrap.appendChild(hintEl);
    return wrap;
  }

  function _makeOptionGroup(options, currentValue, onChange) {
    const group = document.createElement('div');
    group.className = 'gs-option-group';
    options.forEach(({ label, value }) => {
      const btn = document.createElement('button');
      btn.className = 'gs-option-btn' + (value === currentValue ? ' active' : '');
      btn.textContent = label;
      btn.addEventListener('click', () => {
        group.querySelectorAll('.gs-option-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onChange(value);
      });
      group.appendChild(btn);
    });
    return group;
  }

  // ── Save ───────────────────────────────────────────────────────────────
  async function _save(statusEl) {
    try {
      delete _settings.controlBarSide;
      _settings.blacklistDomains = _normalizeBlacklistDomains(_settings.blacklistDomains);
      await nativeAPI.storage.sync.set(_settings);
      statusEl.textContent = _t('saved');
      statusEl.className = 'gs-settings-status visible';
      setTimeout(() => { statusEl.className = 'gs-settings-status'; }, 2000);
      if (_settings?.debug) {
        console.log('[Glimpser]', 'settings saved');
      }
    } catch (e) {
      statusEl.textContent = _t('saveFailed');
      statusEl.className = 'gs-settings-status visible error';
      if (_settings?.debug) {
        console.log('[Glimpser]', 'settings save failed', e);
      }
    }
  }

  // ── ESC handler ────────────────────────────────────────────────────────
  function _onKeyDown(e) {
    if (e.key === 'Escape') hide();
  }

  // ── Public API ─────────────────────────────────────────────────────────
  async function show() {
    // Load fresh settings
    try {
      _settings = await nativeAPI.storage.sync.get(DEFAULT_SETTINGS);
      _settings.blacklistDomains = _normalizeBlacklistDomains(_settings.blacklistDomains);
    } catch (e) {
      _settings = _cloneDefaultSettings();
    }

    _resetBlacklistEditor();
    _setBlacklistNotice(null);

    await applyLangPref(_settings?.language);

    // Auto-detect theme on first use
    if (!_settings.theme) {
      _settings.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    if (!_host) {
      await _buildPanel();
    } else {
      _render();
    }
    _lockPageScroll();
    document.documentElement.classList.add('gs-settings-open');
  }

  function hide() {
    document.removeEventListener('keydown', _onKeyDown);
    document.documentElement.classList.remove('gs-settings-open');
    _unlockPageScroll();
    const overlay = _shadow?.querySelector('.gs-settings-overlay');
    if (!overlay) return;
    overlay.classList.remove('visible');
    setTimeout(() => {
      if (_host) {
        _host.remove();
        _host = null;
        _shadow = null;
      }
    }, 300);
  }

  function toggle() {
    if (_host && document.documentElement.contains(_host)) {
      hide();
    } else {
      show();
    }
  }

  // Expose for content.js
  window.__gsSettingsPanel = { toggle, show, hide };

  if (document.documentElement.dataset.dpStandalone) {
    nativeAPI.storage.sync.get({ theme: null }).then(({ theme }) => {
      const resolved = theme === 'light'
        ? 'light'
        : theme === 'dark'
          ? 'dark'
          : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.body.setAttribute('data-dp-theme', resolved);
    }).catch(() => {});

    show();
  }
})();
