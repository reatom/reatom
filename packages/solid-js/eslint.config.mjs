import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tsEslintPlugin from '@typescript-eslint/eslint-plugin';
import tsEslintParser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsEslintParser,
      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: process.cwd(),
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsEslintPlugin,
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      // Import sorting
      "simple-import-sort/exports": "error",
      "simple-import-sort/imports": "error",

      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error'],
    },
    settings: {
      'import/resolver': {
        typescript: {},
      },
    },
  },
  {
    ignores: [
        '*.config.js',
        '*.d.ts',
        '*.mjs',
        'CHANGELOG.md',
        'README.md',
        'build',
        'dist',
        'node_modules',
      ],
  },
];
