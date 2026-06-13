import { test, expect } from '@playwright/test';

test('GitHub Dashboard V2 Layout and High Density', async ({ page }) => {
  // Mock localStorage for user collections to avoid empty states
  await page.addInitScript(() => {
    window.localStorage.setItem('releasehub_user_collections', JSON.stringify({
      favorites: ['facebook/react', 'vercel/next.js'],
      deploymentFavorites: [],
      projects: [
        { id: 'proj-1', name: 'Productivity', repos: ['microsoft/vscode', 'obsidianmd/obsidian-releases'], deployments: [] }
      ],
      activeTab: 'favorites'
    }));
  });

  // Navigate to GitHub dashboard
  await page.goto('http://localhost:5173/github');

  // Verify Header elements
  const header = page.locator('header');
  await expect(header).toBeVisible();

  // Verify IndustrialTabs for collections in header
  const collectionsTabs = header.locator('div.flex.items-center.gap-2:has-text("Colecciones:")');
  await expect(collectionsTabs).toBeVisible();
  await expect(collectionsTabs.locator('button:has-text("Favoritos")')).toBeVisible();
  await expect(collectionsTabs.locator('button:has-text("Productivity")')).toBeVisible();

  // Verify Gestionar Proyectos button in header actions
  const manageProjectsBtn = header.locator('button:has-text("Gestionar Proyectos")');
  await expect(manageProjectsBtn).toBeVisible();

  // Verify RepoSearch in header
  await expect(header.locator('input[placeholder*="Búsqueda"]')).toBeVisible();

  // Verify Global Filter
  const globalFilter = page.locator('div:has-text("Filtrar:")').first();
  await expect(globalFilter).toBeVisible();
  await expect(globalFilter.locator('button:has-text("Todos")')).toBeVisible();
  await expect(globalFilter.locator('button:has-text("Pendientes")')).toBeVisible();

  // Verify Table Headers (High Density)
  const firstTable = page.locator('table').first();
  await expect(firstTable).toBeVisible();

  const headers = firstTable.locator('th');
  // Check some high density headers
  await expect(headers.locator('span:has-text("Producción")')).toHaveClass(/text-\[10px\]/);
  await expect(headers.locator('span:has-text("Staging")')).toHaveClass(/text-\[10px\]/);
  await expect(headers.locator('span:has-text("Salud")')).toHaveClass(/text-\[10px\]/);

  // Take screenshot for verification
  await page.screenshot({ path: 'verification/github-dashboard-v2.png', fullPage: true });
});
