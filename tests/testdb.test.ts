import { test, expect } from "@playwright/test"

test.beforeEach(({ page }) => {
  // https://playwright.dev/docs/api/class-page#page-event-console
  page.on("console", async (msg) => {
    const args = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      msg.args().map(async (a) => await a.jsonValue())
    )
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    console.log(...args)
  })

  page.on("pageerror", (exception) => {
    throw exception
  })
})

test("all rxdb roundtrip tests in /testdb pass", async ({ page }) => {
  await page.goto("/testdb")
  const testStatus = page.locator("#testStatus")

  await expect(testStatus).toHaveText("✔ Passed!")
})
