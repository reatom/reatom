import { computed, reatomBoolean, withAsyncData, wrap } from '@reatom/core'

export const nearestSearchOpen = reatomBoolean(false, 'nearestSearchOpen').extend(
  (target) => ({
    module: computed(async () => {
      if (!target()) return null
      return await wrap(import('../nearest-production'))
    }, `${target.name}.module`).extend(withAsyncData({ initState: null })),
  }),
)
