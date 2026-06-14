import { renderRouterToStream } from '@tanstack/react-router/ssr/server'
import {
  createStartHandler,
  defineHandlerCallback,
  StartServer,
  type RequestHandler,
} from '@tanstack/react-start/server'
import { createServerEntry } from '@tanstack/react-start/server-entry'
import { reatomContext } from '@reatom/react'

import { createServerFrame } from './lib/reatom-ssr'

import type { Register } from '@tanstack/react-router'

const reatomStreamHandler = defineHandlerCallback(
  async ({ request, router, responseHeaders }) => {
    const frame = await createServerFrame(request.url)

    return renderRouterToStream({
      request,
      router,
      responseHeaders,
      children: (
        <reatomContext.Provider value={frame}>
          <StartServer router={router} />
        </reatomContext.Provider>
      ),
    })
  },
)

const fetch = createStartHandler(reatomStreamHandler)

export type ServerEntry = { fetch: RequestHandler<Register> }

export default createServerEntry({ fetch })
