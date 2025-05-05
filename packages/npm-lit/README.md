# @reatom/npm-lit

Integration of Reatom with Lit for creating reactive web components.

## About the package

The package provides the following functions:

- `withReatomElement` - mixin for creating Lit elements with Reatom support
- `watch` - directive for tracking atom changes in templates
- `html` and `svg` - wrappers over standard Lit functions with automatic atom support

## Installation

```bash
npm install @reatom/npm-lit
```

## Usage Example

```typescript
import { atom, Atom, peek } from '@reatom/core'
import { withReatomElement, watch } from '@reatom/npm-lit'
import { LitElement, html } from 'lit'

// Create atoms
const timer = atom(0, 'timer')
const count = atom(0, 'count').mix((target) => ({
  increment: () => target((state) => state + 1)
}))

// Update timer every second
setInterval(() => {
  timer(state => state + 1)
}, 1_000)

// Create a component that tracks render count
const RenderCountElement = withReatomElement(
  class RenderCountElement extends LitElement {
    declare count: Atom<number>

    override render() {
      return html`<div>Render count: ${this.count()}</div>`
    }
  },
)

// Main component with reactivity
const CounterElement = withReatomElement(
  class CounterElement extends LitElement {
    static override properties = { innerCount: { type: Number, state: true } }
    declare innerCount: number

    renderCount = atom(0)

    private handleClick = () => {
      this.innerCount++
    }

    constructor() {
      super()
      this.innerCount = 0
    }

    override render() {
      return html`
        <div>
          <h1>Timer: ${watch(timer)}</h1>
          <h3>Reatom Reactivity: ${watch(count)}</h3>
          <h3>LitElement Reactivity: ${this.innerCount}</h3>

          <button @click=${this.handleClick}>
            Increment LitElement Reactivity
          </button>
          <button @click=${() => count.increment()}>
            Increment Reatom Reactivity
          </button>
          <render-count .count=${this.renderCount}></render-count>
        </div>
      `
    }

    override updated() {
      const v = peek(this.renderCount)
      this.renderCount(v + 1)
    }
  },
)

// Register components
customElements.define('counter-element', CounterElement)
customElements.define('render-count', RenderCountElement)
```

## API

### withReatomElement

Mixin for creating Lit elements with Reatom support. Allows using atoms in components.

```typescript
const MyElement = withReatomElement(
  class MyElement extends LitElement {
    // ...
  }
)
```

### watch

Directive for tracking atom changes in templates.

```typescript
html`<div>${watch(myAtom)}</div>`
```

### html and svg

Wrappers over standard Lit functions with automatic atom support.

```typescript
import { html, svg } from '@reatom/npm-lit'

// Atoms are automatically tracked
html`<div>${myAtom}</div>`
```

## License

MIT
