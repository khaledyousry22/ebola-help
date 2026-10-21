import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    launchOptions: process.env['PW_CHROMIUM_PATH']
      ? { executablePath: process.env['PW_CHROMIUM_PATH'] }
      : {},
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  // Tests run against the production build, served as static files.
  webServer: {
    // --ignore-lock keeps the server in the foreground even when Astro detects an AI agent.
    command: `npx astro preview --port ${PORT} --ignore-lock`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env['CI'],
  },
});
