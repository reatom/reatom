import { computed, withMiddleware, type AtomLike } from '@reatom/core'

/** Keep unconnected and subscribed readers fresh while hiding the writer. */
export const reatomReadonlyView = <T>(source: AtomLike<T>, name: string) =>
  computed(() => source(), name).extend(
    withMiddleware(
      () => (next) => {
        const current = source()
        next()
        return current
      },
      'read',
    ),
  )
