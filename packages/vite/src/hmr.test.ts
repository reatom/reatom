import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  createServer,
  createServerModuleRunner,
  type PluginOption,
  type ViteDevServer,
} from 'vite'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { reatom } from './plugin.ts'

type Core = typeof import('@reatom/core')
type App = { renderApp: () => unknown }
type Routes = { layoutRoute: { render: () => unknown } }

const routesSource = `
import { reatomRoute } from '@reatom/core'

globalThis.routesEvaluations = (globalThis.routesEvaluations ?? 0) + 1

export const layoutRoute = reatomRoute({
  layout: true,
  render({ outlet }) {
    return \`layout[\${outlet().join(',')}]\`
  },
}, 'layoutRoute')

export const childRoute = layoutRoute.reatomRoute({
  path: 'child',
  render() {
    return 'child'
  },
}, 'childRoute')
`

const appSource = `
import { layoutRoute } from './routes.ts'

export const renderApp = () => layoutRoute.render()
`

const packageRoot = fileURLToPath(new URL('..', import.meta.url))
const evaluations = globalThis as { routesEvaluations?: number }

let root: string
let server: ViteDevServer
let runner: ReturnType<typeof createServerModuleRunner>

// Without window urlAtom starts at '/', and a full reload hands back a fresh core.
const openChildUrl = async () => {
  const core: Core = await runner.import('@reatom/core')
  if (core.urlAtom()?.pathname === '/child') return
  core.urlAtom.sync.set(() => () => {})
  core.urlAtom.set(new URL('http://localhost/child'))
}

// In the monorepo core resolves outside node_modules, so the plugin must not see it.
const start = async (plugins: PluginOption[]) => {
  server = await createServer({
    root,
    configFile: false,
    plugins,
    server: { middlewareMode: true },
    logLevel: 'silent',
  })
  runner = createServerModuleRunner(server.environments.ssr)
  await openChildUrl()
}

const editRoutes = async () => {
  const before = evaluations.routesEvaluations ?? 0
  await writeFile(join(root, 'routes.ts'), `${routesSource}\n// edited\n`)
  await vi.waitFor(
    async () => {
      expect(evaluations.routesEvaluations).toBeGreaterThan(before)
      await openChildUrl()
      const routes: Routes = await runner.import('/routes.ts')
      expect(routes.layoutRoute.render()).toBe('layout[child]')
    },
    { timeout: 3000 },
  )
}

describe('route HMR through a real Vite dev server', () => {
  beforeEach(async () => {
    root = await mkdtemp(join(packageRoot, '.hmr-fixture-'))
    await writeFile(join(root, 'routes.ts'), routesSource)
    await writeFile(join(root, 'app.ts'), appSource)
    evaluations.routesEvaluations = 0
  })

  afterEach(async () => {
    await runner?.close()
    await server?.close()
    await rm(root, { recursive: true, force: true })
  })

  test('an importer of the layout route keeps rendering its child after routes.ts is edited', async () => {
    await start([reatom({ include: [root] })])
    const app: App = await runner.import('/app.ts')
    expect(app.renderApp()).toBe('layout[child]')

    await editRoutes()

    expect(app.renderApp()).toBe('layout[child]')
  })

  test('without the plugin the importer is re-evaluated and renders the child', async () => {
    await start([])
    await runner.import('/app.ts')

    await editRoutes()

    const app: App = await runner.import('/app.ts')
    expect(app.renderApp()).toBe('layout[child]')
  })
})
