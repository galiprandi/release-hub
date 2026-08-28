import { test, expect } from '@playwright/test';

test('Kubernetes Dashboard - Linear/Vercel Canon', async ({ page }) => {
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

  // Verify view selector dropdown (CollectionDropdown, like /github)
  const viewDropdown = page.getByRole('button', { name: 'Seleccionar vista' });
  await expect(viewDropdown).toBeVisible();
  await expect(viewDropdown).toContainText('Favoritos');
  await viewDropdown.click();
  await expect(page.getByRole('menuitem', { name: /Proyectos/i })).toBeVisible();
  await page.keyboard.press('Escape');

  // Verify namespace selector dropdown
  const nsDropdown = page.getByRole('button', { name: 'Seleccionar namespace' });
  await expect(nsDropdown).toBeVisible();
  await expect(nsDropdown).toContainText('Todos');

  // Wait for table to be visible
  await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

  // Verify Table Headers
  await expect(page.locator('thead').getByText('NAMESPACE', { exact: false })).toBeVisible();
  await expect(page.locator('thead').getByText('ESTADO', { exact: false })).toBeVisible();
  await expect(page.locator('thead').getByText('AGE', { exact: false })).toBeVisible();
  await expect(page.locator('thead').getByText('IMÁGENES', { exact: false })).toBeVisible();

  // Verify technical metadata styling (Namespace)
  const nsCell = page.locator('tbody tr').first().locator('td').nth(1).locator('span');
  await expect(nsCell).toHaveClass(/text-xs font-medium text-muted-foreground/);

  // Verify Status Badge
  const statusBadge = page.locator('tbody tr').first().locator('td').nth(2).locator('span');
  await expect(statusBadge).toHaveClass(/bg-success\/20/);

  // Verify Search styling
  const searchInput = page.getByLabel('Búsqueda de deployments');
  await expect(searchInput).toHaveClass(/bg-muted\/30/);
  await expect(searchInput).toHaveClass(/border-border/);

  // Take screenshot
  await page.screenshot({ path: 'verification/kubernetes-resonance.png', fullPage: true });
});
