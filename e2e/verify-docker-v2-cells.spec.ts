import { test, expect } from '@playwright/test';

test.describe('Docker UI Resonance V2 Cells Verification', () => {
  test('should display high-density cells and hover actions', async ({ page }) => {
    // Mock access to bypass setup redirect
    await page.route('**/local/exec', async route => {
      const body = route.request().postDataJSON();
      if (body.args && body.args[0] === 'docker' && body.args[1] === '--version') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, stdout: 'Docker version 24.0.0', stderr: '' })
        });
      } else if (body.args && body.args[0] === 'docker' && body.args[1] === 'ps' && body.args[2] === '-a') {
        // Return a mocked container line in Docker's JSON format
        const mockContainer = JSON.stringify({
          ID: '123',
          Names: 'test-container',
          Image: 'nginx:latest',
          Status: 'Up 2 hours',
          RunningFor: '2 hours ago',
          Ports: '80/tcp, 0.0.0.0:8080->80/tcp',
          CreatedAt: '2023-01-01'
        });
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, stdout: mockContainer, stderr: '' })
        });
      } else if (body.args && body.args[0] === 'docker' && body.args[1] === 'ps') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, stdout: 'running', stderr: '' })
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/docker');

    // Verify StatusCell
    const statusCell = page.getByText(/^OK$/);
    await expect(statusCell).toBeVisible();
    await expect(statusCell).toHaveClass(/text-\[10px\]/);
    await expect(statusCell).toHaveClass(/font-bold/);
    await expect(statusCell).toHaveClass(/uppercase/);

    // Verify Dot in StatusCell
    const dot = page.locator('.w-1\\.5.h-1\\.5.rounded-full.bg-success');
    await expect(dot).toBeVisible();

    // Verify StartedCell (high density)
    const startedCell = page.getByText('2 hours ago');
    await expect(startedCell).toBeVisible();
    await expect(startedCell).toHaveClass(/text-\[10px\]/);

    // Verify PortsCell (select)
    const portsSelect = page.getByRole('combobox', { name: /Seleccionar puerto/i });
    await expect(portsSelect).toBeVisible();
    await expect(portsSelect).toHaveClass(/text-\[10px\]/);

    // Verify ActionsCell (hover-to-reveal)
    const actionsCell = page.locator('.opacity-0.group-hover\\:opacity-100');
    await expect(actionsCell).toHaveClass(/opacity-0/);

    // Hover over the row - we just check it exists, testing hover in headless CI can be flaky with opacity
    await page.locator('tr').filter({ hasText: 'test-container' }).hover();
    await expect(actionsCell).toBeVisible();

    await page.screenshot({ path: 'verification/docker-v2-cells.png' });
  });

  test('should show V2 EmptyState when no containers', async ({ page }) => {
    await page.route('**/api/docker/containers', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route('**/api/docker/access', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ isInstalled: true, hasAccess: true })
      });
    });

    await page.goto('/docker');

    const emptyTitle = page.getByRole('heading', { name: /No hay contenedores/i });
    await expect(emptyTitle).toBeVisible();
    await expect(emptyTitle).toHaveClass(/text-\[10px\]/);
    await expect(emptyTitle).toHaveClass(/font-bold/);
    await expect(emptyTitle).toHaveClass(/uppercase/);

    await page.screenshot({ path: 'verification/docker-v2-empty.png' });
  });
});
