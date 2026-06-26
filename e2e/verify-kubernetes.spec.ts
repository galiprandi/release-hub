import { test, expect } from '@playwright/test';

test('Kubernetes Dashboard - Industrial Resonance V2', async ({ page }) => {
  // Mock localStorage for user collections
  await page.addInitScript(() => {
    window.localStorage.setItem('releasehub_user_collections', JSON.stringify({
      favorites: ['context1/default/my-deployment'],
      deploymentFavorites: ['context1/default/my-deployment'],
      projects: [],
      activeTab: 'favorites'
    }));

    // Mock deployment metadata
    window.localStorage.setItem('kubernetes-deployments-metadata', JSON.stringify({
      'context1/default/my-deployment': {
        name: 'my-deployment',
        namespace: 'default',
        status: 'healthy',
        age: '15d',
        images: ['nginx:latest'],
        ready: '1/1',
        upToDate: '1',
        available: '1'
      }
    }));
  });

  // Mock API responses
  await page.route('**/local/exec', async (route) => {
    const body = route.request().postDataJSON();
    if (body.args?.includes('kubectl') && body.args?.includes('version')) {
      await route.fulfill({
        json: {
          success: true,
          stdout: JSON.stringify({ clientVersion: { major: "1", minor: "30" } }),
          stderr: ''
        }
      });
    } else {
      await route.fulfill({ json: { success: true, stdout: '', stderr: '' } });
    }
  });

  await page.goto('http://localhost:5173/kubernetes');

  // Verify Header
  await expect(page.getByRole('heading', { name: /KUBERNETES/i })).toBeVisible();

  // Verify IndustrialTabs
  await expect(page.getByRole('button', { name: 'Favoritos', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Proyectos', exact: true })).toBeVisible();

  // Wait for table to be visible
  await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

  // Verify Table Headers
  await expect(page.locator('thead').getByText('NAMESPACE', { exact: false })).toBeVisible();
  await expect(page.locator('thead').getByText('ESTADO', { exact: false })).toBeVisible();
  await expect(page.locator('thead').getByText('AGE', { exact: false })).toBeVisible();
  await expect(page.locator('thead').getByText('IMÁGENES', { exact: false })).toBeVisible();

  // Verify technical metadata styling (Namespace)
  const nsCell = page.locator('tbody tr').first().locator('td').nth(1).locator('span');
  await expect(nsCell).toHaveClass(/text-\[10px\] font-bold uppercase tracking-wider/);

  // Verify Status Badge
  const statusBadge = page.locator('tbody tr').first().locator('td').nth(2).locator('span');
  await expect(statusBadge).toHaveClass(/bg-success\/20/);

  // Verify Search styling
  const searchInput = page.getByPlaceholder(/Buscar por namespace/i);
  await expect(searchInput).toHaveClass(/bg-muted\/40/);
  await expect(searchInput).toHaveClass(/border-border\/60/);

  // Take screenshot
  await page.screenshot({ path: 'verification/kubernetes-resonance.png', fullPage: true });
});
