import { defineConfig, devices } from '@playwright/test'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const mode = process.env.MODE
const isDev = mode === 'development'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
dotenv.config({
	path: path.resolve(dirname, `.env.${mode ?? 'test'}`),
})
const env = process.env as unknown as ExtendedProcessEnv

const isCI = Boolean(process.env.CI)

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
	testDir: './tests',
	/* Run tests in files in parallel */
	fullyParallel: true,
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: isCI,
	/* Retry on CI only */
	retries: isCI ? 2 : 0,
	/* Opt out of parallel tests on CI. */
	workers: 1,
	/* Reporter to use. See https://playwright.dev/docs/test-reporters */
	reporter: 'html',
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		/* Base URL to use in actions like `await page.goto('/')`. */
		baseURL: env.VITE_APP_ORIGIN,

		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
		trace: 'on-first-retry',
		ignoreHTTPSErrors: true,
	},

	/* Configure projects for major browsers */
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},

		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] },
		},

		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'] },
		},

		/* Test against mobile viewports. */
		// {
		//   name: 'Mobile Chrome',
		//   use: { ...devices['Pixel 5'] },
		// },
		// {
		//   name: 'Mobile Safari',
		//   use: { ...devices['iPhone 12'] },
		// },

		/* Test against branded browsers. */
		// {
		//   name: 'Microsoft Edge',
		//   use: { ...devices['Desktop Edge'], channel: 'msedge' },
		// },
		// {
		//   name: 'Google Chrome',
		//   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
		// },
	],

	/* Run your local dev server before starting the tests */
	webServer: [
		{
			command: isDev ? 'pnpm dev' : 'pnpm previewTest',
			cwd: '../app',
			url: env.VITE_APP_ORIGIN,
			ignoreHTTPSErrors: true,
			reuseExistingServer: !isCI,
		},
		{
			command: isDev ? 'pnpm dev' : 'pnpm previewTest',
			cwd: '../app-ugc',
			url: env.VITE_APP_UGC_ORIGIN,
			ignoreHTTPSErrors: true,
			reuseExistingServer: !isCI,
		},
	],
})
