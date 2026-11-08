import { defineConfig } from '@rstest/core';

// Real-browser smoke tests.
// Install the managed Chromium with `pnpm exec playwright install chromium`,
// or set PLAYWRIGHT_CHANNEL=msedge|chrome to use an installed browser.
const channel = process.env.PLAYWRIGHT_CHANNEL;

export default defineConfig({
  include: ['src/__tests__/browser.test.ts'],
  browser: {
    enabled: true,
    provider: 'playwright',
    headless: true,
    providerOptions: channel ? { launch: { channel } } : {},
  },
});
