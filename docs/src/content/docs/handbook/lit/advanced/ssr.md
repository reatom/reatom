---
title: SSR
description: SSR - Reatom Lit integration
---

Server-Side Rendering with Reatom + Lit

This guide covers using @reatom/lit components with @lit-labs/ssr for
server-side rendering and hydration.

## Overview

SSR with Lit allows you to:
- Render components on the server for faster initial page load
- Improve SEO by providing content to crawlers
- Support users with JavaScript disabled (static content)

## Installation

```bash
npm install @lit-labs/ssr
```

```ts
import { atom, computed, context } from '@reatom/core'
import { ReatomLitElement, watch } from '@reatom/lit'
import { html } from 'lit'

// ============================================================================
// Basic SSR Setup
// ============================================================================
```

## Server-Side Rendering Setup

Create a server entry point that renders components:

```ts
// server.ts
import { render } from '@lit-labs/ssr'
import { html } from 'lit'
import { collectResult } from '@lit-labs/ssr/lib/render-result.js'

// Import your components
import './components/my-app.js'

async function renderPage() {
  const ssrResult = render(html`
    <!DOCTYPE html>
    <html>
      <head>
        <title>My App</title>
      </head>
      <body>
        <my-app></my-app>
        <script type="module" src="/client.js"></script>
      </body>
    </html>
  `)

  return collectResult(ssrResult)
}
```

```ts
// ============================================================================
// Handling Initial State
// ============================================================================
```

## Passing Initial State to Client

Transfer atom state from server to client for hydration:

```ts
// Shared atoms
const userAtom = atom<{ name: string; id: string } | null>(null, 'user')
const themeAtom = atom<'light' | 'dark'>('light', 'theme')

// Serialize state for transfer
function serializeState(): string {
  return JSON.stringify({
    user: userAtom(),
    theme: themeAtom(),
  })
}

// Restore state on client
function hydrateState(serializedState: string): void {
  const state = JSON.parse(serializedState)
  if (state.user) userAtom.set(state.user)
  if (state.theme) themeAtom.set(state.theme)
}

/**
 * Server template with embedded state:
 *
 * ```ts
 * // server.ts
 * function renderWithState() {
 *   // Set initial state on server
 *   userAtom.set({ name: 'John', id: '123' })
 *
 *   const stateScript = `
 *     <script>
 *       window.__INITIAL_STATE__ = ${serializeState()};
 *     </script>
 *   `
 *
 *   return render(html`
 *     <!DOCTYPE html>
 *     <html>
 *       <body>
 *         <my-app></my-app>
 *         ${stateScript}
 *         <script type="module" src="/client.js"></script>
 *       </body>
 *     </html>
 *   `)
 * }
 * ```
 *
 * Client hydration:
 *
 * ```ts
 * // client.ts
 * import { hydrateState } from './state.js'
 *
 * // Restore state before components hydrate
 * if (window.__INITIAL_STATE__) {
 *   hydrateState(window.__INITIAL_STATE__)
 * }
 *
 * // Import components to trigger hydration
 * import './components/my-app.js'
 * ```
 */

// ============================================================================
// Conditional Rendering for SSR
// ============================================================================
```

## Conditional Server/Client Rendering

Use `isServer` to conditionally render content:

```ts
// Check if running on server
const isServer = typeof window === 'undefined'

class SmartComponent extends ReatomLitElement {
  render() {
    if (isServer) {
      // Server: render static content only
      return html`
        <div class="user-profile">
          <p>Loading user profile...</p>
        </div>
      `
    }

    // Client: render with full reactivity
    const user = userAtom()
    return html`
      <div class="user-profile">
        ${user ? html`<p>Welcome, ${user.name}!</p>` : html`<p>Please log in</p>`}
      </div>
    `
  }
}

customElements.define('smart-component', SmartComponent)

// ============================================================================
// watch() Directive Limitations
// ============================================================================
```

## Important: watch() in SSR

The `watch()` directive renders only the **initial value** during SSR.
Reactivity activates after hydration on the client.

This means:
- Initial render uses current atom values
- No subscriptions are created on server
- Full reactivity starts after client hydration

```ts
const countAtom = atom(0, 'count')

class CounterWithWatch extends ReatomLitElement {
  render() {
    // On server: renders "Count: 0" (initial value)
    // On client: reactive, updates when countAtom changes
    return html`
      <div>
        <p>Count: ${watch(countAtom)}</p>
        <button @click=${() => countAtom.set((n) => n + 1)}>+</button>
      </div>
    `
  }
}

customElements.define('counter-with-watch', CounterWithWatch)

// ============================================================================
// Async Data and SSR
// ============================================================================
```

## Async Data Loading

For components that need async data, prefetch on the server:

```ts
// server.ts
import { userAtom, fetchUser } from './state.js'

async function renderUserPage(userId: string) {
  // Fetch data before rendering
  await fetchUser(userId)

  // Now userAtom has data, render will include it
  return render(html`<user-profile></user-profile>`)
}
```

The component will render with the prefetched data on the server.

```ts
// ============================================================================
// Best Practices for SSR
// ============================================================================
```

## SSR Best Practices

### 1. Isolate Server Context

Create a fresh context for each request to avoid state leakage:

```ts
async function handleRequest(req) {
  // Fresh context per request
  context.start()

  // Set request-specific state
  userAtom.set(req.user)

  return render(html`<my-app></my-app>`)
}
```

### 2. Avoid Browser APIs on Server

Guard browser-specific code:

```ts
class MyComponent extends ReatomLitElement {
  connectedCallback() {
    super.connectedCallback()
    if (typeof window !== 'undefined') {
      // Browser-only code
      window.addEventListener('resize', this.onResize)
    }
  }
}
```

### 3. Use Streaming for Large Pages

```ts
import { render } from '@lit-labs/ssr'
import { RenderResultReadable } from '@lit-labs/ssr/lib/render-result-readable.js'

app.get('/', (req, res) => {
  const result = render(html`<my-app></my-app>`)
  const stream = new RenderResultReadable(result)
  stream.pipe(res)
})
```

## Summary

| Aspect | Server | Client |
|--------|--------|--------|
| Atoms | Initial values only | Full reactivity |
| watch() | Renders initial value | Reactive updates |
| Subscriptions | Not created | Active after hydration |
| Browser APIs | Not available | Available |

Remember to:
- Prefetch async data before rendering
- Serialize and transfer initial state
- Guard browser-specific code
- Use fresh context per request

```ts
export { serializeState, hydrateState }
```

---

← [Using withReatomElement Mixin](/handbook/lit/advanced/mixin) | [When to Use](/handbook/lit/advanced/when-to-use) →
