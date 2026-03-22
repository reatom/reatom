import { connectLogger, log } from '@reatom/core'

if (import.meta.env.MODE === 'development') {
  connectLogger()
}

declare global {
  var LOG: typeof log
}
globalThis.LOG = log
