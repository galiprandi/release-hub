import { test, expect } from '@playwright/test';

test('verify diff viewer resonance and lint fix', async ({ page }) => {
  await page.goto('http://localhost:5173/diff');

  // Verify high-density header
  await expect(page.getByText('Resultado de Comparación')).toBeVisible();

  // Paste content to trigger diff
  const leftPanel = page.locator('textarea').first();
  const rightPanel = page.locator('textarea').last();

  await leftPanel.fill('{"name": "test", "version": "1.0.0"}');
  await rightPanel.fill('{"name": "test", "version": "1.1.0"}');

  // Verify "Solo diffs" button
  await expect(page.getByRole('button', { name: /Solo diffs/i })).toBeVisible();

  // Wait for diff calculation and highlighting (sugar-high)
  await page.waitForTimeout(1000);

  // Take screenshot
  await page.screenshot({ path: 'verification/diff-viewer-resonance.png', fullPage: true });

  // Test mode switching to verify memoization fix doesn't break functionality
  await page.getByRole('button', { name: /TEXT/i }).click();
  await expect(page.getByText('test').first()).toBeVisible();

  await page.screenshot({ path: 'verification/diff-viewer-text-mode.png', fullPage: true });
});
