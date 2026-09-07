// Minimal MV3 background service worker — test-only addition used to
// discover the extension id in Playwright and to receive runtime messages.
chrome.runtime.onInstalled.addListener(() => {});
chrome.runtime.onMessage.addListener((_msg, _sender, sendResponse) => {
  sendResponse({ background: true });
});
