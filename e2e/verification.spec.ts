import { test, expect } from '@playwright/test';

test('verify industrial resonance v2', async ({ page }) => {
  await page.goto('http://localhost:5173/kubernetes');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'verification/k8s-v2.png', fullPage: true });

  await page.goto('http://localhost:5173/docker');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'verification/docker-v2.png', fullPage: true });

  await page.goto('http://localhost:5173/github');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'verification/github-v2.png', fullPage: true });
});
