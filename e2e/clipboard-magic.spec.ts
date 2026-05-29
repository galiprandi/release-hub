import { test, expect } from '@playwright/test';

test.describe('Fetcher Magic Clipboard', () => {
  test('should automatically detect cURL in clipboard and open modal', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Navigate to fetcher page
    await page.goto('/fetcher');

    // Wait for the page to load
    await expect(page.locator('h1')).toContainText('Fetcher');

    // Mock clipboard content
    const curlCommand = 'curl -X GET https://api.example.com/data';
    await page.evaluate((text) => navigator.clipboard.writeText(text), curlCommand);

    // Trigger window focus to fire the effect
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));

    // Verify modal is open with the cURL command
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.locator('input[value="https://api.example.com/data"]')).toBeVisible();

    // Verify method is correctly selected
    const methodSelect = modal.locator('select');
    await expect(methodSelect).toHaveValue('GET');
  });

  test('should not trigger repeatedly for the same clipboard content', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/fetcher');

    const curlCommand = 'curl -X POST https://api.example.com/post -d \'{"key":"value"}\'';
    await page.evaluate((text) => navigator.clipboard.writeText(text), curlCommand);

    // Trigger first focus
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));

    // Close modal
    await page.getByRole('button', { name: /cancel|close|cerrar/i }).first().click().catch(() => {
        // Fallback if button not found by name, click outside or use escape
        page.keyboard.press('Escape');
    });

    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Trigger focus again with same content
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));

    // Should NOT be visible again
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
