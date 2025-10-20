Integration of Reatom with Lit for creating reactive web components.

## About the package

The package provides the following functions.

- `withReatomElement` - mixin for creating Lit elements with Reatom support
- `watch` - directive for tracking atom changes in templates
- `html` and `svg` - wrappers over standard Lit functions with automatic atom support

## Installation

```bash
npm install @reatom/lit
```

## Usage Example

```typescript
import { atom, Atom, peek } from '@reatom/core'
import { withReatomElement, watch } from '@reatom/lit'
import { LitElement, html } from 'lit'

// Create atoms
const timer = atom(0, 'timer')
const count = atom(0, 'count').mix((target) => ({
  increment: () => target((state) => state + 1),
}))

// Update timer every second
setInterval(() => {
  timer((state) => state + 1)
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
  },
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
import { html, svg } from '@reatom/lit'

// Atoms are automatically tracked
html`<div>${myAtom}</div>`
```

## License

MIT

## Variables

### html()

> `const` **html**: (`strings`, ...`values`) => `TemplateResult`

Defined in: [html.ts:21](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/lit/src/html.ts#L21)

#### Parameters

##### strings

`TemplateStringsArray`

##### values

...`unknown`[]

#### Returns

`TemplateResult`

***

### svg()

> `const` **svg**: (`strings`, ...`values`) => `TemplateResult`

Defined in: [html.ts:22](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/lit/src/html.ts#L22)

#### Parameters

##### strings

`TemplateStringsArray`

##### values

...`unknown`[]

#### Returns

`TemplateResult`

## Functions

### watch()

> **watch**(`target`, `frame`): `DirectiveResult`\<*typeof* `AtomDirective`\>

Defined in: [watch.ts:45](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/lit/src/watch.ts#L45)

#### Parameters

##### target

[`AtomLike`](core.md#atomlike)

##### frame

[`Frame`](core.md#frame)\<`any`, `any`[], `any`\> = `...`

#### Returns

`DirectiveResult`\<*typeof* `AtomDirective`\>

***

### withReatomElement()

> **withReatomElement**\<`T`\>(`superClass`): `T`

Defined in: [index.ts:8](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/lit/src/index.ts#L8)

#### Type Parameters

##### T

`T` *extends* [`Constructor`](core.md#constructor-2)\<`LitElement`\>

#### Parameters

##### superClass

`T`

#### Returns

`T`
