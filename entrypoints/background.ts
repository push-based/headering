import { documentRequestItem, type DocumentRequest } from '@/lib/document';
import { buildRules } from '@/lib/rules';
import { configItem, pausedItem } from '@/lib/settings';

const BADGE_COLOR = '#4F46E5';
const PAUSED_BADGE_COLOR = '#737373';

async function applyConfig() {
  const [config, paused] = await Promise.all([configItem.getValue(), pausedItem.getValue()]);
  const existing = await browser.declarativeNetRequest.getDynamicRules();
  // Pausing drops every rule but leaves the profiles' enabled state alone, so resuming restores them.
  const addRules = paused ? [] : buildRules(config);
  await browser.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((rule) => rule.id),
    addRules,
  });
  await browser.action.setBadgeBackgroundColor({ color: paused ? PAUSED_BADGE_COLOR : BADGE_COLOR });
  await browser.action.setBadgeText({ text: paused ? 'off' : addRules.length ? String(addRules.length) : '' });
}

/** Remembers each tab's latest document request so the popup can show its headers. */
function trackDocumentRequests() {
  const filter = { urls: ['<all_urls>'], types: ['main_frame' as const] };
  // extraHeaders exposes headers Chrome hides by default (Cookie, Referer, …). Firefox doesn't support it.
  const extra = import.meta.env.FIREFOX ? [] : (['extraHeaders'] as const);

  // Request and response events update the same entry, so apply them in order.
  let queue = Promise.resolve();
  const update = (tabId: number, next: (current: DocumentRequest | null) => DocumentRequest) => {
    if (tabId < 0) return; // Not tied to a tab.
    const item = documentRequestItem(tabId);
    queue = queue
      .then(async () => item.setValue(next(await item.getValue())))
      .catch((err) => console.error('Failed to store document headers', err));
  };

  // A new navigation (or redirect hop) replaces whatever the tab had before.
  browser.webRequest.onSendHeaders.addListener(
    ({ tabId, requestId, url, requestHeaders = [] }) => update(tabId, () => ({ requestId, url, requestHeaders })),
    filter,
    ['requestHeaders', ...extra],
  );

  browser.webRequest.onResponseStarted.addListener(
    ({ tabId, requestId, url, statusCode, responseHeaders = [] }) =>
      update(tabId, (current) => ({
        requestId,
        url,
        requestHeaders: current?.requestId === requestId ? current.requestHeaders : [],
        statusCode,
        responseHeaders,
      })),
    filter,
    ['responseHeaders', ...extra],
  );

  browser.tabs.onRemoved.addListener((tabId) => void documentRequestItem(tabId).removeValue());
}

export default defineBackground(() => {
  // Chain updates so a quick sequence of changes can't interleave. Each run reads
  // the latest config and paused state, so it doesn't matter which one changed.
  let queue = Promise.resolve();
  const sync = () => {
    queue = queue.then(applyConfig).catch((err) => console.error('Failed to apply header rules', err));
  };

  configItem.watch(sync);
  pausedItem.watch(sync);

  // Dynamic rules persist across restarts; resync after install/update.
  browser.runtime.onInstalled.addListener(sync);

  trackDocumentRequests();
});
