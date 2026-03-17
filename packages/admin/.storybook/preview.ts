/// <reference path="../src/global.d.ts" />
import { urlAtom } from '@reatom/core'

import {
  clearAdminStorage,
  clearCurrentDevtools,
  currentDevtools,
  runStoryCleanups,
} from '../src/testing/storybook-runtime'
import { FALLBACK_VIEWPORT, getViewportSize } from './viewports'

type ViewportGlobal = { value?: string } | string | undefined
type PreviewGlobals = Record<string, ViewportGlobal>

const preview = {
  parameters: {
    a11y: { test: 'todo' },
  },
  async beforeEach({ globals }: { globals: PreviewGlobals }) {
    urlAtom.routes = {}
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.replaceState({}, '', '/')
    }
    clearAdminStorage()

    if (import.meta.env['VITEST']) {
      const { page } = await import('vitest/browser')
      const viewportGlobal = globals['viewport']
      const viewportName =
        typeof viewportGlobal === 'string'
          ? viewportGlobal
          : viewportGlobal?.value
      const viewport =
        (viewportName ? getViewportSize(viewportName) : null) ??
        FALLBACK_VIEWPORT
      await page.viewport(viewport.width, viewport.height)
    }

    return () => {
      if (currentDevtools) {
        currentDevtools.hide()
        currentDevtools.admin.dispose()
        clearCurrentDevtools()
      }
      runStoryCleanups()
      clearAdminStorage()
    }
  },
}

export default preview
