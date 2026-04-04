import { test, expect } from '@playwright/test';
test('debug app load', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE_ERROR:', err.message));
  page.on('requestfailed', req => console.log('REQ_FAILED:', req.url(), req.failure()?.errorText));
  page.on('response', resp => {
    if (resp.status() >= 400) console.log('HTTP_ERR:', resp.status(), resp.url());
  });
  await page.goto('/app/index.html');
  await page.waitForTimeout(5000);
  const result = await page.evaluate(() => {
    const shell = document.querySelector('app-shell');
    if (!shell) return 'no shell element';
    if (!shell.shadowRoot) return 'no shadow root - customElements defined: ' + !!customElements.get('app-shell');
    const ids = [];
    for (const el of shell.shadowRoot.children) {
      ids.push(el.id || el.tagName);
    }
    return 'shadow children: ' + ids.join(', ');
  });
  console.log('RESULT:', result);
});
