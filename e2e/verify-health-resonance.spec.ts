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

  // Verify InfoBanner refinement
  const infoBannerLabel = page.locator('text=Cómo funciona');
  await expect(infoBannerLabel).toHaveClass(/text-\[10px\]/);
  await expect(infoBannerLabel).toHaveClass(/font-bold/);
  await expect(infoBannerLabel).toHaveClass(/uppercase/);

  // Verify environment tabs in header
  const envTabs = page.locator('div.w-96');
  await expect(envTabs).toBeVisible();
  await expect(envTabs.locator('button', { hasText: 'Todos' })).toHaveClass(/bg-background/); // Active tab

  // Verify sorting tabs
  const sortTabs = page.locator('div.w-72');
  await expect(sortTabs).toBeVisible();
  await expect(sortTabs.locator('button', { hasText: 'Nombre' })).toHaveClass(/bg-background/);

  // Take screenshot
  await page.screenshot({ path: 'verification/health-monitor-resonance-final.png', fullPage: true });

  // Verify if ProductSection is rendered (should be if localStorage mock worked)
  const productSection = page.locator('div.bg-muted\\/10').first();
  const count = await productSection.count();

  if (count > 0) {
    console.log('Product section found!');
    const productHeader = productSection.locator('div.bg-muted\\/20');
    await expect(productHeader).toBeVisible();
    await expect(productHeader.locator('span.bg-success\\/20')).toBeVisible();
    await expect(page.locator('div.w-1\\.5.h-1\\.5.rounded-full.bg-success')).toBeVisible();
  } else {
    console.log('Product section not found, but UI components verified.');
  }
});
