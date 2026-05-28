import { test, expect } from '@playwright/test';

test.describe('Fetcher Module', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/fetcher');
	});

	test('should load fetcher page with correct title', async ({ page }) => {
		await expect(page).toHaveTitle('ReleaseHub');
	});

	test('should show Fetcher in breadcrumb', async ({ page }) => {
		const breadcrumb = page.locator('h1').getByText('Fetcher');
		await expect(breadcrumb).toBeVisible();
	});


	test('should show curl import input', async ({ page }) => {
		const curlInput = page.getByPlaceholder(/Importar cURL/i);
		await expect(curlInput).toBeVisible();
	});

	test('should show empty state message', async ({ page }) => {
		await expect(page.getByText('Historial Vacío')).toBeVisible();
		await expect(page.getByText(/Pega un comando cURL/i)).toBeVisible();
	});

	test('should navigate to fetcher from header link', async ({ page }) => {
		await page.goto('/');
		const fetcherLink = page.getByRole('link', { name: 'Fetcher' });
		await fetcherLink.click();
		await expect(page).toHaveURL(/\/fetcher/);
	});
});
