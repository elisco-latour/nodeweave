import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',

  projects: [
    {
      name: 'component',
      testDir: './tests/component',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3100',
      },
    },
    {
      name: 'e2e',
      testDir: './tests/e2e',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3100',
      },
    },
    {
      name: 'perf',
      testDir: './tests/perf',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3100',
      },
    },
  ],

  webServer: [
    {
      command: 'npx serve . -l 3100 --no-clipboard',
      port: 3100,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npx serve app -l 3000 --no-clipboard',
      port: 3000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
