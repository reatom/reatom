export const VERSION = '1001'

export type ReatomGlobal = {
  version: string
  extensions: unknown[]
} & Record<string, unknown>

declare global {
  var __REATOM: ReatomGlobal | undefined
}

export let ensureReatomGlobal = (): ReatomGlobal => {
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

export let _createGlobal = <T>(name: string, init: () => T): T => {
  let g = ensureReatomGlobal()
  return (g[name] ??= init()) as T
}
