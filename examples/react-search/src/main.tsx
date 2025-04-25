import '@mantine/core/styles.css'
import ReactDOM from 'react-dom/client'
import { clearStack, context } from '@reatom/core'
import { reatomContext } from '@reatom/react'
import './debug' // import before the app!
import { App } from './app'

clearStack()

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(
  <reatomContext.Provider value={context.start()}>
    <App />
  </reatomContext.Provider>,
)
