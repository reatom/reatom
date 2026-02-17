# @reatom/lit

Integration of Reatom with Lit for creating reactive web components.

🎮 **[Live Demo: Real-time Orderbook](https://www.reatom.dev/demo/lit-orderbook/)** — see Reatom + Lit in action with WebSocket updates

## Installation

```bash
npm install @reatom/lit @reatom/core lit
```

**Peer dependencies:**

- `@reatom/core` (workspace version)
- `lit` >= 3.0.0

## Quick Start

```typescript
import { atom } from '@reatom/core'
import { ReatomLitElement, watch } from '@reatom/lit'
import { html } from 'lit'

// Create a shared atom
const count = atom(0, 'count')

// Create a reactive component
class CounterElement extends ReatomLitElement {
  override render() {
    return html`
      <div>
        <span>Count: ${watch(count)}</span>
        <button @click=${() => count.set((n) => n + 1)}>+</button>
      </div>
    `
  }
}

customElements.define('counter-element', CounterElement)
```

## API Reference

### ReatomLitElement

Base class for Lit elements with Reatom integration. Extend this class directly:

```typescript
import { atom } from '@reatom/core'
import { ReatomLitElement, watch } from '@reatom/lit'
import { html } from 'lit'

const timer = atom(0, 'timer')

class TimerElement extends ReatomLitElement {
  override render() {
    return html`<div>Timer: ${watch(timer)}</div>`
  }
}
```

### withReatomElement

Mixin for adding Reatom support to existing Lit elements. Use when you need to extend a custom LitElement base class:

```typescript
import { atom } from '@reatom/core'
import { withReatomElement, watch } from '@reatom/lit'
import { LitElement, html } from 'lit'

const count = atom(0, 'count')

const CounterElement = withReatomElement(
  class CounterElement extends LitElement {
    override render() {
      return html`<div>Count: ${watch(count)}</div>`
    }
  },
)

customElements.define('counter-element', CounterElement)
```

### watch

Directive for tracking atom changes in templates. Use it to subscribe to atom updates:

```typescript
import { atom } from '@reatom/core'
import { watch } from '@reatom/lit'
import { html } from 'lit'

const userName = atom('Guest', 'userName')

// In your render method:
html`<div>Hello, ${watch(userName)}!</div>`
```

### html and svg

Wrappers over standard Lit functions with automatic atom support. Atoms are automatically wrapped with `watch`:

```typescript
import { atom } from '@reatom/core'
import { html } from '@reatom/lit' // Note: import from @reatom/lit, not lit

const count = atom(0, 'count')

// No need to use watch() - atoms are automatically tracked
html`<div>Count: ${count}</div>`

// Equivalent to:
html`<div>Count: ${watch(count)}</div>`
```

Use `html` from `@reatom/lit` for convenience, or `watch()` directive with `html` from `lit` for explicit control.

## Combining Reatom and Lit Reactivity

You can mix Reatom atoms (shared state) with Lit's reactive properties (local state):

```typescript
import { atom, peek } from '@reatom/core'
import { withReatomElement, watch } from '@reatom/lit'
import { LitElement, html } from 'lit'

// Shared state (Reatom)
const globalCount = atom(0, 'globalCount')

// Component with mixed reactivity
const MixedElement = withReatomElement(
  class MixedElement extends LitElement {
    static override properties = {
      localCount: { type: Number, state: true },
    }
    declare localCount: number

    constructor() {
      super()
      this.localCount = 0
    }

    override render() {
      return html`
        <div>
          <p>Global (Reatom): ${watch(globalCount)}</p>
          <p>Local (Lit): ${this.localCount}</p>

          <button @click=${() => globalCount.set((n) => n + 1)}>
            Increment Global
          </button>
          <button @click=${() => this.localCount++}>Increment Local</button>
        </div>
      `
    }
  },
)
```

## Passing Atoms as Properties

Atoms can be passed between components as properties:

```typescript
import { atom, Atom } from '@reatom/core'
import { ReatomLitElement, watch } from '@reatom/lit'
import { html } from 'lit'

// Child component that receives an atom
class DisplayElement extends ReatomLitElement {
  declare value: Atom<number>

  static override properties = {
    value: { attribute: false },
  }

  override render() {
    return html`<span>${watch(this.value)}</span>`
  }
}

// Parent component
class ParentElement extends ReatomLitElement {
  count = atom(0, 'count')

  override render() {
    return html`
      <div>
        <display-element .value=${this.count}></display-element>
        <button @click=${() => this.count.set((n) => n + 1)}>+</button>
      </div>
    `
  }
}
```

## Why ReatomLitElement?

**ReatomLitElement combines native Web Components with Reatom's state management** — giving you everything React, Vue, or Angular provide, but with zero framework bloat.

### Key Benefits

🚀 **Drop any framework**

- Your components work in any framework or without one
- Smaller bundle sizes without virtual DOM overhead
- Future-proof: Web Components are a web standard

⚡ **Simple and direct**

- Components are just classes with a render method
- No complicated hooks or lifecycle gymnastics
- State updates are explicit and predictable

🔧 **Maximum flexibility**

- Use in React, Vue, Svelte, or vanilla JS
- Mix shared atoms with local Lit properties
- Incremental adoption

🏗️ **Perfect for micro-frontends**

- Independent deployment per team
- Shared state across micro-frontends
- True isolation with Shadow DOM

### When to use ReatomLitElement

✅ **Use ReatomLitElement when:**

- You need shared state across components
- You have complex state logic or computed values
- You want predictable updates with debugging support
- You're building larger applications
- You're adopting micro-frontends architecture

✅ **Use plain LitElement when:**

- Component is completely isolated with no shared state
- You only need simple local state like UI toggles
- Component receives all data via properties

## Documentation

For comprehensive documentation with more examples and patterns, see:

- [Lit Integration Handbook](https://www.reatom.dev/handbook/lit/)
- [Reatom Documentation](https://www.reatom.dev/)

## License

MIT
