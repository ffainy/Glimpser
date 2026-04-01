// settings-panel.js — In-page settings panel (Shadow DOM)
// Injected by content.js; communicates with storage directly.

/* global browser, chrome */

(function () {
  'use strict';

  const nativeAPI = typeof browser !== 'undefined' ? browser : chrome;
  const HOST_ID   = 'glimpser-settings-host';

  // ── Tab definitions ────────────────────────────────────────────────────
  const TABS = [
    {
      key: 'appearance',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M14.4 3.419a.639.639 0 0 1 1.2 0l.61 1.668a9.59 9.59 0 0 0 5.703 5.703l1.668.61a.639.639 0 0 1 0 1.2l-1.668.61a9.59 9.59 0 0 0-5.703 5.703l-.61 1.668a.639.639 0 0 1-1.2 0l-.61-1.668a9.59 9.59 0 0 0-5.703-5.703l-1.668-.61a.639.639 0 0 1 0-1.2l1.668-.61a9.59 9.59 0 0 0 5.703-5.703zM8 16.675a.266.266 0 0 1 .5 0l.254.694a4 4 0 0 0 2.376 2.377l.695.254a.266.266 0 0 1 0 .5l-.695.254a4 4 0 0 0-2.376 2.377l-.254.694a.266.266 0 0 1-.5 0l-.254-.694a4 4 0 0 0-2.376-2.377l-.695-.254a.266.266 0 0 1 0-.5l.695-.254a4 4 0 0 0 2.376-2.377z"/></svg>',
    },
    {
      key: 'dropzone',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m0 18a8 8 0 1 1 8-8a8 8 0 0 1-8 8m-1-5h2v2h-2zm0-8h2v6h-2z"/></svg>',
    },
    {
      key: 'preview',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M3 3h18v18H3zm2 2v14h14V5zm2 2h10v2H7zm0 4h10v2H7zm0 4h7v2H7z"/></svg>',
    },
    {
      key: 'about',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m1 15h-2v-6h2zm0-8h-2V7h2z"/></svg>',
    },
  ];

  // ── i18n labels ────────────────────────────────────────────────────────
  const LABELS = {
    en: {
      title:          'Glimpser Settings',
      tabAppearance:  'Appearance',
      tabDropzone:    'Drop Zone',
      tabPreview:     'Preview',
      tabAbout:       'About',
      labelTheme:     'Theme',
      themeDark:      'Dark',
      themeLight:     'Light',
      hintThemeDark:  'Dark background — easier on the eyes in low light.',
      hintThemeLight: 'Light background — matches bright pages.',
      labelDebug:     'Debug logging',
      debugOn:        'On',
      debugOff:       'Off',
      hintDebug:      'Write diagnostic logs to the console.',
      labelCorners:   'Window corners',
      cornersRounded: 'Rounded',
      cornersSquare:  'Square',
      hintCorners:    'Controls the border-radius of the preview window.',
      labelBarSide:   'Buttons side',
      barRight:       'Right',
      barLeft:        'Left',
      hintBarSide:    'Which side the action buttons (close, open, copy…) float on.',
      labelLang:      'Language',
      labelPos:       'Drop Zone position',
      posBottom:      'Bottom',
      posTop:         'Top',
      posFullscreen:  'Fullscreen',
      hintPosBottom:  'A fixed bar at the bottom of the page. Drag a link onto it to preview.',
      hintPosTop:     'A fixed bar at the top of the page.',
      hintPosFullscreen: 'The entire page becomes a drop target. Release the link anywhere to preview.',
      labelSize:      'Drop Zone size',
      hintSize:       'Width and height of the drop bar (not applicable in Fullscreen mode).',
      labelW:         'W',
      labelH:         'H',
      labelModal:     'Preview size',
      hintModalSmall: 'A compact window — good for quick glances.',
      hintModalMedium:'Balanced size — the default.',
      hintModalLarge: 'Maximised width, leaving just enough room for the action buttons.',
      modalSmall:     'Small',
      modalMedium:    'Medium',
      modalLarge:     'Large',
      btnSave:        'Save',
      btnCancel:      'Cancel',
      btnClosePage:   'Close',
      saved:          'Saved ✓',
      saveFailed:     'Save failed',
      aboutName:      'Name',
      aboutVersion:   'Version',
      aboutDesc:      'Description',
      aboutAuthor:    'Author',
      aboutHomepage:  'Homepage',
      aboutDescText:  'Drag links to a Drop Zone and preview them in a Modal iframe.',
    },
    zh: {
      title:          'Glimpser 设置',
      tabAppearance:  '外观',
      tabDropzone:    '拖放区',
      tabPreview:     '预览',
      tabAbout:       '关于',
      labelTheme:     '主题',
      themeDark:      '深色',
      themeLight:     '浅色',
      hintThemeDark:  '深色背景，适合低光环境。',
      hintThemeLight: '浅色背景，与亮色页面更协调。',
      labelDebug:     '调试日志',
      debugOn:        '开启',
      debugOff:       '关闭',
      hintDebug:      '将诊断日志输出到控制台。',
      labelCorners:   '窗口圆角',
      cornersRounded: '圆角',
      cornersSquare:  '直角',
      hintCorners:    '控制预览窗口的圆角大小。',
      labelBarSide:   '按钮位置',
      barRight:       '右侧',
      barLeft:        '左侧',
      hintBarSide:    '关闭、打开、复制等功能按钮悬浮在预览窗口的哪一侧。',
      labelLang:      '语言',
      labelPos:       'Drop Zone 位置',
      posBottom:      '底部',
      posTop:         '顶部',
      posFullscreen:  '全屏',
      hintPosBottom:  '页面底部的固定拖放条，将链接拖到上面即可预览。',
      hintPosTop:     '页面顶部的固定拖放条。',
      hintPosFullscreen: '整个页面都是拖放区域，在任意位置松开链接即可预览。',
      labelSize:      'Drop Zone 尺寸',
      hintSize:       '拖放条的宽度和高度（全屏模式下不适用）。',
      labelW:         '宽',
      labelH:         '高',
      labelModal:     '预览尺寸',
      hintModalSmall: '紧凑窗口，适合快速浏览。',
      hintModalMedium:'均衡尺寸，默认选项。',
      hintModalLarge: '最大化宽度，右侧仅保留功能按钮所需空间。',
      modalSmall:     '小',
      modalMedium:    '中',
      modalLarge:     '大',
      btnSave:        '保存',
      btnCancel:      '取消',
      btnClosePage:   '关闭',
      saved:          '已保存 ✓',
      saveFailed:     '保存失败',
      aboutName:      '名称',
      aboutVersion:   '版本',
      aboutDesc:      '简介',
      aboutAuthor:    '作者',
      aboutHomepage:  '主页',
      aboutDescText:  '将链接拖放到 Drop Zone，在 Modal 中快速预览目标页面。',
    },
  };

  const DEFAULT_SETTINGS = {
    dropZonePosition:   'bottom',
    dropZoneCustomSize: { width: 300, height: 150 },
    modalSize:          'medium',
    language:           null,
    theme:              null,
    corners:            'rounded',
    controlBarSide:     'right',
    debug:              false,
  };

  // ── Panel singleton ────────────────────────────────────────────────────
  let _host = null;
  let _shadow = null;
  let _activeTab = 'appearance';
  let _settings = null;

  function _t(key) {
    const lang = (_settings?.language === 'zh') ? 'zh' : 'en';
    return LABELS[lang]?.[key] ?? LABELS.en[key] ?? key;
  }

  // ── Build Shadow DOM ───────────────────────────────────────────────────
  async function _buildPanel() {
    // Load CSS — works in both content script context and extension pages
    let cssText = '';
    try {
      const cssUrl = nativeAPI.runtime.getURL('styles.css');
      cssText = await fetch(cssUrl).then(r => r.text());
    } catch (e) {
      console.warn('[Glimpser] Failed to load styles.css', e);
    }

    _host = document.createElement('div');
    _host.id = HOST_ID;
    document.documentElement.appendChild(_host);

    _shadow = _host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = cssText;
    _shadow.appendChild(style);

    _render();
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
    overlay.className = 'gs-overlay';

    const shell = document.createElement('div');
    shell.className = 'gs-panel-shell';

    // Tab nav
    const tabNav = document.createElement('nav');
    tabNav.className = 'gs-tab-nav';

    TABS.forEach(tab => {
      const btn = document.createElement('div');
      btn.className = 'gs-tab-btn' + (_activeTab === tab.key ? ' active' : '');
      btn.dataset.tab = tab.key;
      btn.innerHTML = tab.svg + `<span class="gs-tab-label">${_t('tab' + tab.key.charAt(0).toUpperCase() + tab.key.slice(1))}</span>`;
      btn.addEventListener('click', () => {
        _activeTab = tab.key;
        _shadow.querySelectorAll('.gs-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab.key));
        _shadow.querySelectorAll('.gs-tab-content').forEach(c => {
          const isActive = c.dataset.tab === tab.key;
          c.classList.remove('active');
          if (isActive) { void c.offsetWidth; c.classList.add('active'); }
        });
      });
      tabNav.appendChild(btn);
    });

    // Panel
    const panel = document.createElement('div');
    panel.className = 'gs-panel';

    const title = document.createElement('div');
    title.className = 'gs-panel-title';
    title.textContent = _t('title');

    const scroll = document.createElement('div');
    scroll.className = 'gs-panel-scroll';

    scroll.appendChild(_renderAppearanceTab());
    scroll.appendChild(_renderDropzoneTab());
    scroll.appendChild(_renderPreviewTab());
    scroll.appendChild(_renderAboutTab());

    // Footer
    const footer = document.createElement('div');
    footer.className = 'gs-panel-footer';

    const status = document.createElement('span');
    status.className = 'gs-status';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'gs-btn gs-btn-secondary';
    if (document.documentElement.dataset.dpStandalone) {
      cancelBtn.textContent = _t('btnClosePage');
      cancelBtn.addEventListener('click', () => window.close());
    } else {
      cancelBtn.textContent = _t('btnCancel');
      cancelBtn.addEventListener('click', hide);
    }

    const saveBtn = document.createElement('button');
    saveBtn.className = 'gs-btn gs-btn-primary';
    saveBtn.textContent = _t('btnSave');
    saveBtn.addEventListener('click', () => _save(status));

    footer.append(status, cancelBtn, saveBtn);
    panel.append(title, scroll, footer);
    shell.append(tabNav, panel);
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
      _render();
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
      wrap.appendChild(_makeOptionGroup([
        { label: _t('cornersRounded'), value: 'rounded' },
        { label: _t('cornersSquare'),  value: 'square'  },
      ], _settings?.corners || 'rounded', v => { _settings.corners = v; }));
      wrap.appendChild(_makeHint(_t('hintCorners')));
      return wrap;
    }));

    // Buttons side
    tab.appendChild(_makeCard(_t('labelBarSide'), () => {
      const wrap = document.createDocumentFragment();
      wrap.appendChild(_makeOptionGroup([
        { label: _t('barRight'), value: 'right' },
        { label: _t('barLeft'),  value: 'left'  },
      ], _settings?.controlBarSide || 'right', v => { _settings.controlBarSide = v; }));
      wrap.appendChild(_makeHint(_t('hintBarSide')));
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
    tab.appendChild(_makeCard(_t('labelPos'), posContent));

    // Size — sliders with live value display
    const sizeContent = document.createDocumentFragment();

    const makeSliderRow = (labelKey, min, max, value, onChange) => {
      const row = document.createElement('div');
      row.style.cssText = 'margin-bottom:12px';

      const header = document.createElement('div');
      header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px';

      const lbl = document.createElement('span');
      lbl.className = 'gs-field-label';
      lbl.style.marginBottom = '0';
      lbl.textContent = _t(labelKey);

      const val = document.createElement('span');
      val.style.cssText = 'font-size:var(--fs-xs);color:var(--accent);font-family:monospace;font-weight:600';
      val.textContent = value + ' px';

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'gs-slider';
      slider.min = min; slider.max = max; slider.value = value;
      slider.addEventListener('input', () => {
        val.textContent = slider.value + ' px';
        onChange(parseInt(slider.value));
      });

      header.append(lbl, val);
      row.append(header, slider);
      return row;
    };

    sizeContent.appendChild(makeSliderRow(
      'labelW', 100, 1200,
      _settings?.dropZoneCustomSize?.width ?? 300,
      v => { _settings.dropZoneCustomSize.width = v; }
    ));
    sizeContent.appendChild(makeSliderRow(
      'labelH', 60, 400,
      _settings?.dropZoneCustomSize?.height ?? 150,
      v => { _settings.dropZoneCustomSize.height = v; }
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

    const card = document.createElement('div');
    card.className = 'gs-card';

    // Extension name + logo row
    const nameRow = document.createElement('div');
    nameRow.style.cssText = 'display:flex;align-items:center;gap:14px;margin-bottom:20px';

    const logo = document.createElement('div');
    logo.style.cssText = `
      width:56px;height:56px;border-radius:14px;
      background:rgba(54,170,109,0.12);border:1px solid rgba(54,170,109,0.3);
      display:flex;align-items:center;justify-content:center;flex-shrink:0;
    `;
    logo.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24">
      <path fill="#36aa6d" d="M12 1.253c1.044 0 1.956.569 2.44 1.412l4.589 7.932l4.45 7.691c.047.074.21.359.27.494a2.808 2.808 0 0 1-3.406 3.836l-7.901-2.606a1.4 1.4 0 0 0-.442-.07a1.4 1.4 0 0 0-.442.07l-7.9 2.606l-.162.046a2.8 2.8 0 0 1-.684.083a2.81 2.81 0 0 1-2.644-3.763c.03-.091.074-.176.111-.264c.072-.15.161-.288.242-.432l4.449-7.691l4.588-7.932A2.81 2.81 0 0 1 12 1.253"/>
    </svg>`;

    const nameBlock = document.createElement('div');
    nameBlock.style.cssText = 'display:flex;flex-direction:column;justify-content:center';

    const extName = document.createElement('div');
    extName.style.cssText = 'font-size:var(--fs-lg);font-weight:700;color:var(--accent);letter-spacing:1px;text-shadow:0 0 16px var(--accent-glow);line-height:1.2';
    extName.textContent = 'Glimpser';

    nameBlock.append(extName);
    nameRow.append(logo, nameBlock);
    card.appendChild(nameRow);

    // Description
    const desc = document.createElement('div');
    desc.style.cssText = 'font-size:var(--fs-sm);color:var(--text-dim);line-height:1.6;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border)';
    desc.textContent = _t('aboutDescText');
    card.appendChild(desc);

    // Info rows — values use accent color
    const rows = [
      { label: _t('aboutVersion'),  value: `v${version}`, link: null       },
      { label: _t('aboutAuthor'),   value: author,         link: authorUrl  },
      { label: _t('aboutHomepage'), value: homepage,       link: homepage   },
    ];

    rows.forEach(({ label, value, link }) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:baseline;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);font-size:var(--fs-sm)';

      const lbl = document.createElement('span');
      lbl.style.cssText = 'color:var(--text-dim);min-width:80px;flex-shrink:0;font-weight:600';
      lbl.textContent = label;

      const val = link ? document.createElement('a') : document.createElement('span');
      val.style.cssText = 'color:var(--accent);word-break:break-all;font-family:monospace;letter-spacing:0.3px';
      val.textContent = value;
      if (link) {
        val.href = link;
        val.target = '_blank';
        val.rel = 'noopener noreferrer';
        val.style.textDecoration = 'none';
        val.addEventListener('mouseenter', () => { val.style.textDecoration = 'underline'; });
        val.addEventListener('mouseleave', () => { val.style.textDecoration = 'none'; });
      }

      row.append(lbl, val);
      card.appendChild(row);
    });

    tab.appendChild(card);
    return tab;
  }

  // ── Tab: Preview ───────────────────────────────────────────────────────
  function _renderPreviewTab() {
    const tab = _makeTab('preview');

    const modalHints = {
      small:  _t('hintModalSmall'),
      medium: _t('hintModalMedium'),
      large:  _t('hintModalLarge'),
    };
    const modalHintEl = _makeHint(modalHints[_settings?.modalSize || 'medium']);

    const group = _makeOptionGroup([
      { label: _t('modalSmall'),  value: 'small'  },
      { label: _t('modalMedium'), value: 'medium' },
      { label: _t('modalLarge'),  value: 'large'  },
    ], _settings?.modalSize || 'medium', v => {
      _settings.modalSize = v;
      modalHintEl.textContent = modalHints[v];
    });

    const content = document.createDocumentFragment();
    content.appendChild(group);
    content.appendChild(modalHintEl);

    tab.appendChild(_makeCard(_t('labelModal'), content));
    return tab;
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  function _makeTab(key) {
    const div = document.createElement('div');
    div.className = 'gs-tab-content' + (_activeTab === key ? ' active' : '');
    div.dataset.tab = key;
    return div;
  }

  function _makeCard(titleText, content) {
    const card = document.createElement('div');
    card.className = 'gs-card';
    const t = document.createElement('div');
    t.className = 'gs-card-title';
    t.textContent = titleText;
    card.appendChild(t);
    if (typeof content === 'function') {
      const result = content();
      if (result instanceof DocumentFragment || result instanceof Node) {
        card.appendChild(result);
      }
    } else if (content instanceof Node) {
      card.appendChild(content);
    } else if (content instanceof DocumentFragment) {
      card.appendChild(content);
    }
    return card;
  }

  function _makeHint(text) {
    const el = document.createElement('div');
    el.className = 'gs-field-hint';
    el.textContent = text;
    return el;
  }

  // Option group where each option shows a per-option hint below when active
  function _makeOptionGroupWithHints(options, currentValue, onChange) {
    const wrap = document.createElement('div');

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
      await nativeAPI.storage.sync.set(_settings);
      statusEl.textContent = _t('saved');
      statusEl.className = 'gs-status visible';
      setTimeout(() => { statusEl.className = 'gs-status'; }, 2000);
      if (_settings?.debug) {
        console.log('[Glimpser]', 'settings saved');
      }
    } catch (e) {
      statusEl.textContent = _t('saveFailed');
      statusEl.className = 'gs-status visible error';
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
      _settings = { ...DEFAULT_SETTINGS };
    }

    // Auto-detect theme on first use
    if (!_settings.theme) {
      _settings.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    if (!_host) {
      await _buildPanel();
    } else {
      _render();
    }
    document.documentElement.classList.add('glimpser-open');
  }

  function hide() {
    document.removeEventListener('keydown', _onKeyDown);
    document.documentElement.classList.remove('glimpser-open');
    const overlay = _shadow?.querySelector('.gs-overlay');
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
  window.__glimpserSettingsPanel = { toggle, show, hide };
})();
