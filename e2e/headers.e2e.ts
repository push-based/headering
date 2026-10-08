import { readFileSync } from 'node:fs';
import type { BrowserContext, Page } from '@playwright/test';
import { expect, test } from './fixtures';

// Available inside the extension's service worker, where worker.evaluate() runs.
declare const chrome: typeof import('wxt/browser').browser;

const exampleConfig = readFileSync(new URL('../examples/headers.json', import.meta.url), 'utf8');

const receivedHeaders = async (page: Page, url: string) => {
  await page.goto(url);
  return JSON.parse((await page.locator('body').textContent()) ?? '{}') as Record<string, string>;
};

/** Imports a config (the example by default) via the options page and returns an open popup. */
async function setUp(context: BrowserContext, extensionUrl: (page: string) => string, config = exampleConfig) {
  const options = await context.newPage();
  await options.goto(extensionUrl('options.html'));
  await options.getByLabel('Configuration JSON').fill(config);
  await options.getByRole('button', { name: 'Apply' }).click();
  await expect(options.getByRole('status')).toHaveText('Configuration applied.');

  const popup = await context.newPage();
  await popup.goto(extensionUrl('popup.html'));
  return popup;
}

test('imports a config and applies toggled headers', async ({ context, extensionUrl, echoUrl }) => {
  const popup = await setUp(context, extensionUrl);

  // Everything in the example starts disabled.
  const site = await context.newPage();
  expect(await receivedHeaders(site, echoUrl)).not.toHaveProperty('x-ssr-skip-cache');

  await popup.bringToFront();
  await popup.getByRole('switch', { name: 'SSR Skip Cache' }).click();
  await popup.getByRole('switch', { name: 'Forwarded For' }).click();
  await popup.getByRole('combobox', { name: 'x-forwarded-for' }).click();
  // Options keep the file's order even though chrome.storage sorts object keys.
  await expect(popup.getByRole('option').nth(0)).toContainText('BR');
  await expect(popup.getByRole('option').nth(2)).toContainText('GB');
  await popup.getByRole('option', { name: /^GB/ }).click();

  await expect
    .poll(() => receivedHeaders(site, echoUrl))
    .toMatchObject({ 'x-ssr-skip-cache': '1', 'x-forwarded-for': '2.127.255.255' });

  await popup.getByRole('switch', { name: 'SSR Skip Cache' }).click();
  await expect.poll(async () => (await receivedHeaders(site, echoUrl))['x-ssr-skip-cache']).toBeUndefined();
});

test('grouped profiles are mutually exclusive', async ({ context, extensionUrl, echoUrl }) => {
  const popup = await setUp(context, extensionUrl);
  const group = popup.getByRole('group', { name: 'SSR Skip Condition, one at a time' });
  const ssrEnabled = group.getByRole('switch', { name: 'SSR Enabled' });
  const ssrDisabled = group.getByRole('switch', { name: 'SSR Disabled' });

  await ssrEnabled.click();
  await expect(ssrEnabled).toBeChecked();

  await ssrDisabled.click();
  await expect(ssrDisabled).toBeChecked();
  await expect(ssrEnabled).not.toBeChecked();

  const site = await context.newPage();
  await expect.poll(() => receivedHeaders(site, echoUrl)).toMatchObject({ 'x-ssr-disabled': '1' });
  expect(await receivedHeaders(site, echoUrl)).not.toHaveProperty('x-ssr-enabled');
});

test('pausing stops every profile until resumed', async ({ context, extensionUrl, echoUrl }) => {
  const popup = await setUp(context, extensionUrl);
  const skipCache = popup.getByRole('switch', { name: 'SSR Skip Cache' });
  await skipCache.click();

  const site = await context.newPage();
  await expect.poll(() => receivedHeaders(site, echoUrl)).toMatchObject({ 'x-ssr-skip-cache': '1' });

  const worker = context.serviceWorkers()[0]!;
  const badgeText = () => worker.evaluate(() => chrome.action.getBadgeText({}));

  await popup.bringToFront();
  const pause = popup.getByRole('button', { name: 'Pause all profiles' });
  await pause.click();
  await expect(pause).toHaveAttribute('aria-pressed', 'true');
  await expect(popup.getByRole('banner')).toContainText('Paused');
  // Profiles keep their state so resuming brings them back.
  await expect(skipCache).toBeChecked();
  await expect.poll(async () => (await receivedHeaders(site, echoUrl))['x-ssr-skip-cache']).toBeUndefined();
  await expect.poll(badgeText).toBe('off');

  await pause.click();
  await expect(pause).toHaveAttribute('aria-pressed', 'false');
  await expect(popup.getByRole('banner')).not.toContainText('Paused');
  await expect.poll(() => receivedHeaders(site, echoUrl)).toMatchObject({ 'x-ssr-skip-cache': '1' });
  // Without a badge header there's nothing to show once resumed.
  await expect.poll(badgeText).toBe('');
});

test('the option picker is keyboard driven', async ({ context, extensionUrl }) => {
  const popup = await setUp(context, extensionUrl);
  const picker = popup.getByRole('combobox', { name: 'x-forwarded-for' });

  await picker.focus();
  await popup.keyboard.type('at');
  await expect(popup.getByPlaceholder('Type to search…')).toHaveValue('at');
  await expect(popup.getByRole('option', { selected: true })).toContainText('AT');
  await popup.keyboard.press('Enter');
  await expect(picker).toContainText('AT');
  await expect(picker).toBeFocused();

  // Arrow keys open the list and move through it.
  await popup.keyboard.press('ArrowDown');
  await popup.keyboard.type('us-n');
  await popup.keyboard.press('ArrowDown');
  await popup.keyboard.press('Enter');
  await expect(picker).toContainText('US-NJ');

  // Escape closes without changing the selection; the list can be reopened.
  await popup.keyboard.press('ArrowDown');
  await popup.keyboard.press('Escape');
  await expect(picker).toHaveAttribute('aria-expanded', 'false');
  await expect(picker).toBeFocused();
  await popup.keyboard.press('ArrowDown');
  await expect(picker).toHaveAttribute('aria-expanded', 'true');
  await expect(popup.getByRole('option', { selected: true })).toContainText('US-NJ');
});

test('shows the configured headers of the page\'s document request', async ({ context, extensionUrl, echoUrl }) => {
  const config = {
    version: 1,
    inspect: {
      requestHeaders: ['x-ssr-skip-cache'],
      responseHeaders: [
        'x-ssr-request-id',
        { name: 'x-ssr-status', tones: { hit: 'warning' }, badge: true },
        'x-ssr-status-code',
      ],
    },
    profiles: [{ name: 'SSR Skip Cache', requestHeaders: [{ name: 'x-ssr-skip-cache', value: '1' }] }],
  };
  await setUp(context, extensionUrl, JSON.stringify(config));

  const site = await context.newPage();
  await expect.poll(() => receivedHeaders(site, echoUrl)).toMatchObject({ 'x-ssr-skip-cache': '1' });

  const worker = context.serviceWorkers()[0]!;
  const tabId = await worker.evaluate(async (url) => (await chrome.tabs.query({ url }))[0]?.id, echoUrl);
  // The toolbar icon shows the badge header's tone as a symbol.
  const badge = () =>
    worker.evaluate(
      async (id) => [
        await chrome.action.getBadgeText({ tabId: id }),
        await chrome.action.getBadgeBackgroundColor({ tabId: id }),
        await chrome.action.getBadgeTextColor({ tabId: id }),
      ],
      tabId,
    );
  await expect.poll(badge).toEqual(['⚠\uFE0E', [250, 204, 21, 255], [66, 32, 6, 255]]);

  const popup = await context.newPage();
  await popup.goto(extensionUrl(`popup.html?tabId=${tabId}`));

  const section = popup.getByRole('region', { name: 'Page headers' });
  const value = (name: string) => section.getByRole('term').filter({ hasText: new RegExp(`^${name}$`) }).locator('+ dd');

  // The host is shown; the full URL is in the title.
  await expect(section).toContainText(new URL(echoUrl).host);
  await expect(section.getByTitle(echoUrl, { exact: true })).toBeVisible();
  await expect(section.getByLabel('Status code')).toHaveText('200');
  // Request headers include the ones added by the extension's own rules.
  await expect(value('x-ssr-skip-cache')).toHaveText('1');
  await expect(value('x-ssr-status')).toHaveText('HIT');
  // Tones match case-insensitively.
  await expect(value('x-ssr-status')).toHaveAttribute('data-tone', 'warning');
  await expect(value('x-ssr-request-id')).not.toHaveAttribute('data-tone');
  await expect(value('x-ssr-status-code')).toHaveText('not set');

  // Updates live when the page reloads.
  const before = await value('x-ssr-request-id').textContent();
  await site.reload();
  await expect(value('x-ssr-request-id')).not.toHaveText(before ?? '');
  await expect(value('x-ssr-request-id')).toHaveText(/^req-\d+$/);
  await expect.poll(badge).toEqual(['⚠\uFE0E', [250, 204, 21, 255], [66, 32, 6, 255]]);
});

test('asks for a reload when the page was loaded before the extension', async ({ context, extensionUrl }) => {
  await setUp(context, extensionUrl);
  const popup = await context.newPage();
  await popup.goto(extensionUrl('popup.html?tabId=999999'));
  const section = popup.getByRole('region', { name: 'Page headers' });
  await expect(section).toContainText('Headers are read when the page loads.');
  await expect(section.getByRole('button', { name: 'Reload page' })).toBeVisible();
});

test('clearing site data reloads the page as a new visitor', async ({ context, extensionUrl, echoUrl }) => {
  await setUp(context, extensionUrl);
  // Cookies ignore ports, so the same server on another host name stands in for a different site.
  const otherUrl = echoUrl.replace('127.0.0.1', 'localhost');

  const other = await context.newPage();
  await other.goto(otherUrl);
  await other.evaluate(() => (document.cookie = 'other=1'));

  const site = await context.newPage();
  await site.goto(echoUrl);
  await site.evaluate(() => {
    document.cookie = 'session=1';
    localStorage.setItem('seen', '1');
    sessionStorage.setItem('seen', '1');
  });
  expect(await receivedHeaders(site, echoUrl)).toMatchObject({ cookie: 'session=1' });

  const worker = context.serviceWorkers()[0]!;
  const tabId = await worker.evaluate(async (url) => (await chrome.tabs.query({ url }))[0]?.id, echoUrl);
  const popup = await context.newPage();
  await popup.goto(extensionUrl(`popup.html?tabId=${tabId}`));
  await popup.getByRole('button', { name: 'Clear site data and reload' }).click();

  // The reload itself goes out without the old cookie.
  await expect.poll(async () => JSON.parse((await site.locator('body').textContent()) ?? '{}')).not.toHaveProperty('cookie');
  expect(await site.evaluate(() => [document.cookie, localStorage.length, sessionStorage.length])).toEqual(['', 0, 0]);
  // Other sites keep theirs.
  expect(await receivedHeaders(other, otherUrl)).toMatchObject({ cookie: 'other=1' });
});

test('there is nothing to clear on browser pages', async ({ context, extensionUrl }) => {
  await setUp(context, extensionUrl);
  const worker = context.serviceWorkers()[0]!;
  const tabId = await worker.evaluate(async () => (await chrome.tabs.query({ url: 'chrome-extension://*/options.html' }))[0]?.id);
  const popup = await context.newPage();
  await popup.goto(extensionUrl(`popup.html?tabId=${tabId}`));
  await expect(popup.getByRole('button', { name: 'Settings' })).toBeVisible();
  await expect(popup.getByRole('button', { name: 'Clear site data and reload' })).toHaveCount(0);
});
