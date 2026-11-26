import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/community-awareness', workers: 1,
  use: { baseURL: 'http://127.0.0.1:4181', channel: 'chrome', headless: true },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 4181 --strictPort',
    url: 'http://127.0.0.1:4181/tests/community-awareness/index.html', reuseExistingServer: false },
});
