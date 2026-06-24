import { test, expect } from '@playwright/test';

test('Kubernetes Setup page should have Industrial Resonance V2 styling', async ({ page }) => {
  // Go to the kubernetes setup page
  await page.goto('/kubernetes/setup');

  // Check for high-density typography in the title (though it's text-2xl, the plan mentioned high-density for labels)
  const title = page.locator('h1');
  await expect(title).toHaveText('Configuración de Kubernetes');
  await expect(title).toHaveClass(/text-2xl font-bold/);

  // Verify cards have rounded-xl and semantic styling
  // Assuming kubectl is not installed in the test environment, it should show MissingCard (destructive)
  // We expect it to be a MissingCard if kubectl is missing
  const isInstalled = await page.locator('text=Instalado').count() > 0;

  if (!isInstalled) {
    // MissingCard styling
    const card = page.locator('.border-destructive\\/20.rounded-xl').first();
    await expect(card).toBeVisible();
    await expect(card).toHaveClass(/bg-destructive\/10/);

    // Technical labels
    const label = card.locator('h2');
    await expect(label).toHaveClass(/text-\[10px\] font-bold uppercase tracking-wider/);

    const requiredBadge = card.locator('text=Requerido');
    await expect(requiredBadge).toHaveClass(/text-\[8px\] font-bold uppercase/);
  } else {
    // SuccessCard styling
    const card = page.locator('.border-success\\/20.rounded-xl').first();
    await expect(card).toBeVisible();
    await expect(card).toHaveClass(/bg-success\/10/);

    const label = card.locator('p').first();
    await expect(label).toHaveClass(/text-\[10px\] font-bold uppercase tracking-wider/);

    const installedBadge = card.locator('text=Instalado');
    await expect(installedBadge).toHaveClass(/text-\[8px\] font-bold uppercase/);
  }

  // Take a screenshot
  await page.screenshot({ path: 'kubernetes-setup-v2.png' });
});
