// background.js — Service Worker
// Registers declarativeNetRequest rules to remove X-Frame-Options and CSP headers
// for sub_frame requests, enabling iframe previews of most websites.

// 跨浏览器兼容 API 对象
const nativeAPI = typeof browser !== 'undefined' ? browser : chrome;

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
 * 注册 declarativeNetRequest 动态规则，移除 sub_frame 请求的
 * X-Frame-Options 和 Content-Security-Policy 响应头。
 *
 * @param {object} api - browser 或 chrome API 对象（默认使用 nativeAPI）
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
    console.error('规则注册失败: ' + error);
    _dlog('header rules failed', error);
  }
}

// 扩展安装或更新时注册规则
nativeAPI.runtime.onInstalled.addListener(() => {
  _loadDebugFlag();
  updateHeaderRules();
});

// Load debug flag on startup (MV3 service worker restart / MV2 background load)
nativeAPI.runtime.onStartup?.addListener(() => {
  _loadDebugFlag();
});

// Keep debug flag in sync with settings
nativeAPI.storage.onChanged.addListener((changes) => {
  if (Object.prototype.hasOwnProperty.call(changes, 'debug')) {
    _debug = !!changes.debug.newValue;
  }
});

/**
 * 点击扩展图标时，尝试向当前 tab 的 content script 发送 toggleSettings 消息。
 * 若失败（特殊页面无法注入 content script），则打开 popup.html 作为兜底。
 */
nativeAPI.action.onClicked.addListener(async (tab) => {
  _dlog('action clicked', { tabId: tab?.id, url: tab?.url });
  try {
    await nativeAPI.tabs.sendMessage(tab.id, { action: 'toggleSettings' });
  } catch (e) {
    // Content script unavailable (chrome://, about:, new tab, etc.)
    // Open the options page in a new tab
    nativeAPI.runtime.openOptionsPage();
  }
});

// Export for testing (Node.js / vitest environment only)
if (typeof exports !== 'undefined') {
  Object.assign(exports, { updateHeaderRules });
}
