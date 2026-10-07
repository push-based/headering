import { readFileSync } from 'node:fs';
import type { BrowserContext, Page } from '@playwright/test';
import { expect, test } from './fixtures';

const exampleConfig = readFileSync(new URL('../examples/headers.json', import.meta.url), 'utf8');

const receivedHeaders = async (page: Page, url: string) => {
  await page.goto(url);
  return JSON.parse((await page.locator('body').textContent()) ?? '{}') as Record<string, string>;
};

/** Imports the example config via the options page and returns an open popup. */
async function setUp(context: BrowserContext, extensionUrl: (page: string) => string) {
  const options = await context.newPage();
  await options.goto(extensionUrl('options.html'));
  await options.getByLabel('Configuration JSON').fill(exampleConfig);
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
  const group = popup.getByRole('group', { name: 'SSR mode, one at a time' });
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
