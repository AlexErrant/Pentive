import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    exclude: [
      ...configDefaults.exclude,
      "tests-examples/*",
      "tests/testdb.test.ts",
    ],
    environment: "jsdom",
  },
})
