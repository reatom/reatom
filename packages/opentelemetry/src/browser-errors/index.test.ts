import { expect, test } from 'vitest'
import { reatomTestTelemetry } from '../test-helpers.ts'
import { withBrowserErrors } from './index.ts'
import { withBrowserActions } from '../browser-actions/index.ts'
import { withBrowserCsp } from '../browser-csp/index.ts'
import { withBrowserMetadata } from '../browser-metadata/index.ts'
import {
  markBrowserErrorReported,
  registerStandaloneBrowserErrors,
  hasStandaloneBrowserErrors,
} from '../reportedBrowserErrors.ts'

test('new optional collectors are server no-ops with ordinary toggle/dispose lifecycle', () => {
  const otel = reatomTestTelemetry({
    name: 'server-browser',
    endpoint: null,
  }).extend(
    withBrowserErrors(),
    withBrowserActions(),
    withBrowserCsp(),
    withBrowserMetadata(),
  )
  for (const control of [
    otel.browserErrors,
    otel.browserActions,
    otel.browserCsp,
    otel.browserMetadata,
  ]) {
    expect(control()).toBe(true)
    control.setFalse()
    control.setTrue()
  }
  expect(otel.records()).toEqual([])
  otel.dispose()
  expect(otel.browserErrors()).toBe(false)
  expect(() => otel.browserActions.setTrue()).toThrow()
})

test('exception object dedupe is time-bounded and isolated by telemetry instance', () => {
  const one = {},
    two = {},
    error = new Error('same')
  expect(markBrowserErrorReported(one, error, 1000)).toBe(true)
  expect(markBrowserErrorReported(one, error, 1001)).toBe(false)
  expect(markBrowserErrorReported(two, error, 1001)).toBe(true)
  expect(markBrowserErrorReported(one, error, 2000)).toBe(true)
})

test('standalone ownership is instance-local, counted and cleanup is idempotent', () => {
  const one = {},
    two = {}
  const release = registerStandaloneBrowserErrors(one)
  const releaseSecond = registerStandaloneBrowserErrors(one)
  expect(hasStandaloneBrowserErrors(one)).toBe(true)
  expect(hasStandaloneBrowserErrors(two)).toBe(false)
  release()
  release()
  expect(hasStandaloneBrowserErrors(one)).toBe(true)
  releaseSecond()
  expect(hasStandaloneBrowserErrors(one)).toBe(false)
})
