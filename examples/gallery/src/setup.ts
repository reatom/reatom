import { connectLogger } from '@reatom/core'

if (import.meta.env.MODE === 'development') {
  connectLogger()
}
