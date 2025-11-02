---
title: Tooling
description: The list of key tools for Reatom
---

Reatom has incredible capabilities for debugging and tracing your code. We will publish our devtools soon, but now you can use `connectLogger` for simple (or not!) logging.

```ts title="debug.ts"
import { connectLogger } from 'reatom/core'

connectLogger()
```

```tsx title="main.tsx"
import './debug' // import debug file before all other modules!
import ReactDOM from 'react-dom/client'
import { App } from './app'

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(<App />)
```

## Eslint

We recommend using ESLint to enforce best practices and coding standards in your Reatom projects. We will publish our own eslint plugin for names autofix soon, but now you can use this plugin to automate your react components naming:

- https://github.com/artalar/eslint-plugin-react-component-name
