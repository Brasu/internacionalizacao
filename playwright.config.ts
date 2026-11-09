import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const edge = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const projetos = [
  {
    name: 'chrome',
    use: {
      ...devices['Desktop Chrome'],
      launchOptions: existsSync(chrome) ? { executablePath: chrome } : {},
    },
  },
  ...(process.env.TEST_FIREFOX
    ? [{ name: 'firefox', use: { ...devices['Desktop Firefox'] } }]
    : []),
  ...(process.env.TEST_WEBKIT ? [{ name: 'webkit', use: { ...devices['Desktop Safari'] } }] : []),
  ...(existsSync(edge)
    ? [
        {
          name: 'edge',
          use: { ...devices['Desktop Edge'], launchOptions: { executablePath: edge } },
        },
      ]
    : []),
];
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: projetos,
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
  },
});
