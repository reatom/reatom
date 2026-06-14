import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import { reatomComponent } from '@reatom/react'

import '../styles.css'

import { getSsrSnapshotScriptId } from '../lib/reatom-ssr'
import { ssrSnapshotJsonAtom } from '../model'

const RootDocument = reatomComponent(() => {
  const ssrSnapshotJson = ssrSnapshotJsonAtom()

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <main>
          <Outlet />
        </main>
        <script
          id={getSsrSnapshotScriptId()}
          type="application/json"
          dangerouslySetInnerHTML={{ __html: ssrSnapshotJson }}
        />
        <Scripts />
      </body>
    </html>
  )
}, 'RootDocument')

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Reatom TanStack Start SSR' },
    ],
  }),
  component: RootDocument,
})
