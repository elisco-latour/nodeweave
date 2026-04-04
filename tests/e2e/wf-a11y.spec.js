import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const WF_URL = '/tests/e2e/fixtures/wf-e2e-fixture.html';

async function waitForWireframe(page) {
  await page.goto(WF_URL);
  await page.waitForFunction(() => {
    const shell = document.querySelector('wf-shell');
    if (!shell || !shell.shadowRoot) return false;
    const ws = shell.shadowRoot.getElementById('workspace');
    return ws && ws.state;
  }, null, { timeout: 10000 });
}

test.describe('Wireframe accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await waitForWireframe(page);
  });

  test('axe scan on wireframe shell — zero critical/serious violations', async ({ page }) => {
    // Disable 'region' rule: axe flags custom elements as content
    // outside landmarks, even though Shadow DOM contains proper landmarks.
    const results = await new AxeBuilder({ page })
      .disableRules(['region'])
      .analyze();

    const serious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(serious).toEqual([]);
  });

  test('ARIA roles are present: application, navigation, toolbar, region, complementary', async ({ page }) => {
    // workspace has role="application"
    const wsRole = await page.evaluate(() => {
      const shell = document.querySelector('wf-shell');
      return shell.shadowRoot.getElementById('workspace').getAttribute('role');
    });
    expect(wsRole).toBe('application');

    // palette has role="navigation"
    const paletteRole = await page.evaluate(() => {
      const shell = document.querySelector('wf-shell');
      return shell.shadowRoot.getElementById('palette').getAttribute('role');
    });
    expect(paletteRole).toBe('navigation');

    // toolbar has role="toolbar"
    const toolbarRole = await page.evaluate(() => {
      const shell = document.querySelector('wf-shell');
      return shell.shadowRoot.getElementById('toolbar').getAttribute('role');
    });
    expect(toolbarRole).toBe('toolbar');

    // process-list has role="region"
    const processRole = await page.evaluate(() => {
      const shell = document.querySelector('wf-shell');
      return shell.shadowRoot.getElementById('process-list').getAttribute('role');
    });
    expect(processRole).toBe('region');

    // config-drawer has role="complementary"
    const drawerRole = await page.evaluate(() => {
      const shell = document.querySelector('wf-shell');
      return shell.shadowRoot.getElementById('drawer').getAttribute('role');
    });
    expect(drawerRole).toBe('complementary');
  });

  test('palette items are focusable', async ({ page }) => {
    const focusable = await page.evaluate(() => {
      const shell = document.querySelector('wf-shell');
      const palette = shell.shadowRoot.getElementById('palette');
      const items = palette.shadowRoot.querySelectorAll('[role="listitem"]');
      return [...items].every(item => item.getAttribute('tabindex') === '0');
    });
    expect(focusable).toBe(true);
  });

  test('toolbar buttons have aria-labels', async ({ page }) => {
    const allLabeled = await page.evaluate(() => {
      const shell = document.querySelector('wf-shell');
      const toolbar = shell.shadowRoot.getElementById('toolbar');
      const buttons = toolbar.shadowRoot.querySelectorAll('button');
      return [...buttons].every(btn => btn.hasAttribute('aria-label'));
    });
    expect(allLabeled).toBe(true);
  });

  test('workspace is focusable with tabindex', async ({ page }) => {
    const tabindex = await page.evaluate(() => {
      const shell = document.querySelector('wf-shell');
      return shell.shadowRoot.getElementById('workspace').getAttribute('tabindex');
    });
    expect(tabindex).toBe('0');
  });
});
