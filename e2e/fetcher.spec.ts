import { test, expect } from '@playwright/test';

test.describe('Fetcher Module', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/fetcher');
	});

	test('should load fetcher page with correct title', async ({ page }) => {
		await expect(page).toHaveTitle('ReleaseHub');
	});

	test('should show Fetcher in breadcrumb', async ({ page }) => {
		const breadcrumb = page.locator('.text-lg.font-normal').getByText('Fetcher');
		await expect(breadcrumb).toBeVisible();
	});

	test('should show filter buttons', async ({ page }) => {
		await expect(page.getByText('Todos (0)')).toBeVisible();
		await expect(page.getByText('GET (0)')).toBeVisible();
		await expect(page.getByText('POST (0)')).toBeVisible();
	});

	test('should show search input', async ({ page }) => {
		const searchInput = page.getByPlaceholder('Buscar query...');
		await expect(searchInput).toBeVisible();
	});

	test('should show curl import input', async ({ page }) => {
		const curlInput = page.getByPlaceholder('Importar cURL');
		await expect(curlInput).toBeVisible();
	});

	test('should show empty state message', async ({ page }) => {
		await expect(page.getByText('No hay queries en el historial')).toBeVisible();
		await expect(page.getByText('Importa un comando cURL para comenzar a trabajar')).toBeVisible();
	});

	test('should navigate to fetcher from header link', async ({ page }) => {
		await page.goto('/');
		const fetcherLink = page.getByRole('link', { name: 'Fetcher' });
		await fetcherLink.click();
		await expect(page).toHaveURL(/\/fetcher/);
	});
});
