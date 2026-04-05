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
  const BRAND_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 0C4.492 2.746-.885 11.312.502 19.963C.502 19.963 4.989 24 12 24s11.496-4.037 11.496-4.037C24.882 11.312 19.508 2.746 12 0m0 1.846s2.032.726 3.945 2.488c.073.067.13.163.129.277c-.001.168-.128.287-.301.287a.5.5 0 0 1-.137-.027a6.5 6.5 0 0 0-2.316-.4a6.63 6.63 0 0 0-3.914 1.273l-.002.002a7.98 7.98 0 0 1 6.808.768C20.48 9.11 22.597 14.179 21.902 19c0 0-1.646 1.396-4.129 2.172a.37.37 0 0 1-.303-.026c-.144-.084-.185-.255-.1-.404a.5.5 0 0 1 .094-.103a6.6 6.6 0 0 0 1.504-1.809a6.63 6.63 0 0 0 .856-4.027l-.002-.002a7.95 7.95 0 0 1-3.838 5.383c-4.42 2.552-9.99 1.882-13.885-1.184c0 0-.388-2.124.182-4.662a.37.37 0 0 1 .176-.25c.145-.084.31-.033.396.117a.5.5 0 0 1 .045.13c.126.762.405 1.5.814 2.208a6.64 6.64 0 0 0 3.059 2.756a8 8 0 0 1-1.672-2.033a7.93 7.93 0 0 1-1.066-4.205C4.128 8.047 7.464 3.659 12 1.846m0 7.623c-2.726 0-5.117.93-6.483 2.332c-.064.32-.1.65-.1.984c0 3.146 2.947 5.695 6.583 5.695c3.635 0 6.584-2.549 6.584-5.695c0-.334-.038-.664-.102-.984C17.116 10.4 14.724 9.469 12 9.469m0 .693a3.12 3.12 0 0 1 0 6.238a3.118 3.118 0 0 1-2.872-4.336a1.3 1.3 0 1 0 1.657-1.656A3.1 3.1 0 0 1 12 10.162"/></svg>`;

  // ── Tab definitions ────────────────────────────────────────────────────
  const TABS = [
    {
      key: 'appearance',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" d="m7.533 11.862l.01-.003m5.581 7.143c-.5.515-.92.847-1.06.89c-.48.145-5.43-1.28-6.238-3.33c-.81-2.051-1.831-5.816-1.89-6.22c-.06-.404 1.56-1.724 3.597-2.61m1.989 8.055c-.227.262-.39.56-.556.847M13.5 12c.5.5 1 1.049 2 1.049S17 12.5 17.5 12m-4-4h.01m3.99 0h.01M10.5 5.5c0-.29 2.5-1.5 5-1.5s5 1.136 5 1.5V12c0 1.966-4.291 5-5 5c-.743 0-5-3.034-5-5z"/></svg>',
    },
    {
      key: 'dropzone',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 11.5h13m-13 0V18a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-6.5m-13 0V9a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v2.5M9 5h11a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-1"/></svg>',
    },
    {
      key: 'preview',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.005 11.19V12l6.998 4.042L19 12v-.81M5 16.15v.81L11.997 21l6.998-4.042v-.81M12.003 3L5.005 7.042l6.998 4.042L19 7.042z"/></svg>',
    },
    {
      key: 'about',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.714 15h4.268c.404 0 .732-.384.732-.857V3.857c0-.473-.328-.857-.732-.857H6.714a1 1 0 0 0-1 1v4m11 7v-3h3v3zm-3 6h-7a1 1 0 0 1-1-1a3 3 0 0 1 3-3h3a3 3 0 0 1 3 3a1 1 0 0 1-1 1m-1-9.5a2.5 2.5 0 1 1-5 0a2.5 2.5 0 0 1 5 0"/></svg>',
    },
  ];

  const DEFAULT_SETTINGS = {
    dropZonePosition:   'bottom',
    dropZoneCustomSize: { width: 300, height: 150 },
    defaultWindowScale: { width: 75, height: 82 },
    maxPreviewWindows:  6,
    newWindowOffset:    24,
    closePreviewOnOpenNewTab: true,
    showCloseOthersButton: true,
    showCloseAllButton: true,
    language:           null,
    theme:              null,
    corners:            'rounded',
    cornerRadius:       16,
    debug:              false,
  };

  // ── Panel singleton ────────────────────────────────────────────────────
  let _host = null;
  let _shadow = null;
  let _activeTab = 'appearance';
  let _settings = null;
  let _scrollLockState = null;

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

  function _getTabDescription(key) {
    switch (key) {
      case 'appearance':
        return `${_t('labelTheme')} · ${_t('labelLang')} · ${_t('labelCorners')}`;
      case 'dropzone':
        return `${_t('labelPos')} · ${_t('labelSize')}`;
      case 'preview':
        return `${_t('labelDefaultWindowSize')} · ${_t('labelMaxPreviewWindows')} · ${_t('labelHeaderActions')}`;
      case 'about':
        return _t('aboutDescText');
      default:
        return _t('aboutDescText');
    }
  }

  function _getSummaryItems() {
    return [
      { label: _t('labelTheme'), value: _getActiveThemeLabel() },
      { label: _t('labelLang'), value: _settings?.language === 'zh' ? '中文' : 'English' },
      { label: _t('labelPos'), value: _t(`pos${(_settings?.dropZonePosition || 'bottom').charAt(0).toUpperCase()}${(_settings?.dropZonePosition || 'bottom').slice(1)}`) },
      { label: _t('labelMaxPreviewWindows'), value: String(_settings?.maxPreviewWindows ?? DEFAULT_SETTINGS.maxPreviewWindows) },
    ];
  }

  function _syncHeaderState(sectionKicker, subtitle) {
    if (sectionKicker) {
      sectionKicker.textContent = _getTabLabel(_activeTab);
    }
    if (subtitle) {
      subtitle.textContent = _getTabDescription(_activeTab);
    }
  }

  function _cloneDefaultSettings() {
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }

  async function _loadCssText(paths) {
    const cssChunks = await Promise.all(
      paths.map(async (path) => {
        const cssUrl = nativeAPI.runtime.getURL(path);
        return fetch(cssUrl).then(r => r.text());
      })
    );

    return cssChunks.join('\n\n');
  }

  // ── Build Shadow DOM ───────────────────────────────────────────────────
  async function _buildPanel() {
    let cssText = '';
    try {
      cssText = await _loadCssText([
        'css/foundation.css',
        'css/settings.css',
      ]);
    } catch (e) {
      console.warn('[Glimpser] Failed to load settings CSS', e);
    }

    _host = document.createElement('div');
    _host.id = HOST_ID;
    _host.style.position = 'fixed';
    _host.style.inset = '0';
    _host.style.zIndex = '2147483640';
    _host.style.pointerEvents = 'none';
    document.documentElement.appendChild(_host);

    _shadow = _host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = cssText;
    _shadow.appendChild(style);

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
    // Remove old content except style
    const style = _shadow.querySelector('style');
    _shadow.innerHTML = '';
    _shadow.appendChild(style);

    const theme = _settings?.theme || 'dark';
    _host.setAttribute('data-dp-theme', theme);

    // Apply theme to shadow host
    const shadowHost = _shadow.host;
    shadowHost.setAttribute('data-dp-theme', theme);

    // In standalone mode, sync body background
    if (document.documentElement.dataset.dpStandalone) {
      document.body.setAttribute('data-dp-theme', theme);
    }

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

    const brandBadge = document.createElement('div');
    brandBadge.className = 'gs-settings-brand-badge';
    brandBadge.innerHTML = BRAND_ICON_SVG;

    const brandText = document.createElement('div');
    brandText.className = 'gs-settings-brand-copy';

    const brandEyebrow = document.createElement('div');
    brandEyebrow.className = 'gs-settings-brand-eyebrow';
    brandEyebrow.textContent = 'GLIMPSER';

    const brandTitle = document.createElement('div');
    brandTitle.className = 'gs-settings-brand-title';
    brandTitle.textContent = _t('settingsTitle');

    const brandHint = document.createElement('div');
    brandHint.className = 'gs-settings-brand-hint';
    brandHint.textContent = _t('aboutDescText');

    brandText.append(brandEyebrow, brandTitle, brandHint);
    brand.append(sidebarGlow, brandBadge, brandText);

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
        _syncHeaderState(sectionKicker, subtitle);
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

    const sectionKicker = document.createElement('div');
    sectionKicker.className = 'gs-settings-kicker';
    sectionKicker.textContent = _getTabLabel(_activeTab);

    const title = document.createElement('div');
    title.className = 'gs-settings-title';
    title.textContent = _t('settingsTitle');

    const subtitle = document.createElement('div');
    subtitle.className = 'gs-settings-subtitle';
    subtitle.textContent = _getTabDescription(_activeTab);

    titleGroup.append(sectionKicker, title, subtitle);

    const themeBadge = document.createElement('div');
    themeBadge.className = 'gs-settings-theme-badge';
    themeBadge.innerHTML = `
      <span class="gs-settings-theme-swatch" data-theme="${_settings?.theme || 'dark'}"></span>
      <span>${_getActiveThemeLabel()}</span>
    `;

    headerTop.append(titleGroup, themeBadge);

    const summaryGrid = document.createElement('div');
    summaryGrid.className = 'gs-settings-summary';
    _getSummaryItems().forEach(({ label, value }) => {
      summaryGrid.appendChild(_makeSummaryItem(label, value));
    });

    header.append(headerTop, summaryGrid);

    const scroll = document.createElement('div');
    scroll.className = 'gs-settings-scroll';

    scroll.appendChild(_renderAppearanceTab());
    scroll.appendChild(_renderDropzoneTab());
    scroll.appendChild(_renderPreviewTab());
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
    ], _settings?.language === 'zh' ? 'zh' : 'en', v => {
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
      _shadow.host.setAttribute('data-dp-theme', v);
      if (document.documentElement.dataset.dpStandalone) {
        document.body.setAttribute('data-dp-theme', v);
      }
    })));

    // Debug logging
    tab.appendChild(_makeCard(_t('labelDebug'), () => {
      const wrap = document.createDocumentFragment();
      wrap.appendChild(_makeOptionGroup([
        { label: _t('debugOn'),  value: true  },
        { label: _t('debugOff'), value: false },
      ], _settings?.debug ?? false, v => { _settings.debug = v; }));
      wrap.appendChild(_makeHint(_t('hintDebug')));
      return wrap;
    }));

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

  // ── Tab: Drop Zone ─────────────────────────────────────────────────────
  function _renderDropzoneTab() {
    const tab = _makeTab('dropzone');

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
      sizeCard.style.display = v === 'fullscreen' ? 'none' : '';
    });

    const posContent = document.createDocumentFragment();
    posContent.appendChild(posGroup);
    posContent.appendChild(posHintEl);
    tab.appendChild(_makeCard(_t('labelPos'), posContent, 'gs-card--feature'));

    const sizeContent = document.createDocumentFragment();
    sizeContent.appendChild(_makeSliderRow(
      _t('labelW'), 100, 1200,
      _settings?.dropZoneCustomSize?.width ?? 300,
      v => { _settings.dropZoneCustomSize.width = v; },
      'px'
    ));
    sizeContent.appendChild(_makeSliderRow(
      _t('labelH'), 60, 400,
      _settings?.dropZoneCustomSize?.height ?? 150,
      v => { _settings.dropZoneCustomSize.height = v; },
      'px'
    ));
    sizeContent.appendChild(_makeHint(_t('hintSize')));

    const sizeCard = _makeCard(_t('labelSize'), sizeContent);
    if (_settings?.dropZonePosition === 'fullscreen') sizeCard.style.display = 'none';
    tab.appendChild(sizeCard);

    return tab;
  }

  // ── Tab: About ─────────────────────────────────────────────────────────
  function _renderAboutTab() {
    const tab = _makeTab('about');

    // Get version from manifest via runtime
    const manifest = nativeAPI.runtime.getManifest();
    const version    = manifest.version      || '—';
    const author     = manifest.author       || '—';
    const authorUrl  = 'https://github.com/ffainy';
    const homepage   = manifest.homepage_url || '';
    const releaseLink = homepage ? `${homepage.replace(/\/$/, '')}/releases/tag/v${version}` : '';

    const card = document.createElement('div');
    card.className = 'gs-card gs-card--about';
    const content = document.createElement('div');
    content.className = 'gs-card-content gs-settings-about-content';

    // Extension name + logo row
    const nameRow = document.createElement('div');
    nameRow.className = 'gs-settings-about-header';

    const logo = document.createElement('div');
    logo.className = 'gs-settings-about-logo';
    logo.innerHTML = BRAND_ICON_SVG;

    const nameBlock = document.createElement('div');
    nameBlock.className = 'gs-settings-about-name-block';

    const extName = document.createElement('div');
    extName.className = 'gs-settings-about-name';
    extName.textContent = 'Glimpser';

    nameBlock.append(extName);
    nameRow.append(logo, nameBlock);
    content.appendChild(nameRow);

    // Description
    const desc = document.createElement('div');
    desc.className = 'gs-settings-about-desc';
    desc.textContent = _t('aboutDescText');
    content.appendChild(desc);

    // Info rows — values use accent color
    const rows = [
      { label: _t('aboutVersion'),  value: `v${version}`, link: releaseLink },
      { label: _t('aboutAuthor'),   value: author,         link: authorUrl  },
      { label: _t('aboutHomepage'), value: homepage,       link: homepage   },
    ];

    rows.forEach(({ label, value, link }) => {
      const row = document.createElement('div');
      row.className = 'gs-settings-about-row';

      const lbl = document.createElement('span');
      lbl.className = 'gs-settings-about-label';
      lbl.textContent = label;

      const val = link ? document.createElement('a') : document.createElement('span');
      val.className = link ? 'gs-settings-about-value gs-settings-about-link' : 'gs-settings-about-value';
      val.textContent = value;
      if (link) {
        val.href = link;
        val.target = '_blank';
        val.rel = 'noopener noreferrer';
      }

      row.append(lbl, val);
      content.appendChild(row);
    });

    card.appendChild(content);
    tab.appendChild(card);
    return tab;
  }

  // ── Tab: Preview ───────────────────────────────────────────────────────
  function _renderPreviewTab() {
    const tab = _makeTab('preview');
    const windowScale = _resolveDefaultWindowScale(_settings);
    const sizeContent = document.createDocumentFragment();
    sizeContent.appendChild(_makeSliderRow(
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
    sizeContent.appendChild(_makeSliderRow(
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
    sizeContent.appendChild(_makeHint(_t('hintDefaultWindowSize')));

    tab.appendChild(_makeCard(_t('labelDefaultWindowSize'), sizeContent));

    const maxWindowsContent = document.createDocumentFragment();
    maxWindowsContent.appendChild(_makeSliderRow(
      _t('labelMaxPreviewWindows'),
      1,
      12,
      _settings?.maxPreviewWindows ?? 6,
      (value) => { _settings.maxPreviewWindows = value; },
      ''
    ));
    maxWindowsContent.appendChild(_makeHint(_t('hintMaxPreviewWindows')));
    tab.appendChild(_makeCard(_t('labelMaxPreviewWindows'), maxWindowsContent));

    const offsetContent = document.createDocumentFragment();
    offsetContent.appendChild(_makeSliderRow(
      _t('labelWindowOffset'),
      0,
      64,
      _settings?.newWindowOffset ?? 24,
      (value) => { _settings.newWindowOffset = value; }
    ));
    offsetContent.appendChild(_makeHint(_t('hintWindowOffset')));
    tab.appendChild(_makeCard(_t('labelWindowOffset'), offsetContent));

    const openBehaviorContent = document.createDocumentFragment();
    openBehaviorContent.appendChild(_makeOptionGroup([
      { label: _t('debugOn'), value: true },
      { label: _t('debugOff'), value: false },
    ], _settings?.closePreviewOnOpenNewTab ?? true, (value) => {
      _settings.closePreviewOnOpenNewTab = value;
    }));
    openBehaviorContent.appendChild(_makeHint(_t('hintClosePreviewOnOpenNewTab')));
    tab.appendChild(_makeCard(_t('labelClosePreviewOnOpenNewTab'), openBehaviorContent));

    const headerActionsContent = document.createDocumentFragment();

    const closeOthersContent = document.createElement('div');
    closeOthersContent.className = 'gs-option-hint-group';
    closeOthersContent.appendChild(_makeOptionGroup([
      { label: _t('debugOn'), value: true },
      { label: _t('debugOff'), value: false },
    ], _settings?.showCloseOthersButton ?? true, (value) => {
      _settings.showCloseOthersButton = value;
    }));
    closeOthersContent.appendChild(_makeHint(_t('hintShowCloseOthersButton')));
    headerActionsContent.appendChild(_makeLabeledBlock(_t('labelShowCloseOthersButton'), closeOthersContent));

    const closeAllContent = document.createElement('div');
    closeAllContent.className = 'gs-option-hint-group';
    closeAllContent.appendChild(_makeOptionGroup([
      { label: _t('debugOn'), value: true },
      { label: _t('debugOff'), value: false },
    ], _settings?.showCloseAllButton ?? true, (value) => {
      _settings.showCloseAllButton = value;
    }));
    closeAllContent.appendChild(_makeHint(_t('hintShowCloseAllButton')));
    headerActionsContent.appendChild(_makeLabeledBlock(_t('labelShowCloseAllButton'), closeAllContent));

    tab.appendChild(_makeCard(_t('labelHeaderActions'), headerActionsContent));

    return tab;
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  function _makeTab(key) {
    const div = document.createElement('div');
    div.className = 'gs-settings-section' + (_activeTab === key ? ' active' : '');
    div.dataset.tab = key;
    return div;
  }

  function _makeSummaryItem(label, value) {
    const item = document.createElement('div');
    item.className = 'gs-settings-summary-item';

    const labelEl = document.createElement('div');
    labelEl.className = 'gs-settings-summary-label';
    labelEl.textContent = label;

    const valueEl = document.createElement('div');
    valueEl.className = 'gs-settings-summary-value';
    valueEl.textContent = value;

    item.append(labelEl, valueEl);
    return item;
  }

  function _makeCard(titleText, content, className = '') {
    const card = document.createElement('div');
    card.className = `gs-card${className ? ` ${className}` : ''}`;
    const t = document.createElement('div');
    t.className = 'gs-card-title';
    t.textContent = titleText;
    const contentWrap = document.createElement('div');
    contentWrap.className = 'gs-card-content';
    card.appendChild(t);
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
    } catch (e) {
      _settings = _cloneDefaultSettings();
    }

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
