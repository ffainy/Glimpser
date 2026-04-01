// i18n.js — Localisation helper
// Loads translations from _locales/{lang}/messages.json at runtime,
// enabling user-selectable language independent of browser locale.

let _messages = {};

/**
 * Detect locale from browser language.
 * @returns {'zh_CN'|'en'}
 */
function _detectBrowserLang() {
  const nav = (navigator.language || navigator.userLanguage || '').toLowerCase();
  return nav.startsWith('zh') ? 'zh_CN' : 'en';
}

let _i18nLang = _detectBrowserLang();

/**
 * Load the messages JSON for the given locale.
 * Falls back to 'en' if the requested locale file is missing.
 * @param {'zh_CN'|'en'} lang
 * @returns {Promise<void>}
 */
async function loadMessages(lang) {
  const nativeAPI = typeof browser !== 'undefined' ? browser : (typeof chrome !== 'undefined' ? chrome : null);
  const validLang = (lang === 'zh_CN' || lang === 'zh') ? 'zh_CN' : 'en';
  _i18nLang = validLang;

  try {
    const url = nativeAPI
      ? nativeAPI.runtime.getURL(`_locales/${validLang}/messages.json`)
      : `_locales/${validLang}/messages.json`;
    const res = await fetch(url);
    const json = await res.json();
    // Flatten: { key: { message: "..." } } → { key: "..." }
    _messages = {};
    for (const [k, v] of Object.entries(json)) {
      _messages[k] = v.message || k;
    }
  } catch (e) {
    // Fallback to English if load fails
    if (validLang !== 'en') {
      await loadMessages('en');
    }
  }
}

/**
 * Apply a stored language preference and load the corresponding messages.
 * @param {'zh_CN'|'zh'|'en'|null|undefined} pref
 * @returns {Promise<void>}
 */
async function applyLangPref(pref) {
  const lang = (pref === 'zh_CN' || pref === 'zh') ? 'zh_CN'
             : (pref === 'en') ? 'en'
             : _detectBrowserLang();
  await loadMessages(lang);
}

/**
 * Returns the localised string for the given key.
 * @param {string} key
 * @returns {string}
 */
function t(key) {
  return _messages[key] || key;
}
