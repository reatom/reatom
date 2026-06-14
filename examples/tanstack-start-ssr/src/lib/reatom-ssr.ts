import {
  context,
  isPersistRecord,
  noop,
  type Fn,
  type PersistRecord,
  type RootFrame,
  top,
  urlAtom,
  wrap,
} from '@reatom/core'

import { searchResource, ssrSnapshotJsonAtom, ssrStorage } from '../model'

export type SsrSnapshot = Record<string, PersistRecord<unknown>>

const snapshotScriptId = 'reatom-ssr-snapshot'

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isSsrSnapshot = (value: unknown): value is SsrSnapshot =>
  isObjectRecord(value) && Object.values(value).every(isPersistRecord)

export const setupSsrUrl = (href: string) => {
  urlAtom.sync.set(() => noop)
  urlAtom.set(new URL(href))
}

export const serializeSsrSnapshot = (snapshot: SsrSnapshot) =>
  JSON.stringify(snapshot).replaceAll('<', '\\u003c')

export const parseSsrSnapshot = (text: string): SsrSnapshot => {
  const snapshot: unknown = text.trim() ? JSON.parse(text) : {}

  if (!isSsrSnapshot(snapshot)) {
    throw new Error('Invalid Reatom SSR snapshot')
  }

  return snapshot
}

export const getSsrSnapshotScriptId = () => snapshotScriptId

export const readSsrSnapshotFromDocument = () => {
  const snapshotElement = document.getElementById(snapshotScriptId)
  return parseSsrSnapshot(snapshotElement?.textContent ?? '{}')
}

const allSettled = (start: Fn) =>
  new Promise<void>((resolve) => {
    let pendingCallbacks = 0
    let isRestored = false
    const { root } = top()
    const pushQueue = root.pushQueue
    const restore = () => {
      if (isRestored || pendingCallbacks > 0) return

      isRestored = true
      root.pushQueue = pushQueue
      resolve()
    }

    root.pushQueue = (cb, queue) => {
      pendingCallbacks++

      root[queue].push(async () => {
        try {
          await cb()
        } finally {
          pendingCallbacks--
          restore()
        }
      })
    }

    start()
    queueMicrotask(restore)
  })

export const preloadSsrModel = () =>
  allSettled(() => {
    searchResource.data()
  })

export const createServerFrame = async (href: string): Promise<RootFrame> => {
  const frame = context.start()

  await frame.run(async () => {
    setupSsrUrl(href)
    await wrap(preloadSsrModel())
    ssrSnapshotJsonAtom.set(serializeSsrSnapshot(ssrStorage.snapshotAtom()))
  })

  return frame
}

export const createClientFrame = (href: string, snapshot: SsrSnapshot) => {
  const frame = context.start()

  frame.run(() => {
    setupSsrUrl(href)
    ssrStorage.snapshotAtom.set(snapshot)
    ssrSnapshotJsonAtom.set(serializeSsrSnapshot(snapshot))
  })

  return frame
}
