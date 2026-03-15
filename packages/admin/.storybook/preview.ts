import { urlAtom } from '@reatom/core'
import type { Preview } from '@storybook/html'

import {
  clearAdminStorage,
  clearCurrentDevtools,
  currentDevtools,
} from '../src/stories/helpers'

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
