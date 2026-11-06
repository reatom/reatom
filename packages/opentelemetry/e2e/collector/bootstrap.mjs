/* global URLSearchParams, location, window, __APP__ */

import { action, bind, wrap } from '@reatom/core'
import { reatomOpentelemetry, withOTLP } from '@reatom/opentelemetry'

const params = new URLSearchParams(location.search)
const traced = params.get('mode') !== 'raw'
const run = bind((callback) => callback())
const otel = traced
  ? reatomOpentelemetry({
      name: `collector-${__APP__}`,
      serviceName: `collector-${__APP__}`,
      resourceAttributes: {
        'test.case_id': params.get('case'),
        'test.run_id': params.get('run'),
      },
      recordLimit: 20000,
      filter: (target) => {
        const actionAdmitted =
          __APP__ === 'tree'
            ? /^tree#.*\.(toggle|add|del)$/.test(target.name)
            : __APP__ === 'xo'
              ? /^(makeMove|computerMove|resetGame)$/.test(target.name)
              : false
        if (actionAdmitted) return true
        return (
          params.get('atoms') === 'true' && target.__reatom.reactive === true
        )
      },
      ...(params.get('capture') === 'true'
        ? {
            captureValues: {
              redact: (_key, value) =>
                typeof value === 'string'
                  ? value.replaceAll('PRIVATE_FIXTURE', '[redacted]')
                  : value,
            },
          }
        : {}),
    }).extend(
      withOTLP({
        endpoint:
          params.get('offline') === 'true'
            ? 'http://collector:4319'
            : 'http://collector:4318',
        maxBatchSize: 10000,
        maxQueueSize: 20000,
        batchInterval: 60000,
        retry: { maxRetries: 0 },
        useBeacon: params.get('beacon') === 'true',
      }),
    )
  : undefined

// Import the unchanged entrypoint only after the adapter has been installed.
const { model } = await import('virtual:collector-entry')

const pending = []
const boundaries = new Map()
const boundary = (name) => {
  let target = boundaries.get(name)
  if (!target) {
    target = action((callback) => callback(), name)
    if (otel) target.extend(otel.withOTel())
    boundaries.set(name, target)
  }
  return target
}
const trace = (name, callback) => boundary(name)(callback)

const controls = {
  ready: true,
  app: __APP__,
  traced,
  stats: () => otel?.otlp.stats(),
  flush: async () => {
    await Promise.allSettled(pending)
    await otel?.flush()
    return otel?.otlp.stats()
  },
  dispose: () => otel?.dispose(),
  snapshot: () =>
    run(() =>
      __APP__ === 'xo'
        ? {
            board: [...model.board()],
            player: model.currentPlayer(),
            winner: model.winner(),
            scores: [model.xWins(), model.oWins(), model.draws()],
            thinking: model.isComputerThinking(),
            computer: model.playWithComputer(),
          }
        : __APP__ === 'search'
          ? {
              query: model.issueQuery(),
              state: model.issueState(),
              page: model.issuePage(),
              titles:
                model.issuesResource.data()?.items.map((item) => item.title) ??
                [],
              error: model.issuesError()?.message ?? null,
              loading: model.isIssuesLoading(),
            }
          : undefined,
    ),
  occupiedMove: () => run(() => model.makeMove(0)),
  // This explicit boundary observes the original cached request Promise. It
  // neither replaces the computed body nor claims automatic reactive tracing.
  traceSearch: (name = 'search.request') =>
    run(() => {
      const original = model.issuesResource()
      const result = trace(name, () => original)
      pending.push(Promise.resolve(result).catch(() => {}))
      return result === original
    }),
  // Application participation is required across await. Exercise it with the
  // actual application's action, retaining Reatom context through wrap.
  explicitReset: () =>
    run(() =>
      trace('explicit.root', async () => {
        await wrap(Promise.resolve())
        return model.resetGame()
      }),
    ),
}

Object.assign(window, { collectorTest: controls })
