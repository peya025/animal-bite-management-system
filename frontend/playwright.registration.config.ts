import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/registration',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4178', channel: 'chrome', headless: true, screenshot: 'only-on-failure' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4178 --strictPort',
    url: 'http://127.0.0.1:4178/tests/registration/index.html',
    reuseExistingServer: !process.env.CI,
  },
});
