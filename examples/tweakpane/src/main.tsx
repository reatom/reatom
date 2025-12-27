import './main.css'

import { clearStack, connectLogger, context } from '@reatom/core'
import { reatomContext } from '@reatom/react'
import { createRoot } from 'react-dom/client'

import { App } from './app'

clearStack()

const rootFrame = context.start()
if (import.meta.env.DEV) {
  rootFrame.run(connectLogger)
}

const rootElement = document.getElementById('root')

const root = createRoot(rootElement!)

root.render(
  <reatomContext.Provider value={rootFrame}>
    <App />
  </reatomContext.Provider>,
)
