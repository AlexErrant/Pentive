import { test, expect } from '@playwright/test'

test.beforeEach(({ page }) => {
	// https://playwright.dev/docs/api/class-page#page-event-console
	page.on('console', async (msg) => {
		const args = await Promise.all(
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			msg.args().map(async (a) => await a.jsonValue()),
		)
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		console.log(...args)
	})

	// Seems like there's a possible bad seed, but it's not being reported.
	// Rewrite with check? https://fast-check.dev/docs/core-blocks/runners/#check
	page.on('pageerror', (exception) => {
		console.log(exception)
	})
})

test(
	`all sqlite roundtrip tests in /testdb pass`,
	{
		tag: '@prod',
	},
	async ({ page }) => {
		test.setTimeout(60_000)
		await page.goto('/plugins')
		await page.locator('input[type="file"]').click()
		await page
			.locator('input[type="file"]')
			.setInputFiles('./app-playwright-0.0.0.tgz')
		await expect(page.getByText('Plugin upserted!')).toBeVisible({
			timeout: 30_000,
		})
		await page.goto('/testdb')
		await expect(page.locator('section')).toContainText('Test IndexedDB')
		const testStatus = page.locator('#testStatus')
		await expect(testStatus).toHaveText('✔ Passed!', { timeout: 60_000 })
	},
)
