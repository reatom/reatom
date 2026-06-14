import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import { reatomContext } from '@reatom/react'
import { useMemo } from 'react'

import '../styles.css'

import {
  createFrameFromSnapshot,
  createSsrLoaderData,
  getSsrSnapshotScriptId,
} from '../lib/reatom-ssr'

const RootDocument = () => {
  const loaderData = Route.useLoaderData()
  const frame = useMemo(
    () => createFrameFromSnapshot(loaderData.href, loaderData.snapshotJson),
    [loaderData.href, loaderData.snapshotJson],
  )

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <reatomContext.Provider value={frame}>
          <main>
            <Outlet />
          </main>
        </reatomContext.Provider>
        <script
          id={getSsrSnapshotScriptId()}
          type="application/json"
          dangerouslySetInnerHTML={{ __html: loaderData.snapshotJson }}
        />
        <Scripts />
      </body>
    </html>
  )
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Reatom TanStack Start SSR' },
    ],
  }),
  loader: ({ location }) => createSsrLoaderData(location.href),
  component: RootDocument,
})
