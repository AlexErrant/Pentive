import { test, expect } from '@playwright/test'

test(
	`loading example solid plugin and testing that it's reactive`,
	{
		tag: '@prod',
	},
	async ({ page }) => {
		await page.goto('/plugins')
		await page.locator('input[type="file"]').click()
		await page
			.locator('input[type="file"]')
			.setInputFiles(
				'../example-plugins/solid/pentive-solid-plugin-example-0.0.0.tgz',
			)
		await expect(page.getByText('Plugin upserted!')).toBeVisible({
			timeout: 30_000,
		})
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
	},
)
