// background.js — Service Worker
// Registers declarativeNetRequest rules to remove X-Frame-Options and CSP headers
// for sub_frame requests, enabling iframe previews of most websites.

// 跨浏览器兼容 API 对象
const nativeAPI = typeof browser !== 'undefined' ? browser : chrome;

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
    console.log('响应头净化规则已激活');
  } catch (error) {
    console.error('规则注册失败: ' + error);
  }
}

// 扩展安装或更新时注册规则
nativeAPI.runtime.onInstalled.addListener(() => {
  updateHeaderRules();
});

/**
 * 点击扩展图标时，尝试向当前 tab 的 content script 发送 toggleSettings 消息。
 * 若失败（特殊页面无法注入 content script），则打开 popup.html 作为兜底。
 */
nativeAPI.action.onClicked.addListener(async (tab) => {
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
