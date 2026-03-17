import { mount } from '@reatom/jsx'

import { createAdminDevtools } from '../../view'
import {
  clearAdminStorage,
  registerStoryCleanup,
  setCurrentDevtools,
} from '../../testing/storybook-runtime'

function mockFetchResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

function installEnvironmentMocks(): () => void {
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
    globalThis.fetch = originalFetch
    if (originalVibrateDescriptor) {
      Object.defineProperty(
        Navigator.prototype,
        'vibrate',
        originalVibrateDescriptor,
      )
      return
    }
    delete (Navigator.prototype as Navigator & { vibrate?: unknown }).vibrate
  }
}

async function bootXoApplication(target: HTMLElement): Promise<() => void> {
  await import('./src/setup')
  const { App } = await import('./src/App')
  const mountedApplication = mount(target, <App />)
  return mountedApplication.unmount
}

export function renderXoHarness(): HTMLDivElement {
  const storyRoot = document.createElement('div')
  storyRoot.dataset.testid = 'xo-story-root'
  storyRoot.style.width = '100%'
  storyRoot.style.minHeight = '100vh'

  const applicationRoot = document.createElement('div')
  applicationRoot.id = 'app'
  storyRoot.append(applicationRoot)

  void (async () => {
    const restoreEnvironment = installEnvironmentMocks()
    clearAdminStorage()

    const devtools = createAdminDevtools({
      initialWidth: '560px',
      initialHeight: '760px',
    })
    setCurrentDevtools(devtools)

    let unmountApplication: (() => void) | null = null

    registerStoryCleanup(() => {
      unmountApplication?.()
      restoreEnvironment()
      storyRoot.replaceChildren()
    })

    unmountApplication = await bootXoApplication(applicationRoot)
  })()

  return storyRoot
}
