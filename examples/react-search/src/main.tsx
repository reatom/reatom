import '@mantine/core/styles.css'
import './debug' // import before the app!

import ReactDOM from 'react-dom/client'

import { App } from './app'

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(<App />)
