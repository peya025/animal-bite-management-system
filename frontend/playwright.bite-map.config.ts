import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir: './tests/bite-map', workers: 1, use: { baseURL: 'http://127.0.0.1:4179', channel: 'chrome', headless: true },
 webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 4179 --strictPort', url: 'http://127.0.0.1:4179/tests/bite-map/index.html', reuseExistingServer: true }
});
