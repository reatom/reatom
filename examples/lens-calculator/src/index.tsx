import './setup'

import { mount } from '@reatom/jsx'

import { App } from './App'
import { applyDocumentLang } from './translations'

applyDocumentLang()

mount(document.getElementById('app')!, <App />)
