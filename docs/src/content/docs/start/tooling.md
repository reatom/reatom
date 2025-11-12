---
title: Tooling
description: The list of key tools for Reatom
---

## Logging

Reatom has incredible capabilities for debugging and tracing your code. We will publish our devtools soon, but now you can use `connectLogger` for simple (or not!) logging.

```tsx title="main.tsx"
import './debug' // import debug file before all other modules!
import ReactDOM from 'react-dom/client'
import { App } from './app'

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(<App />)
```

For better logging, you can use built-in `log` function, it will forward all arguments to the native `console.log`.

```ts title="debug.ts"
import { connectLogger, log } from 'reatom/core'

if (import.meta.env.MODE === 'development') {
  connectLogger()
}

declare global {
  var LOG: typeof log
}
globalThis.LOG = log
```

### Log action

`log` may give you huge DX impact:

- the name is short name and handy
- it will trace the relative call stack and show each time
- **you can put it everywhere** and commit to the source code, logs will not be visible in production
- you can extend it!

`log` is an action, which means you can extend it with `withCallHook` or other action extensions to add custom behavior (e.g., sending logs to a remote service, filtering specific log types, etc.).

```ts
import { withCallHook } from '@reatom/core'

LOG.extend(
  withCallHook((params) => {
    // Send logs to a remote service
    sendToAnalytics({ level: 'debug', args: params })
  }),
)
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
