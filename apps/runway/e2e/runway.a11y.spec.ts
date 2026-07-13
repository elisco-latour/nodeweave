import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Accessibility: no serious/critical WCAG 2 A/AA violations on the primary surfaces. */
const SURFACES = ['/home', '/inbox', '/cases', '/settings', '/help'];

for (const path of SURFACES) {
  test(`a11y: ${path} has no serious/critical violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([]);
  });
}
