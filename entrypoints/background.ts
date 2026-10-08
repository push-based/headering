import type { Tone } from '@/lib/config';
import { badgeOf, documentRequestItem, type DocumentRequest } from '@/lib/document';
import { buildRules } from '@/lib/rules';
import { configItem, pausedItem } from '@/lib/settings';

const BADGE_COLOR = '#4F46E5';
const PAUSED_BADGE_COLOR = '#737373';
// Same hues as the popup's tone tags.
const TONE_BADGE_COLOR: Record<Tone, string> = { success: '#15803D', warning: '#C2410C', error: '#DC2626' };

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
  await browser.action.setBadgeText({ text: paused ? 'off' : '' });
  // The badge header, its labels or the paused state may have changed.
  const tabs = await browser.tabs.query({});
  await Promise.all(tabs.map((tab) => tab.id !== undefined && showBadge(tab.id)));
}

/** Shows the page's badge header on the tab's icon, or `off` while paused. */
async function showBadge(tabId: number, request?: DocumentRequest | null) {
  const [config, paused] = await Promise.all([configItem.getValue(), pausedItem.getValue()]);
  // A tab's own text overrides the global one, so it has to say `off` too.
  if (paused) {
    await browser.action.setBadgeBackgroundColor({ tabId, color: PAUSED_BADGE_COLOR });
    await browser.action.setBadgeText({ tabId, text: 'off' });
    return;
  }
  const badge = badgeOf(config.inspect, request === undefined ? await documentRequestItem(tabId).getValue() : request);
  await browser.action.setBadgeBackgroundColor({ tabId, color: badge?.tone ? TONE_BADGE_COLOR[badge.tone] : BADGE_COLOR });
  await browser.action.setBadgeText({ tabId, text: badge?.text ?? '' });
}

/** Remembers each tab's latest document request so the popup can show its headers. */
function trackDocumentRequests() {
  const filter = { urls: ['<all_urls>'], types: ['main_frame' as const] };
  // extraHeaders exposes headers Chrome hides by default (Cookie, Referer, …). Firefox doesn't support it.
  const extra = import.meta.env.FIREFOX ? [] : (['extraHeaders'] as const);

  // Request and response events update the same entry, so apply them in order.
  let queue = Promise.resolve();
  const enqueue = (task: () => Promise<void>) => {
    queue = queue.then(task).catch((err) => console.error('Failed to store document headers', err));
  };
  const update = (tabId: number, next: (current: DocumentRequest | null) => DocumentRequest) => {
    if (tabId < 0) return; // Not tied to a tab.
    const item = documentRequestItem(tabId);
    enqueue(async () => {
      const request = next(await item.getValue());
      await item.setValue(request);
      await showBadge(tabId, request);
    });
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

  // Chrome clears a tab's badge when the navigation commits, after the response has arrived; put it back.
  browser.tabs.onUpdated.addListener((tabId) => enqueue(() => showBadge(tabId)));

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
