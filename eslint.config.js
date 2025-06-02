import js from "@eslint/js";
// import reatomPlugin from "@reatom/eslint-plugin";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // {
  //   plugins: {
  //     "@reatom": reatomPlugin,
  //   },
  //   rules: {
  //     ...reatomPlugin.configs.recommended.rules,
  //   },
  // },
  {
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-unused-vars": "off", // Disabled in favor of unused-imports/no-unused-vars
      "@typescript-eslint/no-explicit-any": "off", // Life is hard
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-expressions': 'warn',
      'prefer-const': 'off',
      'no-var': 'off',
      'prefer-rest-params': 'off',
      'prefer-spread': 'off',
      'no-async-promise-executor': 'off',
      // TODO the rules below should be restored and relative errors should be fixed
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        project: ["./tsconfig.json"], // Adjust if your tsconfig is located elsewhere
      },
    },
    files: ["**/*.ts", "**/*.tsx"],
  }
);
