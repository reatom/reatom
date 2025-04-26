An **EXPERIMENTAL** JSX runtime for describing dynamic DOM UIs with Reatom.

## Core benefits

- No extra build step needed; we use plain TSX (JSX), which is currently supported in various tools.
- Nice integrations with the platform; `<div />` returns the real element.
- Rerender-less architecture with direct reactive bindings, which means extreme performance!
- Only 1kb runtime script (excluding the tiny core package).
- Built-in CSS management with a simple API and efficient CSS variables usage.

[![Try it out in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/artalar/reatom/tree/v1000/examples/reatom-jsx)

## Installation

You can use `@reatom/core` instead of the framework, but we highly recommend using the framework to access the maximum features of Reatom.

```sh
npm install @reatom/framework @reatom/jsx
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "@reatom/jsx"
  }
}
```

`vite.config.js`:

```js
import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'hf',
    jsxInject: `import { h, hf } from "@reatom/jsx";`,
  },
})
```

### Using with different framework.

You can use different JSX pragmas in different files. For example, if you have a React project and want to speedup some of you components, you can write them with reatom/jsx with a couple of simple steps:

- create a separate package for you Reatom components
- insert `tsconfig.json` as described above, you can use [extends](https://www.typescriptlang.org/tsconfig#extends) property, to use your project configurations
- in every `*.tsx` file use the following code:

```tsx
// @jsxRuntime classic
// @jsx h
import { h } from '@reatom/jsx'
```

## Example

> Advanced example with dynamic entities you can find here: https://github.com/artalar/reatom/tree/v1000/examples/reatom-jsx

Define a component:

```ts
import { atom, action } from '@reatom/core'

export const input = atom('')
// Event handlers shouldn't be wrapped, Reatom take care of it
const onInput = (event: Event & { currentTarget: HTMLInputElement }) =>
  input(event.currentTarget.value)

export const Input = () => <input value={input} on:input={onInput} />
```

Render it:

```tsx
import { connectLogger, context, clearStack } from '@reatom/framework'
import { mount } from '@reatom/jsx'
import { App } from './App'

// Disable default global context to enforce explicit context usage (recommended)
clearStack()

// Create a root context for the application
const rootContext = context.start()

if (import.meta.env.MODE === 'development') {
  // Connect logger to the specific context
  connectLogger(rootContext)
}

// Mount the app within the created context
mount(document.getElementById('app')!, <App />)
```

## Reference

This library implements a common TypeScript JSX factory that creates and configures **native** DOM elements.

By default, props passed to the JSX factory are set as attributes. Add `attr:` prefix to the name to set element attribute. Add `prop:` prefix to the name to set element property.

For all kinds of properties, you can pass a primitive value, an atom, or a function (getter) that returns a primitive value. When a function is passed, the property will reactively update whenever the function's return value changes (if it depends on atoms).

The `children` prop specifies the inner content of an element, which can be one of the following:

- `false`/`null`/`undefined` to render nothing
- a string or a number to create a text node
- a native DOM node to insert it as-is
- an atom or a function returning any option listed above

### Handling events

Use `on:*` props to add event handlers. Functions interacting with Reatom state or actions are wrapped (`wrap`) automatically and you don't need to do it: `on:input={(event) => setValue(event.currentTarget.value)}`.

### Models

For simple `AtomMut` bindings to the native input you can use `model:value` syntax, where "value" could be: `value`, `valueAsNumber`, `checked`.

```tsx
export const input = atom('')
export const Input = () => <input model:value={input} />
```

By the way, you can safely create any needed resources inside a component body, as it calls only once when it created.

```tsx
export const Input = () => {
  export const input = atom('')
  return <input model:value={input} />
}
```

### Styles

Object-valued `style` prop applies styles granularly: `style={{top: 0, display: equalsFalseForNow && 'none'}}` sets `top: 0;`.

`false`, `null` and `undefined` style values remove the property. Non-string style values are stringified (we don't add `px` to numeric values automatically).

Incorrect:

```tsx
<div style={computed(() => (bool() ? { top: 0 } : { bottom: 0 }))}></div>
```

Correct:

```tsx
<div
  style={computed(() =>
    bool() ? { top: 0, bottom: undefined } : { top: undefined, bottom: 0 },
  )}
></div>
```

To define a style property value, you should prepend the namespace `style:`:

```tsx
// <div style="top: 10px; right: 0;"></div>
<div
  style:top={atom('10px')}
  style:right={0}
  style:bottom={undefined}
  style:left={null}
></div>
```

### Class name utility

The `cn` function is designed for creating a string of CSS classes. It allows the use of multiple data types: strings, objects, arrays, functions, and atoms, which are converted into a class string.

```ts
cn('my-class') // Atom<'my-class'>

cn(['first', atom('second')]) // Atom<'first second'>

/** The `active` class will be determined by the truthiness of the data property `isActiveAtom`. */
cn({ active: isActiveAtom }) // Computed<'active' | ''>

cn(computed(() => (isActiveAtom() ? 'active' : undefined))) // Computed<'active' | ''>
```

The `cn` function supports various complex data combinations, making it easier to declaratively describe classes for complex UI components.

```ts
const Button = (props) => {
  /** @example Computed<'button button--size-medium button--theme-primary button--is-active'> */
  const classNameAtom = cn(computed(() => [
    'button',
    `button--size-${props.size}`,
    `button--theme-${props.theme}`,
    {
      'button--is-disabled': props.isDisabled(),
      'button--is-active':
        props.isActive() && !props.isDisabled(),
    },
  ]))

  return <button class={classNameAtom}>{props.children}</button>
}
```

### CSS-in-JS

We have a minimal, intuitive, and efficient styling engine tightly integrated with components. You can set a styles in `css` prop and all relative css-variables to `css:variable-name` prop.

> The example below is correctly formatted by Prettier and has syntax highlighting provided by the [vscode-styled-components](https://marketplace.visualstudio.com/items?itemName=styled-components.vscode-styled-components) extension.

```tsx
export const HeaderInput = () => {
  const input = atom('')
  const size = computed(() => input().length)
  return (
    <input
      model:value={input}
      css:size={size}
      css={`
        font-size: calc(1em + var(--size) * 0.1em);
      `}
    />
  )
}
```

Under the hood, it will create a unique class name and will be converted to this code:

```tsx
export const HeaderInput = () => {
  const input = atom('')
  const size = computed(() => input().length)
  return (
    <input
      className={createAndInsertClass(`
        font-size: calc(1em + var(--size) * 0.1em);
      `)}
      style={computed(() => ({
        '--size': size(),
      }))}
    />
  )
}
```

It's recommended to wrap related elements in components because autogenerated class names include the component name, making them more readable and easier to identify:

```html
<input class="HeaderInput_123456" style="--size: 0;" />
```

### Components

Components in `@reatom/jsx` are simple functions that return native DOM elements. They have no state or lifecycle and don't support features like `$spread` since they are just function calls. This makes them lightweight and efficient during execution.

You can put an atom with a list of other elements as a children of an element to archive rendering of a dynamic list.

```tsx
const list = atom([
  <li>1</li>,
  <li>2</li>,
])
// Use the atom's update method directly or create an action
const add = action(() => list((state) => [
  ...state,
  <li>{state.length + 1}</li>,
]))

<div>
  <button on:click={add}>Add</button>
  {/* Use computed for derived views */}
  {computed(() => <ul>{list().map(item => item)}</ul>)}
</div>
```

**Do not create elements outside of components and do not reuse them.** All created by JSX elements should be immidiatly used in the DOM as children or `mount` methos. This ensures that each element has a unique lifecycle, works correctly with atoms, and all copies are displayed in the DOM. Subscriptions to atoms are removed in the next tick after the element is unmounted from the DOM. If the element returns to the DOM, the subscriptions are not recreated.

**Incorrect**. Reusing the same element results in it being correctly displayed only in one place:
Source code:

```tsx
const valueAtom = atom('text')
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

**Correct**. Each call to the Shared component creates a new instance of the element, ensuring a unique lifecycle and proper subscription handling:

```tsx
const valueAtom = atom('text')
const Shared = () => <span>{valueAtom}</span>

<>
  <div>
    <Shared></Shared>
  </div>
  <p>
    <Shared></Shared>
  </p>
</>
```

Result:

```html
<div>
  <span>text</span>
</div>
<p>
  <span>text</span>
</p>
```

### Spreads

In Reatom, there is no concept of "rerender" like React. Instead, we have a special `$spread` prop that can be used to spread props reactively.

```tsx
<div
  $spread={computed(() =>
    valid()
      ? { disabled: true, readonly: true }
      : { disabled: false, readonly: false },
  )}
/>
```

### SVG

To create elements with names within the SVG namespace, you should prepend `svg:` to the tag name:

```tsx
const anSvgElement = (
  <svg:svg>
    <svg:path d="???" />
  </svg:svg>
)
```

If you need to use SVG as a string, you can choose from these options:

Option 1:

```tsx
const SvgIcon = (props: { svg: string }) => {
  const svgEl = new DOMParser()
    .parseFromString(props.svg, 'image/svg+xml')
    .children.item(0) as SVGElement
  return svgEl
}
```

Option 2:

```tsx
const SvgIcon = (props: {svg: string}) => {
  return (
    <svg:svg
      prop:outerHTML={props.svg}
    ><svg:svg>
  )
}
```

### Ref

The `ref` property is used to create and track references to DOM elements, allowing actions to be performed when these elements are mounted and unmounted.

```tsx
<button
  ref={(el: HTMLButtonElement) => {
    el.focus()
    // The cleanup function receives the element as an argument
    return (el: HTMLButtonElement) => el.blur()
  }}
></button>
```

Mounting and unmounting functions are called in order from child to parent.

```tsx
<div
  ref={(el: HTMLDivElement) => {
    console.log('mount', 'parent')
    // The cleanup function receives the element as an argument
    return (el: HTMLDivElement) => console.log('unmount', 'parent')
  }}
>
  <span
    ref={(el: HTMLSpanElement) => {
      console.log('mount', 'child')
      // The cleanup function receives the element as an argument
      return (el: HTMLSpanElement) => console.log('unmount', 'child')
    }}
  ></span>
</div>
```

When this code is executed, the console will display the following result:

```ts
mount child
mount parent
unmount child
unmount parent
```

## Utilities

### css utility

You can import `css` function from `@reatom/jsx` to describe separate css-in-js styles with syntax highlight and prettier support. Also, this function skips all falsy values, except `0`.

```tsx
import { css } from '@reatom/jsx'

const styles = css`
  color: red;
  background: blue;
  ${somePredicate && 'border: 0;'}
`
```

### Bind utility

You can use `Bind` component to use all reatom/jsx features on top of existed element. For example, there are some library, which creates an element and returns it to you and you want to add some reactive properties to it.

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

### TypeScript

To type your custom component props accepting general HTML attributes, for example for a `div` element, you should extend `JSX.HTMLAttributes`. However, if you want to define props for a specific HTML element you should use it name in the type name, like in the code below.

```tsx
import { type JSX } from '@reatom/jsx'

// allow only plain data types
export interface InputProps extends JSX.InputHTMLAttributes {
  defaultValue?: string
}
// allow plain data types and atoms
export type InputProps = JSX.IntrinsicElements['input'] & {
  defaultValue?: string
}

export const Input = ({ defaultValue, ...props }: InputProps) => {
  props.value ??= defaultValue
  return <input {...props} />
}
```

To type an event handler you have a few options, see below.

```tsx
export const Form = () => {
  const handleSubmit = (event: Event) => {
    event.preventDefault()
    // Potentially call a Reatom action here
  }

  // Define the handler logic
  const handleInput = (event: JSX.InputEvent) => {
    const value = event.currentTarget.valueAsNumber // HTMLInputElement.valueAsNumber: number
    // Update an atom or call an action with the value
    // someAtom(value)
  }

  // Define the handler logic
  const handleSelect = (event: JSX.TargetedEvent<HTMLSelectElement>) => {
    const value = event.currentTarget.value // HTMLSelectElement.value: string
    // Update an atom or call an action with the value
    // anotherAtom(value)
  }

  return (
    <form on:submit={handleSubmit}>
      <input on:input={handleInput} />
      <select on:input={handleSelect} />
    </form>
  )
}
```

## Limitations

These limitations will be fixed in the feature

- No DOM-less SSR (requires a DOM API implementation like `linkedom` to be provided)
- No keyed lists support (use linked lists instead)
