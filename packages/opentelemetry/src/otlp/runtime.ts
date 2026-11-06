import {
  action,
  _enqueue,
  atom,
  computed,
  reatomObservable,
  isAbort,
  onLineAtom,
  top,
  withMiddleware,
  type Action,
  type Atom,
  type Computed,
} from '@reatom/core'
import {
  buildExportPayload,
  buildLogsPayload,
  buildResource,
} from '../buildExportPayload.ts'
import { buildSpan, MAX_RECORD_BYTES, type OtlpSpan } from '../buildSpan.ts'
import { buildLogRecord, type OtlpLogRecord } from '../buildLogRecord.ts'
import { createBatchQueue, type TelemetryStats } from '../createBatchQueue.ts'
import { createExportWorker } from '../createExportWorker.ts'
import { errorData, exceptionType } from '../errorMetadata.ts'
import {
  bindExporter,
  unbindExporter,
  type DeliveryItem,
  type CaptureHost,
  type ExporterBinding,
  type ExportTarget,
} from '../exporter.ts'
import { flushWithBeacon } from '../flushWithBeacon.ts'
import { hexFromBytes } from '../hexFromBytes.ts'
import { internalName } from '../internalName.ts'
import { isObserving, observe, suppressTracing } from '../observation.ts'
import { readExportResponse } from '../parseExportResponse.ts'
import { resolveQueueOptions } from '../queueOptions.ts'
import {
  retryWithBackoff,
  type RetryWithBackoffInput,
} from '../retryWithBackoff.ts'
import {
  selectUnloadBatch,
  selectLogsUnloadBatch,
} from '../selectUnloadBatch.ts'
import {
  sendSignal,
  type Transport,
  type TransportBatch,
  type TransportResult,
} from '../sendTraces.ts'
import { toOtlpBytesValue, type OtlpAttrValue } from '../toOtlpValue.ts'
import { availableUnloadBytes, reserveUnloadBytes } from '../unloadBudget.ts'
import { isDevelopment } from '../devWarnings.ts'
import { INSTANCE_DISPOSED, OTEL, OTLP_ALREADY_INSTALLED } from '../diag.ts'

export interface OTLPOptions {
  endpoint: string | null
  headers?: Record<string, string>
  transports?: readonly Transport[]
}
export interface OTLPInput extends OTLPOptions {
  batchInterval?: number
  maxBatchSize?: number
  maxQueueSize?: number
  exportTimeoutMs?: number
  useBeacon?: boolean
  retry?: Pick<
    RetryWithBackoffInput,
    'maxRetries' | 'baseDelayMs' | 'maxDelayMs'
  >
  fetch?: typeof globalThis.fetch
  sendBeacon?: (url: string, data: BodyInit) => boolean
}
export type OTLP = Atom<OTLPOptions> & {
  stats: Computed<TelemetryStats>
  transport: Action<[TransportBatch], Promise<TransportResult>>
}
const capturedText = (value: OtlpAttrValue): string =>
  typeof value === 'string'
    ? value
    : JSON.stringify(value, (_, item) =>
        typeof item === 'bigint'
          ? String(item)
          : item instanceof Uint8Array
            ? toOtlpBytesValue(item).bytesValue
            : item,
      )
const encoder = new TextEncoder()
const stableKey = (value: OtlpAttrValue | null | undefined): string => {
  if (value === null || value === undefined) return 'x'
  if (typeof value === 'string') return 's' + JSON.stringify(value)
  if (typeof value === 'number') return 'n' + String(value)
  if (typeof value === 'bigint') return 'B' + value.toString()
  if (typeof value === 'boolean') return value ? 'b1' : 'b0'
  if (value instanceof Uint8Array) return 'U' + hexFromBytes(value)
  if (Array.isArray(value)) return 'A[' + value.map(stableKey).join(',') + ']'
  return (
    'O{' +
    Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ':' + stableKey(value[key]))
      .join(',') +
    '}'
  )
}

const isAbsoluteHttpUrl = (endpoint: string): boolean => {
  try {
    const url = new URL(endpoint)
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.host.length > 0
    )
  } catch {
    return false
  }
}

const readSettings = (options: OTLPOptions): OTLPOptions => {
  const endpoint = options.endpoint
  const headers = options.headers
  const transports = options.transports
  return Object.freeze({
    endpoint,
    headers: headers && Object.freeze({ ...headers }),
    transports: transports && Object.freeze([...transports]),
  })
}

const assertDestination = (options: OTLPOptions, name: string) => {
  if (options.endpoint === '') {
    throw new Error(`${OTEL}"${name}" needs endpoint or null`)
  }
  if (options.endpoint !== null && !isAbsoluteHttpUrl(options.endpoint)) {
    const message = `${OTEL}"${name}" needs absolute HTTP(S) endpoint or null`
    if (isDevelopment()) console.warn(message)
    throw new Error(message)
  }
  if (options.endpoint === null && !options.transports?.length)
    throw new Error(`${OTEL}"${name}" requires endpoint or transports`)
}

export const createOTLP = (
  input: OTLPInput,
  instance: ExportTarget,
): { otlp: OTLP } => {
  if (instance.disposed()) throw new Error(INSTANCE_DISPOSED)
  if ('otlp' in instance) throw new Error(OTLP_ALREADY_INSTALLED)
  const name = instance.instanceName
  const settings = readSettings(input)
  assertDestination(settings, name)
  const queueOptions = resolveQueueOptions(input)
  const pageDocument = typeof document === 'undefined' ? undefined : document
  let disposed = false
  let host: CaptureHost
  let statsSnapshot: TelemetryStats | undefined
  const statsListeners = new Set<(stats: TelemetryStats) => void>()
  const state = reatomObservable<TelemetryStats>(
    {
      getState: () => (statsSnapshot ??= collectStats()),
      subscribe(listener) {
        statsListeners.add(listener)
        listener((statsSnapshot ??= collectStats()))
        return () => statsListeners.delete(listener)
      },
    },
    internalName(name, 'otlp', 'state'),
  )
  let statsPending = false
  const publishStats = () => {
    statsPending = false
    for (const listener of statsListeners)
      observe(() => listener((statsSnapshot ??= collectStats())))
  }
  const invalidateStats = () => {
    statsSnapshot = undefined
    if (statsPending || statsListeners.size === 0) return
    statsPending = true
    _enqueue(publishStats, 'hook')
  }
  const otlp = atom<OTLPOptions>(settings, internalName(name, 'otlp'))
  otlp.extend(
    withMiddleware(() => (next, ...params) => {
      if (!params.length) return next()
      const current = top().state as OTLPOptions
      const update = params[0]
      const proposed = typeof update === 'function' ? update(current) : update
      const settings = readSettings(proposed)
      assertDestination(settings, name)
      return next(settings)
    }),
  )
  const runtimeOptions = () => otlp()
  const warnedExportKinds = new Set<string>()
  const warnDev = (...args: unknown[]) => {
    if (!isDevelopment()) return
    console.warn(...args)
  }
  const warnOnce = (kind: string, ...args: unknown[]) => {
    if (!isDevelopment()) return
    if (warnedExportKinds.has(kind)) return
    warnedExportKinds.add(kind)
    console.warn(...args)
  }
  const logExportError = (error: unknown, dropped?: readonly unknown[]) =>
    observe(() => {
      if (isAbort(error)) return
      // Transport errors may echo credentials from the request URL.
      const message = errorData(error, 'message')
      const reason =
        typeof message === 'string' && /^HTTP \d{3}$/.test(message)
          ? message
          : exceptionType(error)
      const detail = dropped ? ` (dropped ${dropped.length} spans)` : ''
      warnOnce(reason, `${OTEL}export failed${detail}`, reason)
    })
  const isOffline = (): boolean => {
    if (
      typeof navigator === 'undefined' ||
      typeof navigator.onLine !== 'boolean'
    ) {
      return false
    }
    try {
      const online = observe(() => onLineAtom())
      if (typeof online === 'boolean') return !online
    } catch {
      // Fall through to the native flag.
    }
    return navigator.onLine === false
  }
  const hasExportDestination = () => {
    const current = runtimeOptions()
    return current.endpoint !== null || (current.transports?.length ?? 0) > 0
  }
  const transport = action(
    async (batch: TransportBatch): Promise<TransportResult> => {
      const current = runtimeOptions()
      const extras = current.transports ?? []
      const destinations: Transport[] = []
      if (current.endpoint !== null) {
        const endpoint = current.endpoint
        destinations.push(async (next) => {
          const response = await retryWithBackoff({
            ...input.retry,
            ...(next.keepalive && { maxRetries: 0 }),
            signal: next.abort,
            deadline: next.deadline,
            send: () =>
              sendSignal({
                endpoint,
                otlpSignal: next.signal,
                payload: next.payload,
                body: next.body,
                headers: current.headers,
                fetch: input.fetch,
                signal: next.abort,
                keepalive: next.keepalive,
              }),
          })
          if (!response.ok) {
            await response.body?.cancel()
            throw new Error(`HTTP ${response.status}`)
          }
          const outcome = await readExportResponse(response, next.itemCount)
          if (outcome.rejected || outcome.errorMessage)
            observe(() =>
              warnOnce(
                'partialSuccess',
                `${OTEL}partialSuccess rejected ${outcome.rejected} ${next.signal}${outcome.errorMessage ? ': ' + outcome.errorMessage : ''}`,
              ),
            )
          return {
            accepted: outcome.accepted,
            rejected: outcome.rejected,
            ...(outcome.errorMessage === undefined
              ? {}
              : { errorMessage: outcome.errorMessage }),
          }
        })
      }
      destinations.push(...extras)
      if (destinations.length === 0) {
        throw new Error('OTLP has no destination')
      }
      const [primary, ...rest] = destinations
      const extraJobs = rest.map((destination, index) =>
        Promise.resolve()
          .then(() => suppressTracing(() => destination(batch)))
          .then((result) => {
            if (result.rejected > 0 || result.errorMessage) {
              observe(() =>
                warnOnce(
                  `secondary-transport-result:${index}`,
                  OTEL + 'extra transport failed',
                  {
                    destination: index + 2,
                    signal: batch.signal,
                    rejected: result.rejected,
                  },
                ),
              )
            }
            return result
          })
          .catch((error) => {
            logExportError(error)
            return { accepted: 0, rejected: batch.itemCount }
          }),
      )
      const results = await Promise.all([
        suppressTracing(() => primary!(batch)),
        ...extraJobs,
      ])
      return results[0]!
    },
    internalName(name, 'transport'),
  )

  const encodedSizes = new WeakMap<DeliveryItem['record'], number>()
  const encoded = new WeakMap<
    DeliveryItem['record'],
    OtlpSpan | OtlpLogRecord
  >()
  const encodeRecord = (record: DeliveryItem['record']) => {
    const cached = encoded.get(record)
    if (cached) return cached
    let wire: OtlpSpan | OtlpLogRecord
    if (record.type === 'span') {
      const attributes = { ...record.attributes }
      for (const key of ['params', 'payload'] as const) {
        const value = record.values?.[key]
        if (value !== undefined)
          attributes['reatom.' + key] = capturedText(value)
      }
      wire = buildSpan({
        ...record,
        attributes,
        ...(record.values?.exceptionMessage === undefined
          ? {}
          : {
              status: {
                code: record.status?.code ?? 'error',
                message: capturedText(record.values.exceptionMessage),
              },
            }),
        events: [...record.events],
        links: record.links ? [...record.links] : undefined,
      })
      Object.assign(wire, { flags: record.flags })
    } else {
      const attributes = { ...record.attributes }
      delete attributes['event.name']
      if (record.values?.exceptionMessage !== undefined)
        attributes['exception.message'] = capturedText(
          record.values.exceptionMessage,
        )
      wire = buildLogRecord({ ...record, attributes })
    }
    encoded.set(record, wire)
    return wire
  }
  const groupByResource = (
    items: readonly DeliveryItem[],
    signal: 'traces' | 'logs',
  ) => {
    type Group = {
      resourceAttributes: Record<string, OtlpAttrValue>
      version: string
      spans: OtlpSpan[]
      logs: OtlpLogRecord[]
    }
    const groups = new Map<string, Group>()
    for (const { record } of items) {
      const key =
        stableKey(record.resourceAttributes) + ':' + record.scope.version
      let group = groups.get(key)
      if (!group) {
        group = {
          resourceAttributes: record.resourceAttributes,
          version: record.scope.version,
          spans: [],
          logs: [],
        }
        groups.set(key, group)
      }
      if (signal === 'traces' && record.type === 'span')
        group.spans.push(encodeRecord(record) as OtlpSpan)
      else if (signal === 'logs' && record.type === 'log')
        group.logs.push(encodeRecord(record) as OtlpLogRecord)
    }
    return [...groups.values()]
  }
  const payload = (items: readonly DeliveryItem[]) =>
    buildExportPayload({ groups: groupByResource(items, 'traces') })
  const logsPayload = (items: readonly DeliveryItem[]) =>
    buildLogsPayload({ groups: groupByResource(items, 'logs') })
  const selectUnload = (items: readonly DeliveryItem[]) =>
    selectUnloadBatch({
      items,
      maxBytes: availableUnloadBytes(pageDocument!),
      encode: (item) => JSON.stringify(payload([item]).resourceSpans[0]),
    })
  const onQuarantine = (count: number) =>
    observe(() => {
      invalidateStats()
      warnDev(`${OTEL}export unsettled, holding ${count}`)
    })
  const onFlushTimeout = (unfinished: number) =>
    observe(() => warnDev(`${OTEL}flush timeout: ${unfinished} unfinished`))
  const createSignalSender = (
    signalName: 'traces' | 'logs',
    encode: typeof payload | typeof logsPayload,
    select: typeof selectUnload,
  ) => {
    return async (
      items: readonly DeliveryItem[],
      {
        signal,
        deadline,
        keepalive,
        excludeOversized,
      }: Parameters<
        Parameters<typeof createExportWorker<DeliveryItem>>[0]['send']
      >[1],
    ) => {
      const allowed = items.filter(host.canDeliver)
      const blocked = items.length - allowed.length
      const consentDrops = (
        dropped: Partial<Record<'consent' | 'export', number>> = {},
      ) => (blocked > 0 ? { ...dropped, consent: blocked } : dropped)
      if (allowed.length === 0) {
        return {
          exported: 0,
          beaconAccepted: 0,
          droppedByReason: consentDrops(),
        }
      }
      if (!hasExportDestination()) {
        return {
          exported: allowed.length,
          beaconAccepted: 0,
          droppedByReason: consentDrops(),
        }
      }
      let credit: ReturnType<typeof reserveUnloadBytes> | undefined
      let keptCount = allowed.length
      let body: string | undefined
      try {
        if (keepalive) {
          const selected = select(allowed)
          keptCount = selected.keptCount
          excludeOversized(selected.droppedCount)
          if (keptCount === 0)
            return {
              exported: 0,
              beaconAccepted: 0,
              droppedByReason: consentDrops(),
            }
          body = selected.body
          credit = reserveUnloadBytes(
            pageDocument!,
            encoder.encode(body).length,
          )
        }
        const data = body === undefined ? encode(allowed) : undefined
        const result = await transport({
          signal: signalName,
          payload: data,
          body,
          keepalive,
          abort: signal,
          itemCount: keptCount,
          deadline,
        })
        return {
          exported: result.accepted,
          beaconAccepted: 0,
          droppedByReason: consentDrops(
            result.rejected ? { export: result.rejected } : {},
          ),
        }
      } finally {
        credit?.release()
      }
    }
  }
  const worker = createExportWorker<DeliveryItem>({
    exportTimeoutMs: queueOptions.exportTimeoutMs,
    onError: logExportError,
    onQuarantine,
    send: createSignalSender('traces', payload, selectUnload),
  })
  const logsWorker = createExportWorker<DeliveryItem>({
    exportTimeoutMs: queueOptions.exportTimeoutMs,
    onError: logExportError,
    onQuarantine,
    send: createSignalSender('logs', logsPayload, (items) =>
      selectLogsUnloadBatch({
        items,
        maxBytes: availableUnloadBytes(pageDocument!),
        encode: (item) => JSON.stringify(logsPayload([item]).resourceLogs[0]),
      }),
    ),
  })
  const queue = createBatchQueue<DeliveryItem>({
    ...queueOptions,
    onChange: invalidateStats,
    pauseWhile: isOffline,
    onError: logExportError,
    onFlushTimeout,
    isQuarantined: worker.isQuarantined,
    send: (lease) => {
      if (isObserving()) queueMicrotask(() => worker.send(lease))
      else worker.send(lease)
    },
  })
  const logsQueue = createBatchQueue<DeliveryItem>({
    ...queueOptions,
    maxQueueSize: Math.max(queueOptions.maxQueueSize, 1000),
    onChange: invalidateStats,
    pauseWhile: isOffline,
    onError: logExportError,
    onFlushTimeout,
    isQuarantined: logsWorker.isQuarantined,
    send: (lease) => {
      if (isObserving()) queueMicrotask(() => logsWorker.send(lease))
      else logsWorker.send(lease)
    },
  })
  const resumeExport = () => {
    if (!disposed && !isOffline()) {
      queue.wake()
      logsQueue.wake()
    }
  }
  const onlineTarget = typeof window === 'undefined' ? undefined : window
  onlineTarget?.addEventListener('online', resumeExport)
  const flushNow = () => {
    if (disposed || !pageDocument) return
    if (!hasExportDestination()) return
    host.closePendingSpans()
    if (isOffline()) return
    const tracesLease = queue.takeForUnload()
    const logsLease = logsQueue.takeForUnload()
    if (!tracesLease && !logsLease) return
    if (
      input.useBeacon !== true ||
      runtimeOptions().endpoint === null ||
      (runtimeOptions().transports?.length ?? 0) > 0
    ) {
      if (tracesLease) worker.send(tracesLease, true)
      if (logsLease) logsWorker.send(logsLease, true)
      return
    }
    if (logsLease) logsWorker.send(logsLease, true)
    const lease = tracesLease
    if (!lease) return
    const allowed = lease.items.filter((item) => host.canDeliver(item))
    const blocked = lease.items.length - allowed.length
    if (allowed.length === 0) {
      lease.release({
        exported: 0,
        beaconAccepted: 0,
        droppedByReason: { consent: lease.items.length },
      })
      return
    }
    let credit: ReturnType<typeof reserveUnloadBytes> | undefined
    let keptCount = allowed.length
    let excluded = 0
    try {
      const selected = selectUnload(allowed)
      keptCount = selected.keptCount
      excluded = selected.droppedCount
      const consentDrop = blocked > 0 ? { consent: blocked } : {}
      if (keptCount === 0) {
        lease.release({
          exported: 0,
          beaconAccepted: 0,
          droppedByReason: { oversized: excluded, ...consentDrop },
        })
        return
      }
      credit = reserveUnloadBytes(
        pageDocument,
        encoder.encode(selected.body).length,
      )
      const endpoint = runtimeOptions().endpoint
      if (endpoint === null) {
        lease.release({
          exported: allowed.length,
          beaconAccepted: 0,
          droppedByReason: consentDrop,
        })
        return
      }
      const sendBeacon = input.sendBeacon
      if (disposed) {
        lease.release({
          exported: 0,
          beaconAccepted: 0,
          droppedByReason: {
            disposed: keptCount,
            oversized: excluded,
            ...consentDrop,
          },
        })
        return
      }
      const accepted = flushWithBeacon({
        endpoint,
        body: selected.body,
        sendBeacon,
      })
      if (accepted) credit.acceptBeacon()
      lease.release({
        exported: 0,
        beaconAccepted: accepted ? keptCount : 0,
        droppedByReason: {
          oversized: excluded,
          export: accepted ? 0 : keptCount,
          ...consentDrop,
        },
      })
      if (!accepted)
        logExportError(new Error('beacon delivery failed'), lease.items)
    } catch (error) {
      lease.release({
        exported: 0,
        beaconAccepted: 0,
        droppedByReason: {
          oversized: excluded,
          [disposed ? 'disposed' : 'export']: keptCount,
          ...(blocked > 0 && { consent: blocked }),
        },
      })
      logExportError(error, lease.items)
    } finally {
      credit?.release()
    }
  }

  const onVisibilityChange = () => {
    if (
      typeof document !== 'undefined' &&
      document.visibilityState === 'hidden'
    ) {
      flushNow()
    }
  }
  // iOS Safari fires `pagehide` without flipping visibilityState during
  // bf-cache transitions, so this handler must NOT gate on visibility.
  const onPageHide = flushNow

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange)
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', onPageHide)
  }

  const binding: ExporterBinding = {
    reserve(signal) {
      const reservation =
        signal === 'traces' ? queue.reserve() : logsQueue.reserve()
      if (!reservation) return
      let finished = false
      let prepared: DeliveryItem['record'] | undefined
      const prepare = (item: DeliveryItem) => {
        if (finished) return false
        if (prepared === item.record) return true
        try {
          const wire = encodeRecord(item.record)
          const key = signal === 'traces' ? 'span' : 'log'
          let bytes = encodedSizes.get(item.record)
          if (bytes === undefined) {
            bytes = encoder.encode(
              JSON.stringify({
                [key]: wire,
                resource: buildResource(item.record.resourceAttributes),
                scope: item.record.scope,
              }),
            ).length
            encodedSizes.set(item.record, bytes)
          }
          if (bytes > MAX_RECORD_BYTES) {
            finished = true
            reservation.cancel('oversized')
            return false
          }
          prepared = item.record
          return true
        } catch {
          finished = true
          reservation.cancel('observation')
          return false
        }
      }
      return {
        prepare,
        cancel(reason) {
          if (finished) return
          finished = true
          reservation.cancel(reason)
        },
        release() {
          if (finished) return
          finished = true
          reservation.release()
        },
        commit(item) {
          if (!prepare(item)) return false
          finished = true
          reservation.commit(item)
          return true
        },
      }
    },
    dropQueued(predicate) {
      queue.dropQueued(predicate)
      logsQueue.dropQueued(predicate)
    },
    flush: () => Promise.all([queue.flush(), logsQueue.flush()]).then(() => {}),
    dispose() {
      if (disposed) return
      disposed = true
      queue.dispose()
      worker.dispose()
      logsQueue.dispose()
      logsWorker.dispose()
      onlineTarget?.removeEventListener('online', resumeExport)
      if (typeof document !== 'undefined')
        document.removeEventListener('visibilitychange', onVisibilityChange)
      if (typeof window !== 'undefined')
        window.removeEventListener('pagehide', onPageHide)
      invalidateStats()
    },
  }
  try {
    host = bindExporter(instance, binding)
    host.attachCleanup(binding.dispose)
  } catch (error) {
    binding.dispose()
    unbindExporter(instance, binding)
    throw error
  }
  const collectStats = (): TelemetryStats => {
    const traces = queue.stats(),
      logs = logsQueue.stats()
    const droppedByReason = { ...traces.droppedByReason }
    for (const reason of Object.keys(
      droppedByReason,
    ) as (keyof typeof droppedByReason)[])
      droppedByReason[reason] =
        (traces.droppedByReason[reason] ?? 0) +
        (logs.droppedByReason[reason] ?? 0)
    return Object.freeze({
      active: traces.active + logs.active,
      queued: traces.queued + logs.queued,
      inFlight: traces.inFlight + logs.inFlight,
      exported: traces.exported + logs.exported,
      dropped: traces.dropped + logs.dropped,
      droppedByReason: Object.freeze(droppedByReason),
      beaconAccepted: traces.beaconAccepted + logs.beaconAccepted,
      flushTimeouts: traces.flushTimeouts + logs.flushTimeouts,
      transportQuarantined:
        traces.transportQuarantined || logs.transportQuarantined,
    })
  }
  const stats = computed(
    () => state(),
    internalName(name, 'otlp', 'stats'),
  ).extend(
    withMiddleware(
      () => (next) => {
        const current = state()
        next()
        return current
      },
      'read',
    ),
  )
  return { otlp: otlp.extend(() => ({ stats, transport })) }
}
