import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { AstroIntegration } from 'astro'

import { publishedExamples } from '../published-examples'

export function publishExamples(): AstroIntegration {
  let siteBase = '/'

  return {
    name: 'publish-examples',
    hooks: {
      'astro:config:done'({ config }) {
        siteBase = config.base
      },
      'astro:build:done'({ dir, logger }) {
        const distDir = fileURLToPath(dir)
        const repoRoot = resolve(distDir, '../..')
        const viteBasePrefix = withTrailingSlash(siteBase)
        const jsxDist = resolve(repoRoot, 'packages/jsx/dist/index.js')

        if (!existsSync(jsxDist)) {
          execFileSync('pnpm', ['--filter', '@reatom/jsx', 'run', 'build'], {
            cwd: repoRoot,
            stdio: 'inherit',
          })
        }

        for (const name of publishedExamples) {
          const exampleDir = resolve(repoRoot, 'examples', name)
          const viteBase = `${viteBasePrefix}examples/${name}/`

          execFileSync('pnpm', ['exec', 'vite', 'build', '--base', viteBase], {
            cwd: exampleDir,
            stdio: 'inherit',
          })

          const destination = resolve(distDir, 'examples', name)
          rmSync(destination, { recursive: true, force: true })
          mkdirSync(resolve(distDir, 'examples'), { recursive: true })
          cpSync(resolve(exampleDir, 'dist'), destination, { recursive: true })
          logger.info(`Published /examples/${name}/`)
        }
      },
    },
  }
}

function withTrailingSlash(base: string): string {
  if (!base || base === '/') return '/'
  return `/${base.replace(/^\/+|\/+$/g, '')}/`
}
