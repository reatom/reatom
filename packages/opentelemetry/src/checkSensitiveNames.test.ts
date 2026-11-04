import { action, atom, context } from '@reatom/core'
import { afterEach, expect, test, vi } from 'vitest'

import { checkSensitiveNames } from './checkSensitiveNames.ts'
import * as pkg from './index.ts'
import { reatomTestTelemetry, withWarnSpy } from './test-helpers.ts'

const cleanups: Array<() => void> = []

afterEach(() => {
  while (cleanups.length) cleanups.pop()!()
  vi.unstubAllEnvs()
})

const start = (
  overrides: Partial<Parameters<typeof reatomTestTelemetry>[0]> = {},
) => {
  const otel = reatomTestTelemetry({
    name: `sensitive-${Math.random().toString(16).slice(2)}`,
    endpoint: null,
    serviceName: 'sensitive-names',
    skipGlobalExtension: true,
    ...overrides,
  })
  cleanups.push(() => context.start(() => otel.dispose()))
  return otel
}

const sensitiveWarnings = (warn: { mock: { calls: unknown[][] } }) =>
  warn.mock.calls
    .map((args) => String(args[0] ?? ''))
    .filter((message) => message.includes('checkSensitiveNames'))

test('the package root exports checkSensitiveNames', () => {
  expect(typeof pkg.checkSensitiveNames).toBe('function')
  expect('reatomGDPR' in pkg).toBe(false)
})

test('checkSensitiveNames warns in the test env', async () => {
  expect(process.env.NODE_ENV).not.toBe('production')
  const otel = start()
  await withWarnSpy((warn) => {
    context.start(() => {
      const stop = checkSensitiveNames(otel)
      cleanups.push(stop)
      atom('', 'user.password')
      expect(sensitiveWarnings(warn)).toHaveLength(1)
      expect(sensitiveWarnings(warn)[0]).toContain('user.password')
    })
  })
})

test('F-05: warns once per suspicious name when values are captured', async () => {
  const otel = start()
  await withWarnSpy((warn) => {
    context.start(() => {
      const stop = checkSensitiveNames(otel)
      cleanups.push(stop)
      const password = atom('', 'user.password')
      expect(sensitiveWarnings(warn)).toHaveLength(1)
      expect(sensitiveWarnings(warn)[0]).toContain('user.password')
      atom('', 'user.password')
      password.set('secret')
      expect(sensitiveWarnings(warn)).toHaveLength(1)
    })
  })
})

test('F-05: a later matching name still warns once, distinct from the first', async () => {
  const otel = start()
  await withWarnSpy((warn) => {
    context.start(() => {
      const stop = checkSensitiveNames(otel)
      cleanups.push(stop)
      atom('', 'account.token')
      action(() => {}, 'account.token')
      atom('', 'billing.iban')
      expect(sensitiveWarnings(warn)).toHaveLength(2)
      expect(sensitiveWarnings(warn).join('\n')).toContain('account.token')
      expect(sensitiveWarnings(warn).join('\n')).toContain('billing.iban')
    })
  })
})

test('captureValues: false does not warn', async () => {
  const otel = start({ captureValues: false })
  await withWarnSpy((warn) => {
    context.start(() => {
      const stop = checkSensitiveNames(otel)
      cleanups.push(stop)
      atom('', 'user.password')
      expect(sensitiveWarnings(warn)).toEqual([])
    })
  })
})

test('custom serialize on options silences the helper', async () => {
  const otel = start()
  await withWarnSpy((warn) => {
    context.start(() => {
      otel.set((current) => {
        const next = {
          ...current,
          serialize: (value: unknown) => value,
        }
        return next
      })
      const stop = checkSensitiveNames(otel)
      cleanups.push(stop)
      atom('', 'user.password')
      expect(sensitiveWarnings(warn)).toEqual([])
    })
  })
})

test('filter exclusions and skipped names do not warn', async () => {
  const otel = start({
    filter: (target) => !target.name.startsWith('vendor.'),
  })
  await withWarnSpy((warn) => {
    context.start(() => {
      const stop = checkSensitiveNames(otel)
      cleanups.push(stop)
      atom('', 'vendor.password')
      atom('', '_secret')
      atom('', 'form._token')
      atom('', 'plain.count')
      expect(sensitiveWarnings(warn)).toEqual([])
    })
  })
})

test('custom patterns replace the default set', async () => {
  const otel = start()
  await withWarnSpy((warn) => {
    context.start(() => {
      const stop = checkSensitiveNames(otel, { patterns: /iban/i })
      cleanups.push(stop)
      atom('', 'user.password')
      atom('', 'billing.iban')
      expect(sensitiveWarnings(warn)).toHaveLength(1)
      expect(sensitiveWarnings(warn)[0]).toContain('billing.iban')
    })
  })
})

test('production is a no-op', async () => {
  vi.stubEnv('NODE_ENV', 'production')
  const otel = start()
  await withWarnSpy((warn) => {
    context.start(() => {
      const stop = checkSensitiveNames(otel)
      atom('', 'user.password')
      expect(sensitiveWarnings(warn)).toEqual([])
      stop()
    })
  })
})
