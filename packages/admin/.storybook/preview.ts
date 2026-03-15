import { urlAtom } from '@reatom/core'
import type { Preview } from '@storybook/html'

import { clearCurrentDevtools, currentDevtools } from '../src/stories/helpers'

function clearAdminStorage(): void {
  if (typeof window === 'undefined') return

  const adminKeys = Object.keys(localStorage).filter(
    (key) => key.startsWith('_Admin.') || key.startsWith('_Admin'),
  )
  for (const key of adminKeys) {
    localStorage.removeItem(key)
  }
}

const preview: Preview = {
  beforeEach() {
    urlAtom.routes = {}
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.replaceState({}, '', '/')
    }
    clearAdminStorage()
    return () => {
      if (currentDevtools) {
        currentDevtools.hide()
        currentDevtools.admin.dispose()
        clearCurrentDevtools()
      }
      clearAdminStorage()
    }
  },
}

export default preview
