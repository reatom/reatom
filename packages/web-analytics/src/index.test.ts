import { test, expect, vi } from 'vitest'
import { connectWebAnalytics } from './index'

test('connectWebAnalytics initializes correctly', () => {
  const withOTelMock = vi.fn((opts) => (target: any) => target)

  const analytics = connectWebAnalytics({ withOTel: withOTelMock as any })

  expect(analytics.trackEvent).toBeDefined()
  expect(analytics.urlAtom).toBeDefined()
  expect(analytics.visibilityAtom).toBeDefined()
  expect(analytics.onlineAtom).toBeDefined()
  expect(analytics.focusAtom).toBeDefined()

  expect(withOTelMock).toHaveBeenCalledWith({ kind: 'client' })
})
