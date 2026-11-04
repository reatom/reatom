import { expect, test } from 'vitest'
import { nativeEvent } from './events.ts'

test('native resource contract names, rounds metrics and joins document navigation', () => {
  const event = nativeEvent(
    'browser.performance.resource',
    {
      'url.full': 'https://shop.test/resource',
      'performance.duration': 12.6,
      'performance.tcp_handshake_time': -2,
      'performance.navigation_entry_id': 'nav',
      'performance.resource_entry_id': 'resource',
      'performance.initiator_type': 'fetch',
    },
    {},
  )
  expect(event).toEqual({
    name: 'faro.performance.resource',
    attributes: {
      name: 'https://shop.test/resource',
      duration: '13',
      tcpHandshakeTime: '0',
      dnsLookupTime: 'unknown',
      tlsNegotiationTime: 'unknown',
      redirectTime: 'unknown',
      requestTime: 'unknown',
      responseTime: 'unknown',
      fetchTime: 'unknown',
      serviceWorkerTime: 'unknown',
      decodedBodySize: 'unknown',
      encodedBodySize: 'unknown',
      transferSize: 'unknown',
      ttfb: 'unknown',
      responseStatus: 'unknown',
      renderBlockingStatus: 'unknown',
      initiatorType: 'fetch',
      cacheHitStatus: 'unknown',
      protocol: 'unknown',
      httpHost: 'unknown',
      visibilityState: 'unknown',
      faroNavigationId: 'nav',
      faroResourceId: 'resource',
    },
  })
})

test('native navigation includes original IDs and navigation timings', () => {
  expect(
    nativeEvent(
      'browser.performance.navigation',
      {
        'performance.navigation_entry_id': 'current',
        'performance.previous_navigation_entry_id': 'previous',
        'performance.page_load_time': 10.4,
        'performance.document_parsing_time': 3.7,
        'performance.navigation_type': 'reload',
      },
      {},
    ),
  ).toMatchObject({
    name: 'faro.performance.navigation',
    attributes: {
      faroNavigationId: 'current',
      faroPreviousNavigationId: 'previous',
      pageLoadTime: '10',
      documentParsingTime: '4',
      type: 'reload',
      domProcessingTime: 'unknown',
      onLoadTime: 'unknown',
    },
  })
})

test('upstream user action event has native string attributes and action identity', () => {
  expect(
    nativeEvent(
      'browser.user_action',
      {
        'action.id': 'action',
        'action.name': 'checkout',
        'action.start_time': 100,
        'action.end_time': 112,
        'action.duration': 12.5,
        'action.trigger': 'pointerdown',
        'action.importance': 'normal',
      },
      {},
    ),
  ).toEqual({
    name: 'faro.user.action',
    action: { id: 'action', name: 'checkout' },
    attributes: {
      userActionName: 'checkout',
      userActionStartTime: '100',
      userActionEndTime: '112',
      userActionDuration: '12.5',
      userActionTrigger: 'pointerdown',
      userActionImportance: 'normal',
    },
  })
})

test('frustration and CSP retain string attributes; page views are distinct from view changes', () => {
  const attrs = {
    target: '#checkout',
    clickCount: '3',
    clientX: '5',
    durationMs: '100',
  }
  expect(nativeEvent('browser.frustration.rage_click', {}, attrs)).toEqual({
    name: 'faro.frustration.rage_click',
    attributes: attrs,
  })
  expect(nativeEvent('securitypolicyviolation', {}, attrs)).toEqual({
    name: 'securitypolicyviolation',
    attributes: attrs,
  })
  expect(nativeEvent('app.page_view', {}, {})).toEqual({
    name: 'app.page_view',
    attributes: {},
  })
})

test('explicit view transition preserves source fromView and toView', () => {
  expect(
    nativeEvent(
      'app.view_change',
      { fromView: 'cart', toView: 'checkout' },
      {},
    ),
  ).toEqual({
    name: 'view_changed',
    attributes: { fromView: 'cart', toView: 'checkout' },
  })
})
