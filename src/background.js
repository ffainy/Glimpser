// background.js — Service Worker
// Registers declarativeNetRequest rules to remove X-Frame-Options and CSP headers
// for sub_frame requests, enabling iframe previews of most websites.

// Cross-browser API object
const nativeAPI = typeof browser !== 'undefined'
  ? browser
  : (typeof chrome !== 'undefined' ? chrome : null);

let _debug = false;

async function _loadDebugFlag() {
  try {
    const { debug } = await nativeAPI.storage.sync.get({ debug: false });
    _debug = !!debug;
  } catch (e) {
    _debug = false;
  }
}

function _dlog(...args) {
  if (_debug) {
    console.log('[Glimpser]', ...args);
  }
}

/**
 * Register a declarativeNetRequest dynamic rule that removes the
 * X-Frame-Options and Content-Security-Policy response headers from
 * sub_frame requests.
 *
 * @param {object} api - browser or chrome API object (defaults to nativeAPI)
 */
async function updateHeaderRules(api = nativeAPI) {
  const rule = {
    id: 1,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      responseHeaders: [
        { header: 'X-Frame-Options', operation: 'remove' },
        { header: 'Content-Security-Policy', operation: 'remove' }
      ]
    },
    condition: {
      urlFilter: '*',
      resourceTypes: ['sub_frame']
    }
  };

  try {
    await api.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1],
      addRules: [rule]
    });
    _dlog('header rules active');
    try {
      const rules = await api.declarativeNetRequest.getDynamicRules();
      const hasRule = Array.isArray(rules) && rules.some(r => r.id === 1);
      _dlog('header rules verified', hasRule ? 'present' : 'missing');
    } catch (verifyErr) {
      _dlog('header rules verify failed', verifyErr);
    }
  } catch (error) {
    console.error('[Glimpser] Failed to register header rules:', error);
    _dlog('header rules failed', error);
  }
}

// Ensure the rule and debug flag are active whenever the background context starts.
if (nativeAPI) {
  _loadDebugFlag();
  updateHeaderRules();

  // Re-register on install or update.
  nativeAPI.runtime.onInstalled.addListener(() => {
    _loadDebugFlag();
    updateHeaderRules();
  });

  // Keep debug flag in sync with settings
  nativeAPI.storage.onChanged.addListener((changes) => {
    if (Object.prototype.hasOwnProperty.call(changes, 'debug')) {
      _debug = !!changes.debug.newValue;
    }
  });
}

// Popup is declared in manifest.json — no action.onClicked needed.

// Export for testing (Node.js / vitest environment only)
if (typeof exports !== 'undefined') {
  Object.assign(exports, { updateHeaderRules });
}
