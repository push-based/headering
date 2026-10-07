import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  // Keep e2e files out of Vitest's default *.test / *.spec glob.
  testMatch: '**/*.e2e.ts',
  reporter: 'list',
});
