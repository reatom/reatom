import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test } from 'vitest'

type SizeLimitEntry = {
  name: string
  limit: string
  ignore?: string[]
  path: string | string[]
  import: string | Record<string, string>
}

const here = dirname(fileURLToPath(import.meta.url))
const srcRoot = join(here, '..')
const pkgRoot = join(here, '../..')

const sizeLimitConfig = () =>
  JSON.parse(
    readFileSync(join(pkgRoot, '.size-limit.json'), 'utf8'),
  ) as SizeLimitEntry[]

test('analytics extension retains its budget and excludes only the core peer', () => {
  const analytics = sizeLimitConfig().find(
    (entry) => entry.name === 'web-analytics (optional extension)',
  )
  expect(analytics).toBeDefined()
  expect(analytics!.limit).toBe('6.3 KB')
  expect(analytics!.ignore).toEqual(['@reatom/core'])
})

test('F-17 / WA-8: combined tracer+analytics measurement has no ignored tracer chunk', () => {
  const combined = sizeLimitConfig().find(
    (entry) => entry.name === 'web-analytics (tracer + analytics)',
  )
  expect(combined).toBeDefined()
  expect(combined!.limit).toBe('21 KB')
  expect(combined!.ignore).toEqual(['@reatom/core'])
  expect(combined!.path).toBe('dist/index.js')
  expect(combined!.import).toBe(
    '{ withWebAnalytics, reatomOpentelemetry, checkSensitiveNames }',
  )
})

test('tracer factory does not import web-analytics', () => {
  const factory = readFileSync(join(srcRoot, 'reatomOpentelemetry.ts'), 'utf8')
  expect(factory).not.toMatch(/web-analytics/)
})

test('ids.ts has no analytics, consent, or storage', () => {
  const ids = readFileSync(join(srcRoot, 'ids.ts'), 'utf8')
  expect(ids).not.toMatch(
    /consent|localStorage|sessionStorage|utm_|visitor|web-analytics/,
  )
})

test('errorMetadata has no analytics-only helpers', () => {
  const src = readFileSync(join(srcRoot, 'errorMetadata.ts'), 'utf8')
  expect(src).not.toMatch(
    /scrubAnalyticsText|firstStackFrame|errorFromWindowEvent/,
  )
})

test('devWarnings has no analytics copy', () => {
  const src = readFileSync(join(srcRoot, 'devWarnings.ts'), 'utf8')
  expect(src).not.toMatch(/connectWebAnalytics|warnAnalytics/)
})
