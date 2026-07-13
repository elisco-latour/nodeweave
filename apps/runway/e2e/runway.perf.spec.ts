import { test, expect } from '@playwright/test';

/**
 * Performance budgets. First-load and in-app navigation should stay snappy;
 * the Cases table must page (not render thousands of rows) at scale — seed via
 * the dev hook and assert the DOM stays bounded.
 */
test('home first load is within budget', async ({ page }) => {
  const start = Date.now();
  await page.goto('/home', { waitUntil: 'networkidle' });
  const ms = Date.now() - start;
  console.log(`home load: ${ms}ms`);
  expect(ms).toBeLessThan(6000);
});

test('cases table stays paginated (bounded DOM) at 1000 cases', async ({ page }) => {
  await page.goto('/home');
  await page.evaluate(() => (window as unknown as { rwSeed?: (n: number) => void }).rwSeed?.(1000));
  await page.goto('/cases');
  await page.waitForLoadState('networkidle');
  const rows = await page.locator('table tbody tr').count();
  expect(rows).toBeLessThanOrEqual(25); // one page, not 1000
  await page.evaluate(() => (window as unknown as { rwReset?: () => void }).rwReset?.());
});
