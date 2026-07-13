import { defineConfig, devices } from '@playwright/test';

/// <reference types="node" />

/**
 * Runway Playwright config — journeys (e2e), accessibility (a11y), and
 * performance (perf) projects, mirroring the nodeweave test structure.
 * Starts (or reuses) the Runway dev server on :4300.
 *
 * First run needs a browser: `npx playwright install chromium`.
 * Run: `pnpm --filter runway e2e`  (optionally `--project e2e|a11y|perf`).
 */
export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4300',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'e2e', testMatch: /.*\.e2e\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'a11y', testMatch: /.*\.a11y\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'perf', testMatch: /.*\.perf\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm --filter runway start -- --port 4300',
    url: 'http://localhost:4300',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
