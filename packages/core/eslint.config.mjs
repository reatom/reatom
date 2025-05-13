// eslint.config.js
import tseslint from 'typescript-eslint'


export default tseslint.config({ files: ['src/**/*.ts'] }, tseslint.configs.base, {
  rules: {
    'no-restricted-syntax': [
      'warn',
      {
        selector: 'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > ArrowFunctionExpression',
        message: 'Use function declaration instead of arrow',
      },
    ],
  },
})
