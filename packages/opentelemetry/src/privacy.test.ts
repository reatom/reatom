import {
  action,
  atom,
  context,
  log as LOG,
  notify,
  withLocalStorage,
  wrap,
} from '@reatom/core'
import { afterEach, expect, test, vi } from 'vitest'

import { createValueCapture } from './captureValues.ts'
import { strictValueCapture } from './strict-capture/index.ts'
import { type ReatomGDPR, withGDPR } from './gdpr/reatomGDPR.ts'
import {
  installDomStubs,
  parseLogRecords,
  parseSpans,
  reatomTestTelemetry,
} from './test-helpers.ts'

const cleanups: Array<() => void> = []

afterEach(() => {
  while (cleanups.length) cleanups.pop()!()
})

const start = (
  extra: Partial<Parameters<typeof reatomTestTelemetry>[0]> = {},
) => {
  const calls: Array<{ url: string; body: string }> = []
  const fetchMock = vi.fn<typeof globalThis.fetch>(async (url, init) => {
    calls.push({ url: String(url), body: String(init?.body ?? '') })
    return new Response('{}', { status: 200 })
  })
  const name = `privacy-${Math.random().toString(16).slice(2)}`
  const otel = reatomTestTelemetry({
    name,
    endpoint: 'https://collector.invalid',
    serviceName: 'privacy',
    batchInterval: 100_000,
    retry: { maxRetries: 0 },
    filter: (target) =>
      target.name.startsWith('privacy.') ||
      target.name.startsWith('login.') ||
      target.name.startsWith('account.') ||
      target.name === 'issueAuthor',
    fetch: fetchMock,
    ...extra,
  })
  cleanups.push(() => context.start(() => otel.dispose()))
  const wire = () => calls.map((call) => call.body).join('\n')
  const spans = () =>
    calls.flatMap((call) => {
      try {
        return parseSpans(call.body)
      } catch {
        return []
      }
    })
  const logs = () =>
    calls.flatMap((call) => {
      try {
        return parseLogRecords(call.body)
      } catch {
        return []
      }
    })
  return { otel, fetchMock, calls, wire, spans, logs, name }
}

test('sensitive atom and action names redact values captured under wrapper keys', async () => {
  const { otel, wire, spans, logs } = start()
  try {
    context.start(() => {
      const password = atom('', 'login.password')
      const setPassword = action((next: string) => next, 'account.setPassword')
      const updateProfile = action(
        (id: string, password: string) => (password ? id : id),
        'account.updateProfile',
      )
      const author = atom('', 'issueAuthor')
      password.set('hunter2-atom')
      setPassword('hunter2-action')
      updateProfile('user-public-id', 'hunter2-param')
      author.set('torvalds')
    })
    await otel.flush()

    expect(wire()).not.toContain('hunter2-atom')
    expect(wire()).not.toContain('hunter2-action')
    expect(wire()).not.toContain('hunter2-param')
    expect(wire()).toContain('user-public-id')
    expect(wire()).toContain('torvalds')
    expect(wire()).toContain('[redacted]')

    const passwordLog = logs().find(
      (record) => record.attributes['reatom.name'] === 'login.password',
    )
    expect(passwordLog?.body).toBe('[redacted]')

    const setPasswordSpan = spans().find(
      (span) => span.attributes['reatom.name'] === 'account.setPassword',
    )
    expect(String(setPasswordSpan?.attributes['reatom.params'])).not.toContain(
      'hunter2-action',
    )
    const profileSpan = spans().find(
      (span) => span.attributes['reatom.name'] === 'account.updateProfile',
    )
    expect(String(profileSpan?.attributes['reatom.params'])).toContain(
      'user-public-id',
    )
    expect(String(profileSpan?.attributes['reatom.params'])).not.toContain(
      'hunter2-param',
    )
  } finally {
    otel.dispose()
  }
})

test('a transforming redact hook still applies name redaction', () => {
  const wrapString = (_key: string, value: unknown) =>
    typeof value === 'string' ? `wrapped:${value}` : value
  expect(
    createValueCapture(wrapString, { names: ['login.password'] }).capture(
      'body',
      'hunter2',
    ),
  ).toBe('[redacted]')
  expect(
    createValueCapture((_key, value) =>
      Array.isArray(value)
        ? value.map((item) =>
            typeof item === 'string' ? `wrapped:${item}` : item,
          )
        : value,
    ).capture('params', ['ada', 'hunter2'], ['id', 'password']),
  ).toEqual(['wrapped:ada', '[redacted]'])
})

test('author key over-match stays on keys only and names redact roots', () => {
  const capture = createValueCapture()
  expect(capture.capture('author', 'Ada')).toBe('[redacted]')
  expect(capture.capture('headphones', 'ok')).toBe('ok')
  expect(capture.capture('note', 'mail ada@example.com please')).toBe(
    'mail ada@example.com please',
  )
  expect(
    createValueCapture(undefined, { names: ['issueAuthor'] }).capture(
      'body',
      'torvalds',
    ),
  ).toBe('torvalds')
  expect(
    createValueCapture(undefined, { names: ['login.password'] }).capture(
      'body',
      'hunter2',
    ),
  ).toBe('[redacted]')
  expect(
    createValueCapture().capture(
      'params',
      ['user-public-id', 'hunter2'],
      ['id', 'password'],
    ),
  ).toEqual(['user-public-id', '[redacted]'])
  expect(capture.capture('email', 'ada@example.com')).toBe('[redacted]')
})

test('strict capture scrubs contact strings inside values', () => {
  const capture = strictValueCapture()
  expect(capture.capture('note', 'mail ada@example.com please')).toBe(
    'mail [email] please',
  )
  expect(capture.capture('note', 'call +1 (415) 555-2671 today')).toBe(
    'call [phone] today',
  )
  expect(capture.capture('note', 'id f45580836486a8')).toBe('id f45580836486a8')
  expect(
    capture.capture('note', 'id 550e8400-e29b-41d4-a716-446655440000'),
  ).toBe('id 550e8400-e29b-41d4-a716-446655440000')
  expect(capture.capture('note', 'at 192.168.0.1 on 2024-01-15')).toBe(
    'at 192.168.0.1 on 2024-01-15',
  )
  expect(capture.capture('email', 'ada@example.com')).toBe('[redacted]')
})

test('captureValues false omits primitive update bodies and LOG payloads', async () => {
  const { otel, wire, logs } = start({ captureValues: false })
  try {
    context.start(() => {
      const label = atom('keep', 'privacy.label')
      const count = atom(0, 'privacy.count')
      const flag = atom(false, 'privacy.flag')
      const big = atom(0n, 'privacy.big')
      label.set('primitive-sentinel')
      count.set(7)
      flag.set(true)
      big.set(3n)
      LOG('log-sentinel', { nested: 'log-sentinel-object' })
    })
    await otel.flush()

    expect(wire()).not.toContain('primitive-sentinel')
    expect(wire()).not.toContain('log-sentinel')
    const updates = logs().filter(
      (record) => record.eventName === 'reatom.atom.update',
    )
    expect(updates.length).toBeGreaterThan(0)
    for (const update of updates) expect(update.body).toBeUndefined()
    const reatomLogs = logs().filter(
      (record) => record.eventName === 'reatom.log',
    )
    expect(reatomLogs.length).toBeGreaterThan(0)
    for (const record of reatomLogs) expect(record.body).toBeUndefined()
  } finally {
    otel.dispose()
  }
})

test('withGDPR denies diagnostics before submit while explicit public facts stay independent', async () => {
  const attached = start()
  const open = start()
  try {
    await context.start(async () => {
      const consent = attached.otel.extend(
        withGDPR({
          name: attached.name,
          persist: false,
        }),
      ).gdpr
      expect(attached.otel().consent).toMatchObject({
        diagnostics: false,
        analytics: false,
      })
      expect(attached.otel().signals).toBeUndefined()

      const query = atom('', 'privacy.query')
      const search = action((text: string) => text, 'privacy.search')
      query.set('secret-query')
      search('before-submit')
      attached.otel.log('app.page_view', { 'url.path': '/search' })
      await wrap(attached.otel.flush())

      expect(attached.wire()).not.toContain('before-submit')
      expect(attached.wire()).not.toContain('secret-query')
      expect(
        attached.calls.some((call) => call.url.includes('/v1/traces')),
      ).toBe(false)
      expect(
        attached.calls.some(
          (call) =>
            call.url.includes('/v1/logs') &&
            call.body.includes('app.page_view'),
        ),
      ).toBe(true)

      consent.fields.diagnostics.change(true)
      expect(attached.otel().consent).toMatchObject({
        diagnostics: false,
        analytics: false,
      })
      expect(attached.otel().signals).toBeUndefined()
      await wrap(consent.submit())
      expect(attached.otel().consent).toMatchObject({
        diagnostics: true,
      })
      expect(attached.otel().signals).toBeUndefined()
      search('after-grant')
      await wrap(attached.otel.flush())
      expect(attached.wire()).toContain('after-grant')
    })

    context.start(() => {
      action(() => 'open-sentinel', 'privacy.open')()
    })
    await open.otel.flush()
    expect(open.wire()).toContain('open-sentinel')
  } finally {
    attached.otel.dispose()
    open.otel.dispose()
  }
})

test('native settings validation errors recover on a valid write and keep the exporter usable', async () => {
  const { otel, wire } = start()
  try {
    const saved = otel.otlp()
    expect(() =>
      otel.otlp.set((current) => ({ ...current, endpoint: '/otel' })),
    ).toThrow(/absolute HTTP\(S\) endpoint/)
    // Native atoms retain their error until another successful write.
    expect(() => otel.otlp()).toThrow(/absolute HTTP\(S\) endpoint/)
    otel.otlp.set(saved)
    expect(otel.otlp().endpoint).toBe('https://collector.invalid')
    otel.log('exporter.after-valid-recovery')
    await otel.flush()
    expect(wire()).toContain('exporter.after-valid-recovery')
    expect(() =>
      reatomTestTelemetry({
        name: `privacy-bad-${Math.random().toString(16).slice(2)}`,
        endpoint: '/otel',
        serviceName: 'privacy',
      }),
    ).toThrow(/absolute HTTP\(S\) endpoint/)
  } finally {
    otel.dispose()
  }
})

test('attributesVar is copied onto spans and update logs', async () => {
  const { otel, spans, logs } = start()
  try {
    context.start(() => {
      otel.attributesVar.run({ 'app.tenant': 'acme' }, () => {
        const note = atom('x', 'privacy.note')
        note.set('y')
        action(() => 'done', 'privacy.touch')()
      })
    })
    await otel.flush()
    const touch = spans().find((span) => span.name === 'privacy.touch')
    const update = logs().find(
      (record) => record.attributes['reatom.name'] === 'privacy.note',
    )
    expect(touch?.attributes['app.tenant']).toBe('acme')
    expect(update?.attributes['app.tenant']).toBe('acme')
  } finally {
    otel.dispose()
  }
})

test('submitted diagnostics false keeps tracer export off without rewriting signals', async () => {
  const { otel, calls, wire } = start()
  try {
    await context.start(async () => {
      const consent = otel.extend(
        withGDPR({
          name: `privacy-diag-off-${Math.random().toString(16).slice(2)}`,
          persist: false,
        }),
      ).gdpr
      otel.set((current) => ({
        ...current,
        signals: { logs: false },
      }))
      consent.fields.analytics.change(true)
      consent.fields.diagnostics.change(false)
      await wrap(consent.submit())
      expect(otel().signals).toEqual({ logs: false })
      expect(otel().consent).toMatchObject({
        diagnostics: false,
        analytics: true,
      })
      action(() => 'traced-secret', 'privacy.traced')()
      otel.log('checkout.failed', { order: 'checkout-secret' })
      await otel.flush()
      expect(wire()).not.toContain('traced-secret')
      expect(wire()).not.toContain('checkout-secret')
      expect(calls.some((call) => call.url.includes('/v1/traces'))).toBe(false)
      expect(calls.some((call) => call.url.includes('/v1/logs'))).toBe(false)
    })
  } finally {
    otel.dispose()
  }
})

test('withdrawing diagnostics drops queued tracer records and does not export them later', async () => {
  const { otel, wire } = start()
  const consentName = `privacy-withdraw-${Math.random().toString(16).slice(2)}`
  try {
    let consent: ReatomGDPR | undefined
    const root = context.start()
    await root.run(async () => {
      consent = otel.extend(
        withGDPR({
          name: consentName,
          persist: false,
        }),
      ).gdpr
      consent.fields.diagnostics.change(true)
      consent.fields.analytics.change(true)
      await wrap(consent.submit())
      action(() => 'granted-secret', 'privacy.granted')()
      otel.log('app.page_view', { 'url.path': '/keep-analytics' })
    })
    expect(otel.otlp.stats().queued).toBeGreaterThan(0)

    await root.run(async () => {
      consent!.fields.diagnostics.change(false)
      await wrap(consent!.submit())
    })
    await otel.flush()
    expect(wire()).not.toContain('granted-secret')
    expect(wire()).toContain('/keep-analytics')

    await root.run(async () => {
      consent!.fields.diagnostics.change(true)
      await wrap(consent!.submit())
      action(() => 'after-restore', 'privacy.restored')()
    })
    await otel.flush()
    expect(wire()).not.toContain('granted-secret')
    expect(wire()).toContain('after-restore')
  } finally {
    otel.dispose()
  }
})

test('a leased trace batch is dropped at send when signals turn off', async () => {
  const { otel, wire, fetchMock } = start({ maxBatchSize: 1 })
  try {
    context.start(() => {
      otel.createTrace({
        name: 'privacy.lease',
        attributes: { 'privacy.token': 'lease-sentinel' },
      })
      otel.set((current) => ({
        ...current,
        signals: { traces: false, logs: false },
      }))
    })
    await Promise.resolve()
    await otel.flush()
    expect(wire()).not.toContain('lease-sentinel')
    expect(fetchMock).not.toHaveBeenCalled()
  } finally {
    otel.dispose()
  }
})

test('pagehide drops queued spans after traces are held', async () => {
  const stubs = installDomStubs()
  const { otel, wire, fetchMock } = start()
  try {
    context.start(() => {
      otel.createTrace({
        name: 'privacy.hide',
        attributes: { 'privacy.token': 'hide-sentinel' },
      })
      otel.set((current) => ({
        ...current,
        signals: { traces: false, logs: false },
      }))
    })
    stubs.windowListeners.get('pagehide')?.()
    await Promise.resolve()
    expect(wire()).not.toContain('hide-sentinel')
    expect(fetchMock).not.toHaveBeenCalled()
  } finally {
    otel.dispose()
    stubs.restore()
  }
})

test('options.set keeps consent and signals when the replacement omits them', async () => {
  const { otel, wire } = start()
  try {
    await context.start(async () => {
      const consent = otel.extend(
        withGDPR({
          name: `privacy-preserve-${Math.random().toString(16).slice(2)}`,
          persist: false,
        }),
      ).gdpr
      otel.set((current) => ({
        ...current,
        signals: { logs: false },
      }))
      consent.fields.diagnostics.change(false)
      await wrap(consent.submit())
      otel.set({ endpoint: 'https://collector.invalid' })
      expect(otel().consent).toMatchObject({ diagnostics: false })
      expect(otel().signals).toEqual({ logs: false })
      action(() => 'wiped-secret', 'privacy.wiped')()
    })
    await otel.flush()
    expect(wire()).not.toContain('wiped-secret')
  } finally {
    otel.dispose()
  }
})

test('signals false is a kill switch after a diagnostics grant', async () => {
  const { otel, wire } = start()
  try {
    await context.start(async () => {
      const consent = otel.extend(
        withGDPR({
          name: `privacy-kill-${Math.random().toString(16).slice(2)}`,
          persist: false,
        }),
      ).gdpr
      consent.fields.diagnostics.change(true)
      await wrap(consent.submit())
      otel.set((current) => ({
        ...current,
        signals: { traces: false, logs: false },
      }))
      expect(otel().consent).toMatchObject({ diagnostics: true })
      action(() => 'kill-secret', 'privacy.kill')()
    })
    await otel.flush()
    expect(wire()).not.toContain('kill-secret')
  } finally {
    otel.dispose()
  }
})

test('logs false leaves trace export on', async () => {
  const { otel, wire, spans, logs } = start()
  try {
    context.start(() => {
      otel.set((current) => ({
        ...current,
        signals: { logs: false },
      }))
      const note = atom('before', 'privacy.note')
      note.set('log-only-secret')
      action(() => 'trace-still-on', 'privacy.trace')()
    })
    await otel.flush()
    expect(wire()).toContain('trace-still-on')
    expect(wire()).not.toContain('log-only-secret')
    expect(spans().some((span) => span.name === 'privacy.trace')).toBe(true)
    expect(
      logs().some((record) => record.eventName === 'reatom.atom.update'),
    ).toBe(false)
  } finally {
    otel.dispose()
  }
})

test('logs false after a diagnostics grant still exports traces', async () => {
  const { otel, wire } = start()
  try {
    await context.start(async () => {
      const consent = otel.extend(
        withGDPR({
          name: `privacy-logs-only-${Math.random().toString(16).slice(2)}`,
          persist: false,
        }),
      ).gdpr
      consent.fields.diagnostics.change(true)
      await wrap(consent.submit())
      otel.set((current) => ({
        ...current,
        signals: { ...current.signals, logs: false },
      }))
      const note = atom('before', 'privacy.note')
      note.set('granted-log-secret')
      action(() => 'granted-trace', 'privacy.trace')()
    })
    await otel.flush()
    expect(wire()).toContain('granted-trace')
    expect(wire()).not.toContain('granted-log-secret')
  } finally {
    otel.dispose()
  }
})

const UNSAMPLED_PARENT =
  '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00'

test('holding the tracer clears the error ring and held logs', async () => {
  const { otel, wire, spans } = start({ sampling: { ratio: 0 } })
  try {
    context.start(() => {
      const child = action(() => {
        const note = atom('before', 'privacy.held')
        note.set('held-secret')
        return 'ring-secret'
      }, 'privacy.ring')
      action(() => {
        const remote = otel.parseTraceparent(UNSAMPLED_PARENT)
        if (remote) otel.traceVar.set(remote)
        return child()
      }, 'privacy.holder')()
      otel.set((current) => ({
        ...current,
        signals: { traces: false, logs: false },
      }))
      otel.set((current) => ({
        ...current,
        signals: { traces: true, logs: true },
      }))
    })
    context.start(() => {
      const boom = action(() => {
        throw new Error('privacy-boom')
      }, 'privacy.boom')
      try {
        action(() => {
          const remote = otel.parseTraceparent(UNSAMPLED_PARENT)
          if (remote) otel.traceVar.set(remote)
          return boom()
        }, 'privacy.again')()
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })
    await otel.flush()
    const names = spans().map((span) => span.name)
    expect(names).toContain('privacy.boom')
    expect(names).not.toContain('privacy.ring')
    expect(wire()).not.toContain('held-secret')
    expect(wire()).not.toContain('ring-secret')
  } finally {
    otel.dispose()
  }
})

test('LOG.label password redacts the value', async () => {
  const { otel, wire, logs } = start()
  try {
    context.start(() => {
      LOG.label('password', 'hunter2-label')
      LOG.label('fetch payload', { n: 1 })
    })
    await otel.flush()
    expect(wire()).not.toContain('hunter2-label')
    expect(wire()).toContain('[redacted]')
    const labeled = logs().find(
      (record) => record.attributes['reatom.log.label'] === 'password',
    )
    expect(labeled?.body).toBe('[redacted]')
    const plain = logs().find(
      (record) => record.attributes['reatom.log.label'] === 'fetch payload',
    )
    expect(plain?.body).toEqual([{ n: '1' }])
  } finally {
    otel.dispose()
  }
})

test('an exception flushes spans held in the error ring', async () => {
  const { otel, spans, wire } = start({ sampling: { ratio: 0 } })
  try {
    context.start(() => {
      const earlier = action(() => 'ring-earlier', 'privacy.earlier')
      const boom = action(() => {
        throw new Error('privacy-promote')
      }, 'privacy.promote')
      action(() => {
        const remote = otel.parseTraceparent(UNSAMPLED_PARENT)
        if (remote) otel.traceVar.set(remote)
        earlier()
        try {
          boom()
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
        }
      }, 'privacy.promoteParent')()
    })
    await otel.flush()
    expect(spans().map((span) => span.name)).toContain('privacy.earlier')
    expect(wire()).toContain('ring-earlier')
  } finally {
    otel.dispose()
  }
})

test('analytics-only submit keeps tracer export', async () => {
  const { otel, wire } = start()
  try {
    await context.start(async () => {
      const consent = otel.extend(
        withGDPR({
          name: `privacy-analytics-only-${Math.random().toString(16).slice(2)}`,
          persist: false,
          categories: { analytics: false },
        }),
      ).gdpr
      consent.fields.analytics.change(true)
      await wrap(consent.submit())
      expect(otel().consent).toMatchObject({ analytics: true })
      expect(otel().consent).not.toHaveProperty('diagnostics')
      expect(otel().signals?.traces).not.toBe(false)
      action(() => 'analytics-only-secret', 'privacy.analyticsOnly')()
      await otel.flush()
      expect(wire()).toContain('analytics-only-secret')
    })
  } finally {
    otel.dispose()
  }
})

test('diagnostics offered and left false holds export; diagnostics true exports', async () => {
  const held = start()
  let granted: ReturnType<typeof start> | undefined
  try {
    await context.start(async () => {
      const consent = held.otel.extend(
        withGDPR({
          name: `privacy-offered-off-${Math.random().toString(16).slice(2)}`,
          persist: false,
          categories: { diagnostics: false, analytics: true, marketing: false },
        }),
      ).gdpr
      await wrap(consent.submit())
      action(() => 'offered-secret', 'privacy.offered')()
      await held.otel.flush()
      expect(held.wire()).not.toContain('offered-secret')
    })
    granted = start()
    const grantedCase = granted
    await context.start(async () => {
      const consent = grantedCase.otel.extend(
        withGDPR({
          name: `privacy-offered-on-${Math.random().toString(16).slice(2)}`,
          persist: false,
          categories: { diagnostics: true, analytics: false, marketing: false },
        }),
      ).gdpr
      await wrap(consent.submit())
      action(() => 'granted-export', 'privacy.grantedExport')()
      await grantedCase.otel.flush()
      expect(grantedCase.wire()).toContain('granted-export')
    })
  } finally {
    held.otel.dispose()
    granted?.otel.dispose()
  }
})

test('attributesVar sampled at span start is on the async action span', async () => {
  const { otel, spans } = start()
  try {
    const result = await context.start(() => {
      const load = action(async () => {
        await wrap(Promise.resolve())
        return 'async-done'
      }, 'privacy.asyncTenant')
      return otel.attributesVar.run({ 'app.tenant': 'acme' }, () => load())
    })
    expect(result).toBe('async-done')
    await otel.flush()
    const span = spans().find((item) => item.name === 'privacy.asyncTenant')
    expect(span?.attributes).toMatchObject({ 'app.tenant': 'acme' })
  } finally {
    otel.dispose()
  }
})

test('a dropped session span can export after a later diagnostics grant', async () => {
  const { otel, wire, spans } = start()
  try {
    await context.start(async () => {
      const consent = otel.extend(
        withGDPR({
          name: `privacy-session-${Math.random().toString(16).slice(2)}`,
          persist: false,
        }),
      ).gdpr
      consent.fields.diagnostics.change(false)
      await wrap(consent.submit())
      LOG('hidden-before')
      consent.fields.diagnostics.change(true)
      await wrap(consent.submit())
      LOG('visible-after')
      await otel.flush()
    })
    const session = spans().find((span) => span.name === 'app.session')
    expect(session).toBeDefined()
    expect(wire()).toContain('visible-after')
    expect(wire()).not.toContain('hidden-before')
  } finally {
    otel.dispose()
  }
})

test('options.set in another root does not reopen a denied tracer', async () => {
  const { otel, wire } = start()
  const rootA = context.start()
  const rootB = context.start()
  try {
    await rootA.run(async () => {
      const consent = otel.extend(
        withGDPR({
          name: `privacy-root-a-${Math.random().toString(16).slice(2)}`,
          persist: false,
        }),
      ).gdpr
      consent.fields.diagnostics.change(false)
      await wrap(consent.submit())
      action(() => 'root-a-secret', 'privacy.rootA')()
    })
    rootB.run(() => {
      otel.set((current) => ({
        ...current,
        headers: { Authorization: 'Bearer refreshed' },
      }))
      action(() => 'root-b-open', 'privacy.rootB')()
    })
    rootA.run(() => {
      action(() => 'root-a-still', 'privacy.rootA2')()
    })
    await otel.flush()
    expect(wire()).not.toContain('root-a-secret')
    expect(wire()).not.toContain('root-a-still')
    expect(wire()).not.toContain('root-b-open')
  } finally {
    otel.dispose()
  }
})

test('stored diagnostics false holds the tracer in a later root', async () => {
  const { otel, wire } = start()
  const persistKey = `reatom.gdpr.later-${Math.random().toString(16).slice(2)}`
  try {
    const app = context.start()
    app.run(() => {
      withLocalStorage.storageAtom().set(
        { key: persistKey },
        {
          data: {
            submitted: true,
            categories: {
              diagnostics: false,
              analytics: true,
              marketing: false,
            },
          },
          id: 1,
          timestamp: Date.now(),
          version: 0,
          to: Number.MAX_SAFE_INTEGER,
        },
      )
      const { gdpr } = otel.extend(
        withGDPR({ name: persistKey, persist: persistKey }),
      )
      expect(gdpr.snapshot()?.categories).toMatchObject({
        diagnostics: false,
        analytics: true,
      })
      action(() => 'import-secret', 'privacy.importRoot')()
    })
    await otel.flush()
    expect(wire()).not.toContain('import-secret')
  } finally {
    otel.dispose()
  }
})

test('another form follows a storage snapshot update', async () => {
  const first = start()
  const second = start()
  const persistKey = `reatom.gdpr.tabs-${Math.random().toString(16).slice(2)}`
  try {
    await context.start(async () => {
      const consentA = first.otel.extend(
        withGDPR({
          name: persistKey,
          persist: persistKey,
        }),
      ).gdpr
      const consentB = second.otel.extend(
        withGDPR({
          name: persistKey,
          persist: persistKey,
        }),
      ).gdpr
      notify()
      consentA.fields.diagnostics.change(true)
      consentA.fields.analytics.change(true)
      await wrap(consentA.submit())
      notify()
      expect(consentB.snapshot()?.categories.diagnostics).toBe(true)
      expect(second.otel().consent).toMatchObject({ diagnostics: true })

      consentA.fields.diagnostics.change(false)
      await wrap(consentA.submit())
      notify()
      expect(consentB.snapshot()?.categories.diagnostics).toBe(false)
      expect(second.otel().consent).toMatchObject({
        diagnostics: false,
      })
      action(() => 'tab-b-secret', 'privacy.tabB')()
      await second.otel.flush()
      expect(second.wire()).not.toContain('tab-b-secret')
    })
  } finally {
    first.otel.dispose()
    second.otel.dispose()
  }
})
