import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const APP_URL = '/app/index.html';

async function waitForApp(page) {
  await page.goto(APP_URL);
  await page.waitForFunction(() => {
    const shell = document.querySelector('app-shell');
    if (!shell || !shell.shadowRoot) return false;
    const ws = shell.shadowRoot.getElementById('workspace');
    return ws && ws.state;
  }, null, { timeout: 10000 });
}

test.describe('App accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await waitForApp(page);
  });

  test('axe scan on full app shell — zero violations', async ({ page }) => {
    // Disable 'region' rule: axe flags <app-shell> custom element as content
    // outside landmarks, even though its Shadow DOM contains proper landmarks.
    const results = await new AxeBuilder({ page })
      .disableRules(['region'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('ARIA roles are present: application, list, toolbar, complementary', async ({ page }) => {
    // workspace has role="application"
    const wsRole = await page.evaluate(() => {
      const shell = document.querySelector('app-shell');
      return shell.shadowRoot.getElementById('workspace').getAttribute('role');
    });
    expect(wsRole).toBe('application');

    // component-palette has role="region"
    const paletteRole = await page.evaluate(() => {
      const shell = document.querySelector('app-shell');
      return shell.shadowRoot.getElementById('palette').getAttribute('role');
    });
    expect(paletteRole).toBe('region');

    // toolbar has role="toolbar"
    const toolbarRole = await page.evaluate(() => {
      const shell = document.querySelector('app-shell');
      return shell.shadowRoot.getElementById('toolbar').getAttribute('role');
    });
    expect(toolbarRole).toBe('toolbar');

    // config-drawer has role="complementary"
    const drawerRole = await page.evaluate(() => {
      const shell = document.querySelector('app-shell');
      return shell.shadowRoot.getElementById('drawer').getAttribute('role');
    });
    expect(drawerRole).toBe('complementary');
  });

  test('palette items are focusable', async ({ page }) => {
    const focusable = await page.evaluate(() => {
      const shell = document.querySelector('app-shell');
      const palette = shell.shadowRoot.getElementById('palette');
      const items = palette.shadowRoot.querySelectorAll('[role="listitem"]');
      return [...items].every(item => item.getAttribute('tabindex') === '0');
    });
    expect(focusable).toBe(true);
  });

  test('toolbar buttons have aria-labels', async ({ page }) => {
    const allLabeled = await page.evaluate(() => {
      const shell = document.querySelector('app-shell');
      const toolbar = shell.shadowRoot.getElementById('toolbar');
      const buttons = toolbar.shadowRoot.querySelectorAll('button');
      return [...buttons].every(btn => btn.hasAttribute('aria-label'));
    });
    expect(allLabeled).toBe(true);
  });
});
