# JSX

An **EXPERIMENTAL** JSX runtime for building high-performance reactive DOM UIs with [@reatom/core](https://www.reatom.dev/package/core).

## Features

- **⚡️ Zero re-renders:** reactive bindings update DOM directly
- **🧩 Native elements:** `<div />` returns a real DOM node
- **🛠 No extra build step:** just TSX and TypeScript support
- **🎯 Tiny footprint:** ~3KB runtime (plus a minimal core)
- **🎨 Built-in styles:** efficient via CSS variables

[![Try it out in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/reatom/reatom/tree/v1000/examples/reatom-jsx)

## Installation

```sh
npm install @reatom/core @reatom/jsx
```

Set up TypeScript to use the JSX runtime:

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "@reatom/jsx"
  }
}
```

For Vite users:

`vite.config.js`:

```js
import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'hf',
    jsxInject: `import { h, hf } from "@reatom/jsx"`,
  },
})
```

## Framework compatibility

You can integrate `@reatom/jsx` into existing React or other JSX projects.

1. Create a separate package for Reatom-based components
2. Extend(https://www.typescriptlang.org/tsconfig#extends) your base `tsconfig.json` with JSX config
3. In each file, declare JSX pragma manually:

```tsx
// @jsxRuntime classic
// @jsx h
import { h } from '@reatom/jsx'
```

This enables you to gradually migrate or optimize parts of your app without conflict with existing tooling.

## Example

> 💡 See a more advanced version with dynamic entities:
> https://github.com/reatom/reatom/tree/v1000/examples/reatom-jsx

Define a component:

```ts
import { atom } from '@reatom/core'

const value = atom('')
// Event handlers shouldn't be wrapped, Reatom take care of it
const onInput = (event: Event & { currentTarget: HTMLInputElement }) =>
  value.set(event.currentTarget.value)

const Input = () => <input value={value} on:input={onInput} />
```

Mount your app:

```tsx
import { connectLogger, context, clearStack } from '@reatom/core'
import { mount } from '@reatom/jsx'
import { App } from './App'

// Disable default global context to enforce explicit context usage (recommended)
clearStack()

// Create a root context for the application
const rootContext = context.start()

if (import.meta.env.MODE === 'development') {
  connectLogger()
}

// Mount the app within the created context
mount(document.getElementById('app')!, <App />)
```

## Reference

This package implements a [JSX factory](https://www.typescriptlang.org/tsconfig#jsxFactory) that creates and binds **native** DOM elements with reactivity.

### Props

JSX props are treated as follows:

- Default: set as DOM properties or attributes are used depending on the context, to ensure correct behavior and predictable outcomes.
- `prop:*`: sets DOM properties.
- `attr:*`: sets DOM attributes.
- `on:*`: register event listeners. Functions interacting with Reatom state or actions are wrapped (`wrap`) automatically.

All values can be:

- `null` or `undefined`: removes DOM attribute or resets DOM property
- `string`, `number` or `boolean`: sets property or attribute
- `AtomLike` or a derived function: tracked reactively, the prop is automatically updated when dependencies change

```tsx
const enabled = atom(true)
const value = atom('')
<input
  value={value}
  attr:type="text"
  prop:disabled={() => !enabled()}
  on:input={(event) => value.set(event.currentTarget.value)}
/>
```

### Children

The `children` prop defines element content. It supports:

- `boolean`, `null`, or `undefined` → renders nothing
- `string` or `number` → renders text
- `Node` → inserts DOM node as-is
- `AtomLike` → reactive content

<!--
- `AtomLike` or derived function → reactive content
<span>{() => count() > 5 ? 'high' : 'low'}</span>
-->

```tsx
<div>{count}</div>
```

### Models

Use `model:*` props for two-way binding with native input controls.

Supported props:

- `model:value`: binds the `value` property of inputs, useful for text inputs and `<textarea>`
- `model:valueAsNumber`: binds the `valueAsNumber` property, typically used for numeric inputs
- `model:checked`: binds the `checked` property of checkboxes or radio buttons

```tsx
const value = atom('')
const Input = () => <input model:value={value} />
```

Components run once on creation, so it's safe to define atoms or any setup logic inside:

```tsx
const Input = () => {
  const value = atom('')
  return <input model:value={value} />
}
```

### `style` props

Use `style={{ key: value }}` for inline styles. Falsy values like `false`, `null`, and `undefined` remove the style.

```tsx
<div style={{ top: 0, display: hidden() && 'none' }} />
```

Avoid replacing the full style object — prefer updates via static keys:

❌ **Avoid:**

```tsx
<div
  style={() =>
    flag()
      ? { top: 0 }
      : { bottom: 0 }
  }
/>
```

✅ **Use:**

```tsx
<div
  style={() =>
    flag()
      ? { top: 0, bottom: undefined }
      : { top: undefined, bottom: 0 }
  }
/>
```

### `style:*` props

Set individual styles via `style:*`:

```tsx
// <div style="top: 10px; right: 0;"></div>
<div
  style:top={atom('10px')}
  style:right={0}
  style:bottom={undefined}
  style:left={null}
></div>
```

Values can be primitives or reactive (`atom`, `() => string`, etc.). Numbers are passed as-is (no automatic `px`).

### `class` or `className` props

The JSX runtime automatically applies the same logic internally using `reatomClassName`.


```ts
/** @example <button class="button button--size-medium button--theme-primary button--is-active"></button> */
<button class={[
  'button',
  `button--size-${props.size}`,
  `button--theme-${props.theme}`,
  {
    'button--is-disabled': props.isDisabled,
    'button--is-active': props.isActive() && !props.isDisabled(),
  },
]}></button>
```

### CSS-in-JS

Use the `css` prop to declare styles via tagged template literals. Dynamic values can be passed as CSS variables via `css:*`.

```tsx
const Component = () => (<input
  css:size={size}
  css="font-size: calc(1em + var(--size) * 0.1em);"
></div>)
```

This will be compiled to:

```tsx
<div
  class="Component_ab12cd"
  style="--size: 3"
></div>
```

Behind the scenes, the runtime:

- Creates a scoped class name (`Component_*`)
- Inserts the CSS rule once
- Applies dynamic values as inline CSS variables (`--size`)

> Tip: wrapping logic in components improves generated class readability and traceability.

> The example below is correctly formatted by Prettier and has syntax highlighting provided by the [vscode-styled-components](https://marketplace.visualstudio.com/items?itemName=styled-components.vscode-styled-components) extension.

### Components

Components are plain functions that return DOM elements. They are stateless, have no lifecycle, and are evaluated only once — at the moment of mounting.

> There’s no virtual tree or diffing — everything happens directly in the DOM.

Use dynamic atoms for reactive lists:

```tsx
const list = atom([
  <li>1</li>,
  <li>2</li>,
])

const add = () => list.set((state) => [
  ...state,
  <li>{state.length + 1}</li>,
])

<div>
  <button on:click={add}>Add</button>
  {computed(() => <ul>{list().map((item) => item)}</ul>)}
</div>
```

#### ⚠ Do not reuse elements

JSX elements are real DOM nodes, not virtual descriptions. Reusing the same element instance multiple times leads to incorrect rendering — it will only appear in the last place it was inserted. Each JSX element must be created fresh where it's used.

**❌ Incorrect**

```tsx
const shared = <span>{valueAtom}</span>

<>
  <div>{shared}</div>
  <p>{shared}</p>
</>
```

Result:

```html
<div></div>
<p>
  <span>text</span>
</p>
```

Only the last usage is rendered — the first one is silently dropped.

**✅ Correct**

```tsx
const Shared = () => <span>{valueAtom}</span>

<>
  <div><Shared /></div>
  <p><Shared /></p>
</>
```

Result:

```html
<div><span>Hello</span></div>
<p><span>Hello</span></p>
```

Each call creates a unique element with its own lifecycle and subscriptions.

### `$spread` prop

Use `$spread` to declaratively bind multiple props or attributes at once. The object can be reactive (e.g., `atom`, `() => obj`) and will update automatically.

```tsx
<div
  $spread={computed(() =>
    valid()
      ? { disabled: true, readonly: true }
      : { disabled: false, readonly: false },
  )}
/>
```

> Always include all relevant keys on each update to avoid stale DOM state.

### SVG

To create SVG elements, use the `svg:` namespace prefix to the tag name.

```tsx
<svg:svg viewBox="0 0 24 24">
  <svg:path d="..." />
</svg:svg>
```

> SVG elements are rendered as native DOM nodes in the SVG namespace.

If you need to inject raw SVG markup, use one of the following approaches:

**Option 1**: parse from string

```tsx
const SvgIcon = ({ svg }: { svg: string }) =>
  new DOMParser()
    .parseFromString(svg, 'image/svg+xml')
    .children.item(0) as SVGElement
```

**Option 2**: use `prop:outerHTML`

```tsx
const SvgIcon = ({ svg }: { svg: string }) => (
  <svg:svg prop:outerHTML={svg} />
)
```

### `ref` props

Use the `ref` prop to get access to the DOM element and register mount/unmount side effects.

```tsx
<button
  ref={(el) => {
    el.focus()
    return (el) => el.blur()
  }}
/>
```

Unmount callbacks are called automatically in reverse order — from child to parent:

```tsx
<div
  ref={() => {
    console.log('mount parent')
    return () => console.log('unmount parent')
  }}
>
  <span
    ref={() => {
      console.log('mount child')
      return () => console.log('unmount child')
    }}
  />
</div>
```

Console output:

```txt
mount child
mount parent
unmount child
unmount parent
```

## Utilities

### `reatomClassName` class names reactivity

`reatomClassName` works similarly to [clsx](https://github.com/lukeed/clsx) or [classnames](https://github.com/JedWatson/classnames), but with full reactivity support — you can pass strings, arrays, objects, functions, and atoms. All values are automatically converted into a class string that updates when dependencies change.

- **Strings** are added directly.
- **Arrays** are flattened and processed recursively.
- **Objects** add a key as a class if its value is truthy.
- **Functions and atoms** are tracked reactively and automatically recomputed on changes.

```ts
reatomClassName('my-class') // Computed<'my-class'>

reatomClassName(['first', atom('second')]) // Computed<'first second'>

/** The `active` class will be determined by the truthiness of the data property `isActiveAtom`. */
reatomClassName({ active: isActiveAtom }) // Computed<'active' | ''>

reatomClassName(() => (isActiveAtom() ? 'active' : undefined)) // Computed<'active' | ''>
```

The `reatomClassName` function supports various complex data combinations, making it easier to declaratively describe classes for complex UI components.

```ts
/** @example Computed<'button button--size-medium button--theme-primary button--is-active'> */
reatomClassName([
  'button',
  `button--size-${props.size}`,
  `button--theme-${props.theme}`,
  {
    'button--is-disabled': props.isDisabled,
    'button--is-active': props.isActive() && !props.isDisabled(),
  },
])
```

### `css` template literal

You can import `css` function from `@reatom/jsx` to describe separate css-in-js styles with syntax highlight and Prettier support. Also, this function skips all falsy values, except `0`.

```tsx
import { css } from '@reatom/jsx'

const styles = css`
  color: red;
  background: blue;
  ${somePredicate && 'border: 0;'}
`
```

> You can use this with the `css` or `style` props.

### `<Bind>` component

You can use `<Bind>` component to use all `@reatom/jsx` features on top of existed element. For example, there are some library, which creates an element and returns it to you and you want to add some reactive properties to it.

```tsx
import { Bind } from '@reatom/jsx'

const MyComponent = () => {
  const container = new SomeLibrary()

  return (
    <Bind
      element={container}
      class={computed(() => (visible() ? 'active' : 'disabled'))}
    />
  )
}
```

## TypeScript

JSX components in `@reatom/jsx` are plain functions and integrate seamlessly with TypeScript.

### Typing component props

If you want to define props for a specific HTML element you should use it name in the type name, like in the code below.

```tsx
import { type JSX } from '@reatom/jsx'

// allow only plain data types
interface InputProps extends JSX.InputHTMLAttributes {
  defaultValue?: string
}
// allow plain data types and atoms
type InputProps = JSX.IntrinsicElements['input'] & {
  defaultValue?: string
}

const Input = ({ defaultValue, ...props }: InputProps) => {
  props.value ??= defaultValue
  return <input {...props} />
}
```

> Use `JSX.IntrinsicElements['tagName']` to get the correct typing for a given element (`input`, `button`, `div`, etc).

### Typing event handlers

You can annotate event handlers explicitly with built-in types.

```tsx
const Form = () => {
  const handleSubmit = (event: Event) => {
    event.preventDefault()
  }

  const handleInput = (event: JSX.InputEvent) => {
    const value: number = event.currentTarget.valueAsNumber
    // e.g. valueAtom.set(value)
  }

  const handleSelect = (event: JSX.TargetedEvent<HTMLSelectElement>) => {
    const value: string = event.currentTarget.value
    // e.g. selectAtom.set(value)
  }

  return (
    <form on:submit={handleSubmit}>
      <input on:input={handleInput} />
      <select on:input={handleSelect} />
    </form>
  )
}
```

### Extending JSX typings

You may have custom elements that you'd like to use in JSX, or you may wish to add additional attributes to all HTML elements to work with a particular library. To do this, you will need to extend the `IntrinsicElements` or `HTMLAttributes` interfaces, respectively, so that TypeScript is aware and can provide correct type information.

#### Add new intrinsic elements

```tsx
function MyComponent() {
  return <loading-bar showing />
  //       ~~~~~~~~~~~
  //    💥 Property 'loading-bar' does not exist...
}
```

To fix:

```ts
// global.d.ts

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'loading-bar': { showing?: boolean | null | undefined }
    }
  }
}

// This empty export is important! It tells TS to treat this as a module
export {}
```

#### Add custom HTML attributes

```tsx
function MyComponent() {
  return <div custom="value" />
  //        ~~~~~~
  //     💥 Property 'custom' does not exist...
}
```

To fix:

```ts
// global.d.ts

declare global {
  namespace JSX {
    interface HTMLAttributes {
      custom?: string | null | undefined
    }
  }
}

// This empty export is important! It tells TS to treat this as a module
export {}
```

> Don't forget the `export {}` at the bottom — it makes the file a module so TypeScript merges types correctly.

## Limitations

These features are not yet supported:

- ❌ DOM-less SSR (you need a DOM-like environment such as [linkedom](https://github.com/WebReflection/linkedom))
- ❌ Keyed lists (use linked lists instead)
