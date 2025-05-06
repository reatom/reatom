import { test, expect } from 'vitest'
import { effectScope } from 'vue'
import { atom, clearStack, context, withConnectHook } from '@reatom/core'
import { reatomRef } from './'

clearStack()

test(
  'reatomRef',
  context.start(() => async () => {
    let connected = false
    const state = atom(0).extend(
      withConnectHook(() => {
        connected = true
        return () => {
          connected = false
        }
      }),
    )

    expect(connected).toBe(false)

    const scope = effectScope()
    scope.run(() => {
      // FIXME
      // app.use(top())
      const stateRef = reatomRef(state)
      expect(connected).toBe(true)
      expect(stateRef.value).toBe(0)
      expect(connected).toBe(true)
      expect((stateRef.value = 1)).toBe(1)
      expect(stateRef.value).toBe(1)
      expect(state()).toBe(1)
      state(2)
      expect(stateRef.value).toBe(2)
    })

    expect(connected).toBe(true)
    scope.stop()
    expect(connected).toBe(false)
  }),
)
