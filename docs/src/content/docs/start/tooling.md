---
title: Tooling
description: The list of key tools for Reatom
---

Reatom has incredible capabilities for debugging and tracing your code. We will publish our devtools soon, but now you can use `connectLogger` for simple (or not!) logging.

```tsx title="main.tsx"
import './debug' // import debug file before all other modules!
import ReactDOM from 'react-dom/client'
import { App } from './app'

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(<App />)
```

For better logging, you can use built-in `LOG` function, which will trace the call stack and forward all arguments to the native `console.log`.

The profit of this is the more short name and that **you can put `LOG` everywhere**, logs will not be visible in production!

```ts title="debug.ts"
import { connectLogger, LOG } from 'reatom/core'

if (import.meta.env.MODE === 'development') {
  connectLogger()
}

declare global {
  var LOG: typeof LOG
}
globalThis.LOG = LOG
```

## Eslint

We recommend using ESLint to enforce best practices and coding standards in your Reatom projects. We will publish our own ESLint plugin for name autofix soon, but you can use this plugin right now to automate `action`, `computed`, `effect` naming:

- https://github.com/artalar/eslint-plugin-react-component-name

```json
{
  "plugins": ["react-component-name"],
  "rules": {
    "prefer-arrow-callback": ["error", { "allowNamedFunctions": true }],

    "react-component-name/react-component-name": [
      "error",
      {
        "targets": ["action", "computed", "effect", "reatomComponent"]
      }
    ]
  }
}
```
