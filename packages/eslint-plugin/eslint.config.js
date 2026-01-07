const js = require('@eslint/js')
const tseslint = require('typescript-eslint')
const globals = require('globals')

module.exports = tseslint.config({
  languageOptions: {
    ecmaVersion: 'latest',
    globals: globals.node,
  },
  ignores: ['build'],
  files: ['**/*.{ts,tsx}'],
  extends: [js.configs.recommended, ...tseslint.configs.recommended],
})
