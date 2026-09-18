import { defineConfig } from 'vite'

const crossOriginIsolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

export default defineConfig({
  optimizeDeps: {
    exclude: ['libraw-wasm'],
  },
  server: {
    headers: crossOriginIsolationHeaders,
  },
  preview: {
    headers: crossOriginIsolationHeaders,
  },
  oxc: {
    jsx: {
      runtime: 'classic',
      pragma: 'h',
      pragmaFrag: 'hf',
      throwIfNamespace: false,
    },
    jsxInject: `import { h, hf } from "@reatom/jsx"`,
  },
})
