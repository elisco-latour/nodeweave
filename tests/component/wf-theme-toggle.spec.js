import { test, expect } from '@playwright/test';

test.describe('wf-theme-toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/component/fixtures/wf-theme-toggle-fixture.html');
    await page.waitForFunction(() => window.__ready === true);
    // Clear any persisted theme from previous tests
    await page.evaluate(() => localStorage.removeItem('wf-theme'));
    // Mount the toggle
    await page.evaluate(() => {
      const toggle = document.createElement('wf-theme-toggle');
      document.body.appendChild(toggle);
    });
  });

  test('renders a button with correct ARIA attributes', async ({ page }) => {
    const btn = page.locator('wf-theme-toggle').locator('button');
    await expect(btn).toHaveAttribute('aria-label', 'Toggle theme');
    await expect(btn).toHaveAttribute('aria-pressed', /(true|false)/);
  });

  test('click toggles data-theme on documentElement', async ({ page }) => {
    const initial = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme'),
    );

    // Click once
    await page.locator('wf-theme-toggle').locator('button').click();
    const after = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme'),
    );
    expect(after).not.toBe(initial);

    // Click again — should toggle back
    await page.locator('wf-theme-toggle').locator('button').click();
    const restored = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme'),
    );
    expect(restored).toBe(initial);
  });

  test('persists theme to localStorage', async ({ page }) => {
    await page.locator('wf-theme-toggle').locator('button').click();
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme'),
    );
    const stored = await page.evaluate(() => localStorage.getItem('wf-theme'));
    expect(stored).toBe(theme);
  });

  test('aria-pressed reflects dark mode state', async ({ page }) => {
    // Get initial state
    const initTheme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme'),
    );

    // Toggle to the other theme
    await page.locator('wf-theme-toggle').locator('button').click();
    const newTheme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme'),
    );
    const pressed = await page.locator('wf-theme-toggle').locator('button').getAttribute('aria-pressed');
    expect(pressed).toBe(String(newTheme === 'dark'));
  });

  test('restores theme from localStorage on mount', async ({ page }) => {
    // Set dark theme in localStorage
    await page.evaluate(() => localStorage.setItem('wf-theme', 'dark'));

    // Remove existing toggle and add a new one
    await page.evaluate(() => {
      document.querySelector('wf-theme-toggle').remove();
      const toggle = document.createElement('wf-theme-toggle');
      document.body.appendChild(toggle);
    });

    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme'),
    );
    expect(theme).toBe('dark');

    const pressed = await page.locator('wf-theme-toggle').locator('button').getAttribute('aria-pressed');
    expect(pressed).toBe('true');
  });

  test('auto-detects prefers-color-scheme when no localStorage', async ({ page }) => {
    // Remove existing toggle
    await page.evaluate(() => {
      document.querySelector('wf-theme-toggle').remove();
      document.documentElement.removeAttribute('data-theme');
      localStorage.removeItem('wf-theme');
    });

    // Emulate dark mode preference
    await page.emulateMedia({ colorScheme: 'dark' });

    // Mount fresh toggle
    await page.evaluate(() => {
      const toggle = document.createElement('wf-theme-toggle');
      document.body.appendChild(toggle);
    });

    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme'),
    );
    expect(theme).toBe('dark');
  });
});
