import { withBrowserNetworkMonkeypatch } from '../browser-network/index.ts'
import {
  browserCaptureOf,
  markTelemetryUrl,
  installBrowserCapture,
} from '../browserCapture.ts'
import {
  browserActionAttributes,
  startBrowserActivity,
} from '../browserActivity.ts'
import { expect, test, inject, vi } from 'vitest'
import { reatomTestTelemetry } from '../test-helpers.ts'
import { withBrowserActions } from './index.ts'
import { withBrowserCsp } from '../browser-csp/index.ts'

test('named action activity emits upstream schema and rage burst stays bounded and disposes', async () => {
  const otel = reatomTestTelemetry({ name: 'actions', endpoint: null }).extend(
    withBrowserActions(),
  )
  const button = document.createElement('button')
  button.setAttribute('data-faro-user-action-name', 'save')
  document.body.append(button)
  button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
  button.setAttribute('aria-busy', 'true')
  await expect
    .poll(
      () =>
        otel
          .records()
          .filter((record: any) => record.eventName === 'browser.user_action')
          .length,
    )
    .toBe(1)
  for (let index = 0; index < 3; index++)
    button.dispatchEvent(
      new MouseEvent('click', { bubbles: true, clientX: 10, clientY: 20 }),
    )
  await expect
    .poll(
      () =>
        otel
          .records()
          .filter(
            (record: any) =>
              record.eventName === 'browser.frustration.rage_click',
          ).length,
      { timeout: 2000 },
    )
    .toBe(1)
  const rage = otel
    .records()
    .find(
      (record: any) => record.eventName === 'browser.frustration.rage_click',
    ) as any
  expect(rage.attributes.clickCount).toBe('3')
  expect(rage.attributes.target).toBe('button')
  otel.browserActions.setFalse()
  button.click()
  button.remove()
  otel.dispose()
})

test('CSP strips sensitive URL portions and excludes samples by default', () => {
  const otel = reatomTestTelemetry({ name: 'csp', endpoint: null }).extend(
    withBrowserCsp(),
  )
  document.dispatchEvent(
    new SecurityPolicyViolationEvent('securitypolicyviolation', {
      blockedURI: 'https://example.com/script?token=secret#private',
      documentURI: 'https://example.com/page?q=private',
      effectiveDirective: 'script-src',
      sample: 'secret sample',
      originalPolicy: 'private policy',
    }),
  )
  const record = otel
    .records()
    .find(
      (record: any) => record.eventName === 'securitypolicyviolation',
    ) as any
  expect(record.attributes.blockedURI).toBe('https://example.com/script')
  expect(record.attributes.sample).toBeUndefined()
  otel.browserCsp.setFalse()
  document.dispatchEvent(
    new SecurityPolicyViolationEvent('securitypolicyviolation'),
  )
  expect(
    otel
      .records()
      .filter((record: any) => record.eventName === 'securitypolicyviolation'),
  ).toHaveLength(1)
  otel.dispose()
})

test('named action waits for physical slow fetch and request captures action identity at start', async () => {
  const native = fetch
  const base = inject('otelCollectorUrl')
  await native(base + '/control/hold', { method: 'POST' })
  const otel = reatomTestTelemetry({
    name: 'slow-action',
    endpoint: null,
  }).extend(
    withBrowserNetworkMonkeypatch(),
    withBrowserActions({ frustration: false }),
  )
  const button = document.createElement('button')
  button.setAttribute('data-faro-user-action-name', 'save-slow')
  document.body.append(button)
  const requestUrl = base + '/collector/allow/action-app/v1/traces'
  let request: Promise<Response> | undefined
  try {
    button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    request = fetch(requestUrl, { method: 'POST', body: '{}' })
    await new Promise((resolve) => setTimeout(resolve, 250))
    expect(
      otel
        .records()
        .filter((record: any) => record.eventName === 'browser.user_action'),
    ).toHaveLength(0)
    await native(base + '/control/release', { method: 'POST' })
    await request
    await expect
      .poll(
        () =>
          otel
            .records()
            .filter((record: any) => record.eventName === 'browser.user_action')
            .length,
      )
      .toBe(1)
    const action = otel
      .records()
      .find((record: any) => record.eventName === 'browser.user_action') as any
    const network = otel
      .records()
      .find(
        (record: any) =>
          record.kind === 'client' &&
          record.attributes['url.full'] === requestUrl,
      ) as any
    expect(action.attributes['action.duration']).toBeGreaterThanOrEqual(250)
    expect(network.attributes['action.id']).toBe(action.attributes['action.id'])
    expect(network.attributes['action.name']).toBe('save-slow')
    expect(browserActionAttributes(browserCaptureOf(otel)!)).toEqual({})
  } finally {
    await native(base + '/control/release', { method: 'POST' })
    await request
    button.remove()
    otel.dispose()
  }
})

test('collector requests cannot validate a named action and toggles clean in-flight activity', async () => {
  const native = fetch
  const base = inject('otelCollectorUrl')
  const collector = base + '/collector/allow/action-collector/v1/traces'
  markTelemetryUrl(collector)
  const otel = reatomTestTelemetry({
    name: 'action-cleanup',
    endpoint: null,
  }).extend(
    withBrowserNetworkMonkeypatch(),
    withBrowserActions({ frustration: false }),
  )
  const button = document.createElement('button')
  button.setAttribute('data-faro-user-action-name', 'self-exclusion')
  document.body.append(button)
  await new Promise((resolve) => setTimeout(resolve, 0))
  try {
    button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await fetch(collector, { method: 'POST', body: '{}' })
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(
      otel
        .records()
        .filter((record: any) => record.eventName === 'browser.user_action'),
    ).toHaveLength(0)
    await native(base + '/control/hold', { method: 'POST' })
    button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    const request = fetch(base + '/collector/allow/action-cleanup/v1/traces', {
      method: 'POST',
      body: '{}',
    })
    otel.browserActions.setFalse()
    expect(browserActionAttributes(browserCaptureOf(otel)!)).toEqual({})
    otel.browserNetwork.setFalse()
    await native(base + '/control/release', { method: 'POST' })
    await request
    expect(
      otel
        .records()
        .filter((record: any) => record.eventName === 'browser.user_action'),
    ).toHaveLength(0)
    expect(fetch).toBe(native)
  } finally {
    await native(base + '/control/release', { method: 'POST' })
    button.remove()
    otel.dispose()
  }
})

test('an unfinished request cannot retain action identity or timers beyond the 10 second halt bound', async () => {
  const button = document.createElement('button')
  button.setAttribute('data-faro-user-action-name', 'bounded')
  document.body.append(button)
  const otel = reatomTestTelemetry({
    name: 'action-bound',
    endpoint: null,
  }).extend(withBrowserActions({ frustration: false }))
  const capture = browserCaptureOf(otel)!
  vi.useFakeTimers()
  let end = () => {}
  try {
    button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    end = startBrowserActivity(capture)
    await vi.advanceTimersByTimeAsync(100)
    expect(browserActionAttributes(capture)).toEqual({})
    expect(
      otel
        .records()
        .filter((record: any) => record.eventName === 'browser.user_action'),
    ).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(10000)
    expect(
      otel
        .records()
        .filter((record: any) => record.eventName === 'browser.user_action'),
    ).toHaveLength(1)
    end()
    await vi.advanceTimersByTimeAsync(10000)
    expect(
      otel
        .records()
        .filter((record: any) => record.eventName === 'browser.user_action'),
    ).toHaveLength(1)
  } finally {
    end()
    otel.dispose()
    vi.useRealTimers()
    button.remove()
  }
})

for (const mutation of ['dispose', 'disable', 'throw'] as const) {
  test(`snapshot reentrant ${mutation} cannot leave an action identity or timer`, async () => {
    const otel = reatomTestTelemetry({
      name: `reentrant-action-${mutation}`,
      endpoint: null,
    })
    const original = browserCaptureOf(otel)!
    let mutate = () => {}
    const capture = {
      ...original,
      snapshot: () => {
        mutate()
        return original.snapshot()
      },
    }
    installBrowserCapture(otel, capture)
    const combined = otel.extend(withBrowserActions({ frustration: false }))
    mutate = () => {
      if (mutation === 'dispose') combined.dispose()
      else if (mutation === 'disable') combined.browserActions.setFalse()
      else throw new Error('snapshot callback failure')
    }
    const button = document.createElement('button')
    button.setAttribute('data-faro-user-action-name', 'reentrant')
    document.body.append(button)
    try {
      button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
      expect(browserActionAttributes(capture)).toEqual({})
      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(
        combined
          .records()
          .filter((record: any) => record.eventName === 'browser.user_action'),
      ).toHaveLength(0)
      if (mutation === 'disable') {
        mutate = () => {}
        combined.browserActions.setTrue()
        button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
        button.setAttribute('aria-busy', 'true')
        await expect
          .poll(
            () =>
              combined
                .records()
                .filter(
                  (record: any) => record.eventName === 'browser.user_action',
                ).length,
          )
          .toBe(1)
      }
    } finally {
      button.remove()
      combined.dispose()
    }
  })
}

test('previous action log callback disabling collector prevents replacement identity', () => {
  const otel = reatomTestTelemetry({
    name: 'action-reentrant-log',
    endpoint: null,
  })
  const original = browserCaptureOf(otel)!
  let disable = () => {}
  const capture = {
    ...original,
    log: (input: Parameters<typeof original.log>[0]) => {
      original.log(input)
      disable()
    },
  }
  installBrowserCapture(otel, capture)
  const combined = otel.extend(withBrowserActions({ frustration: false }))
  disable = () => combined.browserActions.setFalse()
  const button = document.createElement('button')
  button.setAttribute('data-faro-user-action-name', 'first')
  document.body.append(button)
  try {
    button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    const end = startBrowserActivity(capture)
    end()
    button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    expect(combined.browserActions()).toBe(false)
    expect(browserActionAttributes(capture)).toEqual({})
    expect(
      combined
        .records()
        .filter((record: any) => record.eventName === 'browser.user_action'),
    ).toHaveLength(1)
  } finally {
    button.remove()
    combined.dispose()
  }
})
