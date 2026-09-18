import { effect } from '@reatom/core'

import { designation } from '../model'

/** Mount-scoped side effects: keeps the tab title in sync with the design. */
export const Bridge = () => (
  <div
    style={{ display: 'none' }}
    ref={() => {
      const listener = effect(() => {
        document.title = designation.documentTitle()
      }, 'documentTitle.listener')

      return () => listener.unsubscribe()
    }}
  />
)
