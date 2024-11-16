import { test, expect } from '@playwright/test'

test('has title', async ({ page }) => {
	await page.goto('/')

	// Expect a title "to contain" a substring.
	await expect(page).toHaveTitle(/Pentive App/)
})

test('get started link', async ({ page }) => {
	await page.goto('https://playwright.dev/')

	// Click the get started link.
	await page.getByRole('link', { name: 'Get started' }).click()

	// Expects page to have a heading with the name of Installation.
	await expect(
		page.getByRole('heading', { name: 'Installation' }),
	).toBeVisible()
})

test(`loading example solid plugin and testing that it's reactive`, async ({
	page,
}) => {
	await page.goto('/plugins')
	await page.locator('input[type="file"]').click()
	await page
		.locator('input[type="file"]')
		.setInputFiles(
			'../example-plugins/solid/pentive-solid-plugin-example-0.0.0.tgz',
		)
	await page.getByRole('link', { name: 'Home' }).click()
	await page.reload()

	const primary = page.getByTestId('primary-count-component')
	const plugin = page.getByTestId('plugin-count-component')
	const child = page.getByTestId('child-count-component')
	const primaryOutput = primary.locator('>output')
	const pluginOutput = plugin.locator('>output')
	const childOutput = child.locator('>output')

	await expect(primaryOutput).toHaveText('1')
	await expect(pluginOutput).toHaveText('1')
	await expect(childOutput).toHaveText('-1')

	await primary.getByRole('button', { name: '+' }).click()
	await plugin.getByRole('button', { name: '+0.1' }).click()
	await child.getByRole('button', { name: '+' }).click()

	await expect(primaryOutput).toHaveText('3.1')
	await expect(pluginOutput).toHaveText('3.1')
	await expect(childOutput).toHaveText('-3.1')
})
