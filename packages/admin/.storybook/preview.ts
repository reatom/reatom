/// <reference path="../src/global.d.ts" />
import { urlAtom } from '@reatom/core'

import {
  clearAdminStorage,
  clearCurrentDevtools,
  currentDevtools,
  runStoryCleanups,
} from '../src/stories/helpers'

const FALLBACK_VIEWPORT = { width: 1280, height: 720 } as const
type ViewportGlobal = { value?: string } | string | undefined
type PreviewGlobals = Record<string, ViewportGlobal>

const breakpointWidths: Record<string, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
}

function getViewportSize(
  name: string,
): { width: number; height: number } | null {
  const width = breakpointWidths[name]
  if (width === undefined) return null
  return { width, height: FALLBACK_VIEWPORT.height }
}

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
