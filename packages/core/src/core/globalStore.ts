export const VERSION = '1001'

export type ReatomGlobal = {
  version: string
  extensions: unknown[]
} & Record<string, unknown>

declare global {
  var __REATOM: ReatomGlobal | undefined
}

/* @__NO_SIDE_EFFECTS__ */
export function ensureReatomGlobal(): ReatomGlobal {
  let rt = globalThis.__REATOM as undefined | unknown[] | ReatomGlobal

  if (rt === undefined) {
    rt = { version: VERSION, extensions: [] }
    globalThis.__REATOM = rt
    return rt
  }

  if (Array.isArray(rt)) {
    let extensions = rt
    rt = { version: VERSION, extensions }
    globalThis.__REATOM = rt
    return rt
  }

  return rt as ReatomGlobal
}

/* @__NO_SIDE_EFFECTS__ */
export function _createGlobal<T>(name: string, init: () => T): T {
  let g = ensureReatomGlobal()
  return (g[name] ??= init()) as T
}
