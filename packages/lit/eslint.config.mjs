import globals from 'globals'

export default [
  {
    files: ['src/wrt-simple.test.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.mocha,
      },
    },
  },
]
