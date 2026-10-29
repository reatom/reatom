import { playwright } from '@vitest/browser-playwright'
import { transformSync } from 'esbuild'
import { resolve } from 'node:path'
import ts from '@typescript/typescript6'
import { defineConfig } from 'vitest/config'

const runtimeTests = ['typescript', 'esbuild'].flatMap((compiler) =>
  [false, true].map((development) => ({
    extends: true as const,
    plugins: [
      {
        name: `automatic-jsx-${compiler}-${development}`,
        enforce: 'pre' as const,
        transform(code: string, id: string) {
          if (!id.endsWith('/src/jsxRuntime.test.tsx')) return
          if (compiler === 'esbuild')
            return transformSync(code, {
              loader: 'tsx',
              jsx: 'automatic',
              jsxImportSource: '@reatom/jsx',
              jsxDev: development,
              target: 'esnext',
              sourcemap: 'inline',
              sourcefile: id,
            })
          return {
            code: ts.transpileModule(code, {
              fileName: id,
              compilerOptions: {
                jsx: development ? ts.JsxEmit.ReactJSXDev : ts.JsxEmit.ReactJSX,
                jsxImportSource: '@reatom/jsx',
                target: ts.ScriptTarget.ESNext,
                module: ts.ModuleKind.ESNext,
                sourceMap: false,
              },
            }).outputText,
          }
        },
      },
    ],
    test: {
      name: `@reatom/jsx-${compiler}-${development ? 'development' : 'production'}`,
      include: ['./src/jsxRuntime.test.tsx'],
      browser: {
        enabled: true,
        provider: playwright(),
        headless: true,
        screenshotFailures: false,
        instances: [{ browser: 'chromium' as const }],
      },
    },
  })),
)

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@reatom\/jsx(?:\/jsx(?:-dev)?-runtime)?$/,
        replacement: resolve(import.meta.dirname, 'src/index.ts'),
      },
    ],
  },
  oxc: {
    jsx: {
      runtime: 'classic',
      pragma: 'h',
      pragmaFrag: 'hf',
      throwIfNamespace: false,
      development: false,
    },
  },
  test: {
    projects: [
      ...runtimeTests,
      {
        extends: true,
        test: {
          sequence: { groupOrder: 13 },
          testTimeout: 5000,
          name: '@reatom/jsx',
          include: ['./src/**/*.test.tsx'],
          exclude: ['./src/jsxRuntime.test.tsx'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            screenshotFailures: false,
            instances: [
              {
                name: 'jsx-chromium',
                browser: 'chromium',
              },
            ],
          },
        },
      },
      {
        extends: true,
        test: {
          name: '@reatom/jsx-types',
          include: ['./src/**/*.test-d.ts'],
          environment: 'node',
        },
      },
    ],
  },
})
