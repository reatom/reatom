import { urlAtom } from '@reatom/core'
import { mount } from '@reatom/jsx'

import { ADMIN_FRAME } from '../../root'
import {
  clearAdminStorage,
  clearCurrentDevtools,
  registerStoryCleanup,
  setCurrentDevtools,
} from '../../testing/storybook-runtime'
import { createAdminDevtools } from '../../view'
import type { repositoryStarCountResource } from './src/components/Footer'

export type GithubStarsMode = 'success' | 'error'

export interface XoHarnessOptions {
  githubStarsMode?: GithubStarsMode
}

const githubStarsState = {
  mode: 'success' as GithubStarsMode,
}

type GithubStarsResource = typeof repositoryStarCountResource
type PersistentDevtools = ReturnType<typeof createAdminDevtools>

function mockFetchResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

function mockFetchErrorResponse(message: string): Response {
  return new Response(JSON.stringify({ message }), {
    status: 503,
    statusText: message,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

function installEnvironmentMocks({
  githubStarsMode = 'success',
}: XoHarnessOptions): () => void {
  githubStarsState.mode = githubStarsMode
  const originalFetch = globalThis.fetch
  const originalVibrateDescriptor = Object.getOwnPropertyDescriptor(
    Navigator.prototype,
    'vibrate',
  )

  globalThis.fetch = async (input, init) => {
    const requestUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url

    if (requestUrl === 'https://api.github.com/repos/reatom/reatom') {
      if (githubStarsState.mode === 'error') {
        return mockFetchErrorResponse('Service Unavailable')
      }
      return mockFetchResponse({ stargazers_count: 12345 })
    }

    return originalFetch(input, init)
  }

  Object.defineProperty(Navigator.prototype, 'vibrate', {
    value: () => false,
    configurable: true,
    writable: true,
  })

  return () => {
    githubStarsState.mode = 'success'
    globalThis.fetch = originalFetch
    if (originalVibrateDescriptor) {
      Object.defineProperty(
        Navigator.prototype,
        'vibrate',
        originalVibrateDescriptor,
      )
      return
    }
    Reflect.deleteProperty(Navigator.prototype, 'vibrate')
  }
}

async function bootXoApplication(target: HTMLElement): Promise<() => void> {
  await import('./src/setup')
  const { App } = await import('./src/App')
  const mountedApplication = mount(target, <App />)
  return mountedApplication.unmount
}

let persistentDevtools: PersistentDevtools | null = null

function getPersistentDevtools(): PersistentDevtools {
  if (persistentDevtools) return persistentDevtools
  persistentDevtools = createAdminDevtools({
    initialWidth: '560px',
    initialHeight: '760px',
  })
  return persistentDevtools
}

function resetPersistentAdminState(devtools: PersistentDevtools): void {
  clearAdminStorage()
  devtools.show()

  ADMIN_FRAME.run(() => {
    urlAtom.go('/')
    devtools.admin.reporter.paused.setFalse()
    devtools.admin.reporter.clear()
    devtools.admin.store.clear()
    devtools.admin.session.start()
    devtools.admin.filters.search.searchQuery.set('')
    devtools.admin.filters.search.searchTarget.set('all')
    devtools.admin.filters.engine.clearConfigs()
    devtools.admin.filters.expression.setExpression({
      operator: 'AND',
      children: [],
    })
  })
}

async function refreshGithubStarsRequest(mode: GithubStarsMode): Promise<void> {
  githubStarsState.mode = mode
  const footerModule = await import('./src/components/Footer')
  const githubStarsResource: GithubStarsResource =
    footerModule.repositoryStarCountResource
  githubStarsResource.retry()
}

export function renderXoHarness(
  options: XoHarnessOptions = {},
): HTMLDivElement {
  const storyRoot = document.createElement('div')
  storyRoot.dataset.testid = 'xo-story-root'
  storyRoot.style.width = '100%'
  storyRoot.style.minHeight = '100vh'

  const applicationRoot = document.createElement('div')
  applicationRoot.id = 'app'
  storyRoot.append(applicationRoot)

  void (async () => {
    const restoreEnvironment = installEnvironmentMocks(options)
    const devtools = getPersistentDevtools()
    resetPersistentAdminState(devtools)
    setCurrentDevtools(devtools)

    let unmountApplication: (() => void) | null = null

    registerStoryCleanup(() => {
      try {
        unmountApplication?.()
      } catch {
        return
      } finally {
        devtools.hide()
        clearCurrentDevtools()
        restoreEnvironment()
        applicationRoot.replaceChildren()
      }
    })

    unmountApplication = await bootXoApplication(applicationRoot)
    await refreshGithubStarsRequest(options.githubStarsMode ?? 'success')
  })()

  return storyRoot
}
