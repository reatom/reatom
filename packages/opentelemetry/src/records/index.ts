import { reatomReadonlyView } from '../readonlyView.ts'
import { action, _enqueue, reatomObservable } from '@reatom/core'
import { observe } from '../observation.ts'
import type { CapturedRecord } from '../records.ts'
import type { TelemetrySink } from '../kernel/reatomTelemetry.ts'
export const reatomRecordSink = (limit = 1000, name = 'otel.records') => {
  if (!Number.isSafeInteger(limit) || limit < 1)
    throw new RangeError('record limit')
  let items: CapturedRecord[] = []
  let snapshot: readonly CapturedRecord[] | undefined
  const listeners = new Set<(records: readonly CapturedRecord[]) => void>()
  let disposed = false
  const getState = () => (snapshot ??= Object.freeze(items.slice()))
  let queued = false
  const publish = () => {
    snapshot = undefined
    if (queued || !listeners.size) return
    queued = true
    _enqueue(() => {
      queued = false
      const current = getState()
      for (const listener of listeners) observe(() => listener(current))
    }, 'hook')
  }
  const records = reatomObservable(
    {
      getState,
      subscribe(listener) {
        if (disposed) return
        listeners.add(listener)
        listener(getState())
        return () => listeners.delete(listener)
      },
    },
    name,
  )
  const clear = action(() => {
    items = []
    publish()
  }, `${name}.clear`)
  const sink: TelemetrySink = {
    reserve() {
      if (disposed) return
      let released = false
      return {
        commit(record) {
          if (released || disposed) return
          released = true
          items.push(record)
          if (items.length > limit) items.shift()
          publish()
        },
        release() {
          released = true
        },
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      clear()
      const current = getState()
      for (const listener of listeners) observe(() => listener(current))
      listeners.clear()
    },
  }
  return reatomReadonlyView(records, `${name}.readonly`).extend(() => ({
    sink,
    clear,
  }))
}
