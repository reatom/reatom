export class ReatomError extends Error {}

export const REATOM_CORE_VERSION = '1001.0.0'

export interface ReatomGlobalPackage<State extends object> {
  version: string
  state: State
}

export interface ReatomGlobal {
  packages: Partial<ReatomGlobalPackages>
}

declare global {
  interface ReatomGlobalPackages {}

  var __REATOM: ReatomGlobal | undefined
}

export let getReatomGlobal = (): ReatomGlobal => {
  let reatomGlobal = globalThis.__REATOM

  if (reatomGlobal === undefined) {
    return (globalThis.__REATOM = { packages: {} })
  }

  if (reatomGlobal.packages === undefined) {
    throw new ReatomError('package duplication')
  }

  return reatomGlobal
}
