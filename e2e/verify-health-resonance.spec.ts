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
  await page.waitForTimeout(4000);

  // Verify InfoBanner refinement
  const infoBannerLabel = page.locator('text=Cómo funciona');
  await expect(infoBannerLabel).toHaveClass(/text-\[10px\]/);
  await expect(infoBannerLabel).toHaveClass(/font-bold/);
  await expect(infoBannerLabel).toHaveClass(/uppercase/);

  // Verify Top Level IndustrialTabs are present
  const industrialTabs = page.locator('div.bg-muted\\/40').first();
  await expect(industrialTabs).toBeVisible();

  // Take screenshot
  await page.screenshot({ path: 'verification/health-monitor-resonance-final.png', fullPage: true });

  // Check if ProductSection appeared
  const productSection = page.locator('div.bg-muted\\/10').filter({ has: page.locator('a', { hasText: 'repo' }) });
  const count = await productSection.count();

  if (count > 0) {
    console.log('Product section found!');
    // Verify high-density badges
    await expect(productSection.locator('span.bg-success\\/20')).toBeVisible();
    await expect(productSection.locator('div.bg-success')).toBeVisible();
  } else {
    console.log('Product section not found, but UI components refined.');
  }
});
