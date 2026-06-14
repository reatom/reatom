import { StartClient } from '@tanstack/react-start/client'
import { reatomContext } from '@reatom/react'
import { StrictMode, startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'

import {
  createClientFrame,
  readSsrSnapshotFromDocument,
} from './lib/reatom-ssr'

const frame = createClientFrame(
  window.location.href,
  readSsrSnapshotFromDocument(),
)

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <reatomContext.Provider value={frame}>
        <StartClient />
      </reatomContext.Provider>
    </StrictMode>,
  )
})
