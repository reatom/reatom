import {
  context,
  isPersistRecord,
  noop,
  type Fn,
  type PersistRecord,
  top,
  urlAtom,
  wrap,
} from '@reatom/core'

import { searchResource, ssrStorage } from '../model'

export type SsrSnapshot = Record<string, PersistRecord<unknown>>

export interface SsrLoaderData {
  href: string
  snapshotJson: string
}

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

export const normalizeSsrHref = (href: string) =>
  new URL(href, 'http://localhost').href

export const createSsrLoaderData = async (
  href: string,
): Promise<SsrLoaderData> =>
  context.start(async () => {
    const normalizedHref = normalizeSsrHref(href)

    setupSsrUrl(normalizedHref)
    await wrap(preloadSsrModel())

    return {
      href: normalizedHref,
      snapshotJson: serializeSsrSnapshot(ssrStorage.snapshotAtom()),
    }
  })

export const createFrameFromSnapshot = (href: string, snapshotJson: string) => {
  const frame = context.start()

  frame.run(() => {
    const snapshot = parseSsrSnapshot(snapshotJson)

    setupSsrUrl(normalizeSsrHref(href))
    ssrStorage.snapshotAtom.set(snapshot)
  })

  return frame
}
