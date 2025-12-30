import './setup'

import { mount } from '@reatom/jsx'

import { App } from './App'

// Mount app within created context
mount(document.getElementById('app')!, <App />)
