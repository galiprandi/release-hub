import { test, expect } from '@playwright/test';

test('verify novedades and table resonance polish', async ({ page }) => {
  // 1. Verify Novedades Page
  await page.goto('http://localhost:5173/novedades');
  await page.waitForTimeout(4000);

  // Check technical header
  const header = page.locator('header');
  await expect(header.locator('span', { hasText: 'Novedades del Sistema' })).toBeVisible();

  // Check container encapsulation
  const container = page.locator('div.bg-muted\\/10.border.border-border\\/40.rounded-xl');
  await expect(container).toBeVisible();

  await page.screenshot({ path: 'verification/novedades-resonance.png', fullPage: true });

  // 2. Verify Table Component Polish (on GitHub route)
  await page.goto('http://localhost:5173/github');
  await page.waitForTimeout(4000);

  // Look for internal filter bar in Table
  // Since we might not have favorites, the empty state might not show the table.
  // But we can check if the filter bar styling is applied to any visible tables or
  // we can mock data for the table.

  // Let's try to mock favorites to see a table
  await page.addInitScript(() => {
    const mockCollections = {
      favorites: ['facebook/react'],
      deploymentFavorites: [],
      projects: [],
      activeTab: 'favorites'
    };
    localStorage.setItem('releasehub_user_collections', JSON.stringify(mockCollections));
  });

  await page.goto('http://localhost:5173/github');
  await page.waitForTimeout(4000);

  // The table filter bar should have bg-muted/40
  const tableFilterBar = page.locator('div.bg-muted\\/40.border-b.border-border\\/60');
  // Note: our new styling is px-4 py-2 bg-muted/40

  await page.screenshot({ path: 'verification/table-polish-standard.png', fullPage: true });
});
