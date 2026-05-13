import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import './styles.css'

import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { reatomContext } from '@reatom/react'

import { rootFrame } from './setup'
import { App } from './app/App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <reatomContext.Provider value={rootFrame}>
      <App />
    </reatomContext.Provider>
  </StrictMode>,
)
