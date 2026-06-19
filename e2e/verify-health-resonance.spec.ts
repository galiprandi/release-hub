import { test, expect } from '@playwright/test';

test('verify health monitor resonance ui components', async ({ page }) => {
  // Set localStorage via addInitScript to ensure it's there before any React code runs
  await page.addInitScript(() => {
    const mockHealth = {
      endpoints: [
        {
          id: 'org/repo:service:production',
          product: 'org/repo',
          service: 'service',
          url: 'https://api.example.com/health',
          environment: 'production',
          lastChecked: new Date().toISOString(),
          isHealthy: true,
          responseTime: 120
        }
      ],
      version: 1
    };
    const mockCollections = {
      favorites: ['org/repo'],
      deploymentFavorites: [],
      projects: [],
      activeTab: 'favorites'
    };
    localStorage.setItem('seki:health:endpoints:v1', JSON.stringify(mockHealth));
    localStorage.setItem('releasehub_user_collections', JSON.stringify(mockCollections));
  });

  await page.goto('http://localhost:5173/health');

  // Wait for the spinner (2s in __root.tsx) + some buffer
  await page.waitForTimeout(5000);

  // Verify Header components
  const title = page.locator('text=Health Monitor');
  await expect(title).toBeVisible();

  // Verify environment tabs in header
  const envTabs = page.locator('div.w-96').first();
  await expect(envTabs).toBeVisible();

  // Verify if ProductSection is rendered
  // We look for the link with the repo name
  const repoLink = page.locator('a', { hasText: 'repo' });
  await expect(repoLink).toBeVisible();

  // Verify the health badge
  const healthBadge = page.locator('span', { hasText: '1 OK' });
  await expect(healthBadge).toBeVisible();
  await expect(healthBadge).toHaveClass(/bg-success\/20/);

  // Take screenshot
  await page.screenshot({ path: 'verification/health-monitor-resonance-final.png', fullPage: true });
});
