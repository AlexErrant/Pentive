/* eslint-env node */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    "standard",
    "eslint:recommended",
    "plugin:prettier/recommended", // Last to disable conflicting rules
  ],
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      extends: [
        "standard-with-typescript",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
        "plugin:prettier/recommended", // Last to disable conflicting rules
      ],
      plugins: ["@typescript-eslint"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        project: "./tsconfig.json",
      },
      rules: {
        "@typescript-eslint/no-misused-promises": [
          "error",
          {
            checksVoidReturn: {
              arguments: false,
              attributes: false,
            },
          },
        ],
        // https://typescript-eslint.io/rules/naming-convention/#enforce-the-codebase-follows-eslints-camelcase-conventions
        camelcase: "off",
        "@typescript-eslint/naming-convention": [
          "error",
          {
            selector: "default",
            format: ["camelCase"],
          },
          {
            selector: "variable",
            format: ["camelCase", "UPPER_CASE"],
          },
          {
            selector: "parameter",
            format: ["camelCase"],
            leadingUnderscore: "allow",
          },
          {
            selector: "memberLike",
            modifiers: ["private"],
            format: ["camelCase"],
            leadingUnderscore: "require",
          },
          {
            selector: "typeLike",
            format: ["PascalCase"],
          },
          // Exported function components should be PascalCase
          {
            selector: "function",
            modifiers: ["exported"],
            format: ["camelCase", "PascalCase"],
          },
        ],
      },
    },
    {
      files: ["*.tsx"],
      extends: [
        "standard-with-typescript",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
        "plugin:prettier/recommended", // Last to disable conflicting rules
      ],
      plugins: ["@typescript-eslint"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        project: "./tsconfig.json",
      },
      rules: {
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-throw-literal": [
          "error",
          {
            allowThrowingUnknown: true,
          },
        ],
        "@typescript-eslint/explicit-function-return-type": [
          "error",
          {
            allowedNames: ["routeData"],
            allowExpressions: true,
          },
        ],
        "@typescript-eslint/no-misused-promises": [
          "error",
          {
            checksVoidReturn: {
              arguments: false,
              attributes: false,
            },
          },
        ],
        // https://typescript-eslint.io/rules/naming-convention/#enforce-the-codebase-follows-eslints-camelcase-conventions
        camelcase: "off",
        "@typescript-eslint/naming-convention": [
          "error",
          {
            selector: "default",
            format: ["camelCase"],
          },
          {
            selector: "variable",
            format: ["camelCase", "UPPER_CASE", "PascalCase"],
          },
          {
            selector: "parameter",
            format: ["camelCase"],
            leadingUnderscore: "allow",
          },
          {
            selector: "memberLike",
            modifiers: ["private"],
            format: ["camelCase"],
            leadingUnderscore: "require",
          },
          {
            selector: "typeLike",
            format: ["PascalCase"],
          },
          // Exported function components should be PascalCase
          {
            selector: "function",
            modifiers: ["exported"],
            format: ["camelCase", "PascalCase"],
          },
        ],
      },
    },
  ],
}
