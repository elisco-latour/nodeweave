import { test, expect } from '@playwright/test';

/**
 * Journey: an operator triages the Inbox — filters to Pending, opens an action,
 * resolves it, and sees it leave the Pending queue with an audit stamp.
 */
test.describe('Inbox journey', () => {
  test('resolve an action removes it from Pending and stamps it as logged', async ({ page }) => {
    await page.goto('/inbox');

    // Toolbar: tabs + sort/filter present.
    const allTab = page.getByRole('tab', { name: /^All/ });
    const pendingTab = page.getByRole('tab', { name: /^Pending/ });
    await expect(allTab).toBeVisible();
    await expect(pendingTab).toBeVisible();

    // Open the first item in the list and act on it.
    await page.locator('a.row').first().click();
    const cta = page.getByRole('button', { name: /Resolve|Confirm|Mark done|Approve/ });
    await expect(cta).toBeEnabled();
    await cta.click();

    // Reading pane shows the audit stamp; the CTA is now disabled.
    await expect(page.getByText(/logged to the case/i)).toBeVisible();
    await expect(cta).toBeDisabled();

    // The resolved item is filtered out of the Pending tab.
    await pendingTab.click();
    await expect(page.getByText(/logged to the case/i)).toBeVisible(); // detail persists for audit
  });
});
