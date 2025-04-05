const js = require('@eslint/js')
const tseslint = require('typescript-eslint')
const globals = require("globals")
const plugin = require('./build')

module.exports = tseslint.config(
  {
    languageOptions: {
      ecmaVersion: "latest",
      globals: globals.node,
    },
    ignores: ["build"],
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
  },
  {
    files: ["examples/**/*.{ts,tsx}"],
    plugins: {
      "@reatom": plugin,
    },
    extends: [
      plugin.configs.recommended,
    ],
  },
)
