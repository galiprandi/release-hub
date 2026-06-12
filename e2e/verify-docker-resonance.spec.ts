import { test, expect } from '@playwright/test';

test.describe('Docker UI Resonance Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Mock access and container data
    await page.addInitScript(() => {
      window.localStorage.setItem('releasehub_user_collections', JSON.stringify({
        favorites: [],
        deploymentFavorites: [],
        projects: [],
        activeTab: 'favorites'
      }));
    });

    // We need to mock the API responses for Docker
    // This is handled by the MSW or proxy in the actual app,
    // but for the E2E test we can just navigate and check the UI elements.
  });

  test('should display IndustrialTabs for status filtering', async ({ page }) => {
    await page.goto('/docker');

    // Check if IndustrialTabs are present
    const tabsContainer = page.locator('.bg-muted\\/40.border-border\\/60.rounded-lg');
    await expect(tabsContainer).toBeVisible();

    // Verify specific tabs
    await expect(page.getByRole('button', { name: /Todos/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Ejecutando/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Detenido/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Finalizado/i })).toBeVisible();

    // Verify technical label
    await expect(page.getByText('Estado:')).toBeVisible();
    await expect(page.getByText('Estado:')).toHaveClass(/text-\[10px\]/);

    await page.screenshot({ path: 'verification/docker-resonance-tabs.png' });
  });

  test('should not show "Verificando" StatusCard', async ({ page }) => {
    await page.goto('/docker');

    // The "Verificando" message should not be present
    const verifyingMessage = page.getByText('Verificando acceso a Docker...');
    await expect(verifyingMessage).not.toBeVisible();
  });
});
