import {
  clearStack,
  connectLogger,
  context,
  rAF,
  take,
  top,
  wrap,
} from '@reatom/core'
import React, { useLayoutEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { expect, test, vi } from 'vitest'

import { reatomContext, useWrap } from './'

clearStack()

const tick = async () => {
  await wrap(take(rAF))
  await wrap(take(rAF))
}

test('a useWrap call does not throw inside the connected logger', () =>
  context.start(async () => {
    connectLogger()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

    const Probe = () => {
      const callback = useWrap(() => 'done', 'probeCallback')
      useLayoutEffect(() => {
        callback()
      }, [callback])
      return null
    }

    const container = document.createElement('div')
    document.body.append(container)
    const root = ReactDOM.createRoot(container)
    root.render(
      <reatomContext.Provider value={top()}>
        <Probe />
      </reatomContext.Provider>,
    )
    await wrap(tick())
    root.unmount()
    container.remove()

    const errorMessages = consoleError.mock.calls.map(([message]) => message)
    const loggedErrors = consoleLog.mock.calls
      .map(([value]) => value)
      .filter((value): value is Error => value instanceof Error)
      .map((error) => error.message)
    consoleError.mockRestore()
    consoleLog.mockRestore()

    expect({ errorMessages, loggedErrors }).toEqual({
      errorMessages: [],
      loggedErrors: [],
    })
  }))
