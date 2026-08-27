import { test, expect } from '@playwright/test';

test('verify github dashboard industrial resonance v2', async ({ page }) => {
  // Mock localStorage for user collections
  await page.addInitScript(() => {
    window.localStorage.setItem('releasehub_user_collections', JSON.stringify({
      favorites: [],
      deploymentFavorites: [],
      projects: [
        { id: 'proj-1', name: 'Proyecto Alpha', description: 'Test Project', repos: ['facebook/react'], deployments: [] }
      ],
      activeTab: 'favorites'
    }));
  });

  await page.goto('http://localhost:5173/github');

  const collectionTrigger = page.getByRole('button', { name: 'Seleccionar colección' });
  await expect(collectionTrigger).toBeVisible();
  await expect(collectionTrigger).toContainText('Favoritos');
  await collectionTrigger.click();
  await expect(page.getByRole('menuitem', { name: /Favoritos/i })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: /Proyecto Alpha/i })).toBeVisible();
  await page.getByRole('menuitem', { name: /Proyecto Alpha/i }).click();

  // Verify search params
  await expect(page).toHaveURL(/tab=proj-1/);

  // Take screenshot
  await page.screenshot({ path: 'verification/github-dashboard-resonance.png' });

  // Navigate to a specific repo to verify its tabs
  await page.goto('http://localhost:5173/github/facebook/react?view=commits');

  // Verify IndustrialTabs for commits/tags
  await expect(page.getByRole('button', { name: /Commits/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Tags/i })).toBeVisible();

  // Take screenshot
  await page.screenshot({ path: 'verification/github-repo-resonance.png' });
});
