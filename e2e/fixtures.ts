import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import { chromium, test as base, type BrowserContext } from '@playwright/test';

const EXTENSION_PATH = resolve(import.meta.dirname, '../.output/chrome-mv3');

export const test = base.extend<{
  context: BrowserContext;
  extensionUrl: (page: string) => string;
  echoUrl: string;
}>({
  // Extensions only load in a persistent context using Playwright's bundled Chromium.
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [`--disable-extensions-except=${EXTENSION_PATH}`, `--load-extension=${EXTENSION_PATH}`],
    });
    await use(context);
    await context.close();
  },

  extensionUrl: async ({ context }, use) => {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    const id = new URL(worker.url()).host;
    await use((page) => `chrome-extension://${id}/${page}`);
  },

  // Responds with the request headers it received, as JSON.
  echoUrl: async ({}, use) => {
    const server: Server = createServer((req, res) => {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(req.headers));
    });
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    await use(`http://127.0.0.1:${(server.address() as AddressInfo).port}/`);
    server.close();
  },
});

export const expect = test.expect;
