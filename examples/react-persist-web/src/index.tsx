import { clearStack, context } from '@reatom/core'
import ReactDOM from 'react-dom/client'
import { reatomContext } from '@reatom/react'

import { App } from './app'

clearStack()

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(
  <reatomContext.Provider value={context.start()}>
    <App />
  </reatomContext.Provider>,
)
