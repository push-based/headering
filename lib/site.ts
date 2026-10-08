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

/**
 * Forgets everything the browser keeps for an origin, then reloads the tab so the
 * page loads as it would for a first-time visitor. Chrome clears cookies for the
 * whole registrable domain, so `app.example.com` also loses `example.com` cookies.
 */
export async function clearSiteData(tabId: number, origin: string) {
  // browsingData doesn't cover sessionStorage, which lives in the tab and survives a reload.
  await browser.scripting
    .executeScript({ target: { tabId }, func: () => sessionStorage.clear() })
    .catch(() => {}); // Pages that scripts can't run on (error pages, the Web Store) have nothing to clear.
  await browser.browsingData.remove(
    { origins: [origin] },
    { cookies: true, localStorage: true, indexedDB: true, cacheStorage: true, serviceWorkers: true, cache: true },
  );
  await browser.tabs.reload(tabId, { bypassCache: true });
}
