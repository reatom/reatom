import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  css: {
    modules: {},
  },
  esbuild: {
    minifyIdentifiers: false,
  },
  build: {
    lib: {
      formats: ['es'],
      entry: './src/index.tsx',
      fileName: 'index',
    },
    outDir: 'build',
  },
  plugins: [dts({ include: 'src' })],
})
