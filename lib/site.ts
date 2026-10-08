import type { Browser } from 'wxt/browser';

// After a rebuild, the popup is read fresh from disk but the background keeps running the old
// build, and new permissions aren't granted, until the extension reloads. Bump the version when
// the message changes, so an old background ignores it and the popup asks for that reload,
// rather than the old code doing something else (like reloading when asked not to).
const CLEAR_SITE_DATA = 'clear-site-data/7';
/** The error when that happens, so the popup can offer to reload the extension. */
export const EXTENSION_OUTDATED = 'Headering was rebuilt, but Chrome is still running its previous version.';
const CLEAR_TIMEOUT = 10_000;
// How long after clearing without a reload to check which cookies the page has set again.
const SET_AGAIN_DELAY = 1000;
const PAGE_STORAGE_TIMEOUT = 2000;
// Session rule ids are separate from the profiles' dynamic ones.
const BLOCK_SET_COOKIE_RULE_ID = 1;

/** The origin whose data can be cleared for a tab's URL; only web pages have one. */
export function siteOrigin(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const { protocol, origin } = new URL(url);
    return protocol === 'http:' || protocol === 'https:' ? origin : undefined;
  } catch {
    return undefined;
  }
}

/** What clearing did, checked against what the browser has afterwards. */
export interface ClearReport {
  /** After a reload: names of the cookies it still sent; missing if the reload wasn't seen. */
  cookiesSent?: string[];
  /** Without a reload: how many cookies were removed. */
  removed?: number;
  /** Without a reload: the cookies set again a moment later, by domain. */
  setAgain?: { domain: string; names: string[] }[];
}

interface ClearSiteDataResponse extends ClearReport {
  error?: string;
}

interface ClearSiteDataMessage {
  type: typeof CLEAR_SITE_DATA;
  tabId: number;
  /** Reload the site's tabs as new visitors; otherwise just clear, leaving the page as it is. */
  reload: boolean;
}

/**
 * Popup side: the background does the work, so it finishes even if the popup closes midway.
 * With `reload`, resolves with the cookies the reload sent, so the popup can show whether it worked.
 */
export async function requestClearSiteData(tabId: number, reload: boolean): Promise<ClearReport> {
  const response: ClearSiteDataResponse | undefined = await browser.runtime
    .sendMessage({ type: CLEAR_SITE_DATA, tabId, reload } satisfies ClearSiteDataMessage)
    .catch(() => undefined); // No listener: the background is from before the update.
  if (!response) throw new Error(EXTENSION_OUTDATED);
  const { error, ...report } = response;
  if (error) throw new Error(error);
  return report;
}

/** Background side of `requestClearSiteData`. */
export function handleClearSiteData() {
  browser.runtime.onMessage.addListener((message: Partial<ClearSiteDataMessage>, _sender, sendResponse) => {
    if (message?.type !== CLEAR_SITE_DATA || message.tabId === undefined) return;
    (message.reload ? clearSiteDataAndReload(message.tabId) : clearSiteData(message.tabId)).then(
      (report) => sendResponse(report satisfies ClearSiteDataResponse),
      (err: Error) => sendResponse({ error: err.message } satisfies ClearSiteDataResponse),
    );
    return true; // Responds asynchronously.
  });
}

/**
 * Roughly the registrable domain Chrome clears cookies for (`www.example.co.uk` → `example.co.uk`),
 * used to find the tabs that could write them back. Without the public suffix list it can match
 * a little too much, which only unloads a tab needlessly.
 */
export function cookieSite(hostname: string): string {
  const labels = hostname.split('.');
  if (labels.length <= 2 || /^[\d.]+$/.test(hostname)) return hostname;
  // Country codes often have a short second level, like co.uk or com.au.
  const keep = labels.at(-1)!.length === 2 && labels.at(-2)!.length <= 3 ? 3 : 2;
  return labels.slice(-keep).join('.');
}

function onCookieSite(url: string | undefined, site: string) {
  if (!siteOrigin(url)) return false;
  const { hostname } = new URL(url!);
  return hostname === site || hostname.endsWith(`.${site}`);
}

interface Site {
  origin: string;
  /** The registrable domain whose cookies go. */
  site: string;
  /**
   * The tab's cookie store. Incognito windows have their own, and the cookie API reads the
   * regular profile's unless told otherwise.
   */
  storeId: string;
  incognito: boolean;
  /** Other tabs sharing the site's cookies: on the site, in the same cookie store. */
  others: number[];
}

/** The tab's web page and the other tabs that share its cookies. */
async function siteTabs(tabId: number): Promise<Site> {
  if (!browser.browsingData || !browser.cookies || !browser.scripting) throw new Error(EXTENSION_OUTDATED);
  const tab = await browser.tabs.get(tabId);
  const origin = siteOrigin(tab.url);
  if (!tab.url || !origin) throw new Error('Only web pages have site data to clear.');
  const site = cookieSite(new URL(tab.url).hostname);
  const stores = await browser.cookies.getAllCookieStores();
  const storeId = stores.find((store) => store.tabIds.includes(tabId))?.id;
  if (!storeId) throw new Error("Couldn't find the tab's cookie store.");
  const others = (await browser.tabs.query({})).filter(
    (t) =>
      t.id !== undefined &&
      t.id !== tabId &&
      !t.discarded &&
      t.incognito === tab.incognito &&
      onCookieSite(t.url, site),
  );
  return { origin, site, storeId, incognito: tab.incognito, others: others.map((t) => t.id!) };
}

/**
 * Forgets everything the browser keeps for the tab's origin, like DevTools' "Clear site data",
 * and leaves the page as it is, so its scripts may well set some of it again. Chrome clears
 * cookies for the whole registrable domain, so `app.example.com` also loses `example.com` cookies.
 */
async function clearSiteData(tabId: number): Promise<ClearReport> {
  const site = await siteTabs(tabId);
  const urls = await loadedUrls(tabId);
  const before = await siteCookies(urls, site);
  await removeSiteData(tabId, site, urls);
  // Read back what the browser has, so the popup reports what happened rather than what was asked.
  await new Promise((resolve) => setTimeout(resolve, SET_AGAIN_DELAY));
  const after = await siteCookies(urls, site);
  const byDomain = Map.groupBy(after, (c) => c.domain.replace(/^\./, ''));
  return {
    removed: before.length,
    setAgain: [...byDomain].map(([domain, cookies]) => ({ domain, names: [...new Set(cookies.map((c) => c.name))] })),
  };
}

/** Clears like `clearSiteData`, then loads the site's tabs again as a first-time visitor would. */
async function clearSiteDataAndReload(tabId: number): Promise<ClearReport> {
  const site = await siteTabs(tabId);
  // Any tab on the site could write cookies back between clearing and reloading, so all of them
  // stop writing until they reload, and all reload as new visitors.
  const tabIds = [tabId, ...site.others];
  const urls = (await Promise.all(tabIds.map(loadedUrls))).flat();
  await blockCookieWrites(tabIds);
  const cookiesSent = cookiesOfNextLoad(tabId);
  try {
    await removeSiteData(tabId, site, urls);
  } finally {
    // Whatever happened, reload: it also lifts the blocks.
    await Promise.all(tabIds.map((id) => browser.tabs.reload(id, { bypassCache: true }).catch(() => {})));
  }
  return { cookiesSent: await cookiesSent };
}

/**
 * Cookies through the cookie API, in the tab's own store, and storage from inside the page,
 * which works in any window. browsingData clears the regular profile's storage for the origin
 * as well, including what pages in other tabs hold, but never touches Incognito.
 */
function removeSiteData(tabId: number, site: Site, urls: string[]) {
  // The HTTP cache is left alone: it doesn't identify a visitor, and filtering it by origin
  // means scanning all of it, which can take long enough to look like the tab got stuck.
  // The page's own clearing runs after browsingData's: clearing the same storage both ways at
  // once can stall both.
  const storage = site.incognito
    ? clearPageStorage(tabId)
    : browser.browsingData
        .remove(
          { origins: [site.origin] },
          { cookies: true, localStorage: true, indexedDB: true, cacheStorage: true, serviceWorkers: true },
        )
        .then(() => clearPageStorage(tabId));
  return withTimeout(
    Promise.all([storage, siteCookies(urls, site).then(removeCookies)]),
    CLEAR_TIMEOUT,
    'Chrome took too long to clear the site data.',
  );
}

/** Clears the origin's storage from inside the page, as DevTools does for the page's own profile. */
async function clearPageStorage(tabId: number) {
  const cleared = browser.scripting
    .executeScript({
      target: { tabId },
      func: async () => {
        // Each on its own, so one that fails (say, storage the page may not use) doesn't stop the rest.
        const attempt = (clear: () => unknown) => Promise.resolve().then(clear).catch(() => {});
        await Promise.all([
          attempt(() => localStorage.clear()),
          attempt(() => sessionStorage.clear()),
          attempt(async () => Promise.all((await caches.keys()).map((key) => caches.delete(key)))),
          attempt(async () => Promise.all((await navigator.serviceWorker.getRegistrations()).map((r) => r.unregister()))),
          // A database the page has open is deleted once the page lets go of it (at the latest on
          // reload), so don't wait for that.
          attempt(async () => {
            for (const { name } of await indexedDB.databases()) if (name) indexedDB.deleteDatabase(name);
          }),
        ]);
      },
    })
    .catch(() => {}); // Pages that scripts can't run on (error pages, the Web Store).
  // A page busy with its storage can hold this up; that shouldn't hold up the whole clear.
  await withTimeout(cleared, PAGE_STORAGE_TIMEOUT, '').catch(() => {});
}

/**
 * Until the tabs reload, their pages can't write cookies or storage: scripts' writes do
 * nothing, and responses to requests already on their way lose their Set-Cookie headers.
 */
async function blockCookieWrites(tabIds: number[]) {
  await browser.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [BLOCK_SET_COOKIE_RULE_ID],
    addRules: [
      {
        id: BLOCK_SET_COOKIE_RULE_ID,
        action: {
          type: 'modifyHeaders' as Browser.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          responseHeaders: [
            { header: 'set-cookie', operation: 'remove' as Browser.declarativeNetRequest.HeaderOperation.REMOVE },
          ],
        },
        // The reloaded document sets the new visitor's cookies, so it's left alone.
        condition: { tabIds, excludedResourceTypes: ['main_frame' as Browser.declarativeNetRequest.ResourceType] },
      },
    ],
  });
  liftSetCookieBlockOnReload(tabIds);

  await Promise.all(
    tabIds.map((tabId) =>
      browser.scripting
        .executeScript({
          target: { tabId, allFrames: true },
          // In the page's own world, where its scripts see the patched APIs. The reload drops them.
          world: 'MAIN',
          func: () => {
            // browsingData doesn't cover sessionStorage, which lives in the tab and outlasts reloads.
            sessionStorage.clear();
            const cookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!;
            Object.defineProperty(Document.prototype, 'cookie', { ...cookie, set() {} });
            Storage.prototype.setItem = () => {};
            if ('CookieStore' in window) (window.CookieStore as { prototype: { set: unknown } }).prototype.set = async () => {};
          },
        })
        .catch(() => {}), // Pages that scripts can't run on (error pages, the Web Store).
    ),
  );
}

/** Lifts the Set-Cookie block once every tab's reloaded document has responded, or after a while. */
function liftSetCookieBlockOnReload(tabIds: number[]) {
  const waiting = new Set(tabIds);
  const lift = () => {
    clearTimeout(timer);
    browser.webRequest.onHeadersReceived.removeListener(onHeadersReceived);
    void browser.declarativeNetRequest.updateSessionRules({ removeRuleIds: [BLOCK_SET_COOKIE_RULE_ID] });
  };
  const onHeadersReceived = ({ tabId }: Browser.webRequest.OnHeadersReceivedDetails) => {
    waiting.delete(tabId);
    if (!waiting.size) lift();
    return undefined;
  };
  const timer = setTimeout(lift, CLEAR_TIMEOUT * 2);
  browser.webRequest.onHeadersReceived.addListener(onHeadersReceived, { urls: ['<all_urls>'], types: ['main_frame'] });
}

/** The names of the cookies the tab's next document request sends; undefined if none is seen in time. */
function cookiesOfNextLoad(tabId: number) {
  return new Promise<string[] | undefined>((resolve) => {
    const done = (names?: string[]) => {
      clearTimeout(timer);
      browser.webRequest.onSendHeaders.removeListener(onSendHeaders);
      resolve(names);
    };
    const onSendHeaders = ({ requestHeaders = [] }: Browser.webRequest.OnSendHeadersDetails) => {
      const cookie = requestHeaders.find((h) => h.name.toLowerCase() === 'cookie')?.value ?? '';
      done(cookie.split(';').flatMap((pair) => pair.split('=')[0]!.trim() || []));
    };
    const timer = setTimeout(() => done(), CLEAR_TIMEOUT);
    // extraHeaders is what exposes Cookie. Firefox doesn't support it, and shows it anyway.
    const extra = import.meta.env.FIREFOX ? [] : (['extraHeaders'] as const);
    browser.webRequest.onSendHeaders.addListener(
      onSendHeaders,
      { urls: ['<all_urls>'], types: ['main_frame'], tabId },
      ['requestHeaders', ...extra],
    );
  });
}

/** Every URL the tab's page and its frames loaded, to find the cookies sent with them. */
async function loadedUrls(tabId: number): Promise<string[]> {
  const results = await browser.scripting
    .executeScript({
      target: { tabId, allFrames: true },
      func: () => [location.href, ...performance.getEntriesByType('resource').map((entry) => entry.name)],
    })
    .catch(() => []);
  return results.flatMap((r) => (r.result as string[] | undefined) ?? []);
}

/**
 * The site's cookies, also covering the third-party part of DevTools' "Clear site data":
 * the cookies every request the page made could send, whatever their domain (a login domain,
 * an API host, trackers), and the ones partitioned under the site.
 */
async function siteCookies(urls: string[], { origin, site, storeId }: Site) {
  const topLevelSite = `${new URL(origin).protocol}//${site}`;
  const pages = new Set(
    urls.flatMap((url) => {
      if (!siteOrigin(url)) return [];
      const { origin: urlOrigin, pathname } = new URL(url);
      return [urlOrigin + pathname];
    }),
  );
  const found = await Promise.all([
    // The site's own, on any of its subdomains; browsingData clears these too.
    browser.cookies.getAll({ domain: site, storeId }),
    ...[...pages].map((url) => browser.cookies.getAll({ url, storeId })),
    // Only keep the partition's own cookies, in case unpartitioned ones come back too.
    browser.cookies
      .getAll({ partitionKey: { topLevelSite }, storeId })
      .then((cookies) => cookies.filter((c) => c.partitionKey?.topLevelSite === topLevelSite)),
  ]);
  const cookies = new Map(
    found.flat().map((c) => [[c.storeId, c.domain, c.path, c.name, c.partitionKey?.topLevelSite].join('|'), c]),
  );
  return [...cookies.values()];
}

async function removeCookies(cookies: Browser.cookies.Cookie[]) {
  await Promise.all(
    cookies.map((c) =>
      browser.cookies.remove({
        url: `${c.secure ? 'https' : 'http'}://${c.domain.replace(/^\./, '')}${c.path}`,
        name: c.name,
        storeId: c.storeId,
        ...(c.partitionKey && { partitionKey: c.partitionKey }),
      }),
    ),
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => (timer = setTimeout(() => reject(new Error(message)), ms))),
  ]).finally(() => clearTimeout(timer));
}
