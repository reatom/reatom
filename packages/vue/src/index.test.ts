import { test, expect } from 'vitest'
import { createApp, effectScope } from 'vue'
import { atom, clearStack, context, withConnectHook } from '@reatom/core'
import { reatomRef, createReatomVue } from './index'

clearStack()

test(
  'reatomRef',
  context.start(() => () => {
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
      const app = createApp({})
      app.use(createReatomVue(context.start()))
      const stateRef = reatomRef(state)
      expect(connected).toBe(true)
      expect(stateRef.value).toBe(0)
      expect(connected).toBe(true)
      expect((stateRef.value = 1)).toBe(1)
      expect(stateRef.value).toBe(1)
      expect(state()).toBe(1)
      state.set(2)
      expect(stateRef.value).toBe(2)
    })

    expect(connected).toBe(true)
    scope.stop()
    expect(connected).toBe(false)
  }),
)
