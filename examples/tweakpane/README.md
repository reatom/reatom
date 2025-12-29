# Reatom Tweakpane Integration

This example demonstrates **Extensions as Integration Adapters** - a pattern for integrating third-party UI libraries with Reatom's state management system.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/reatom/reatom/tree/v1000/examples/tweakpane)

## Core Philosophy: Ownership vs Renting

Reatom owns the state graph completely, and lets third-party libraries like Tweakpane "rent" access to it. The integration is built through extensions that adapt external APIs to Reatom's reactive system.

## Key Concepts

### 1. Lazy UI

UI controls are created only when needed and disposed automatically when subscriptions end:

- No memory leaks from unused controls
- Controls exist only while actively used
- Automatic cleanup via `withConnectHook`

### 2. Deep Composition

Extensions compose seamlessly with built-in Reatom features like `withLocalStorage` and `withSearchParams`:

```ts
atom(0.7, 'mixer.volume').extend(
  withLocalStorage('tweakpane.volume'),
  withSearchParams('volume', { parse: (v) => (v ? parseFloat(v) : 0.7) }),
  withBinding({ label: 'Volume', min: 0, max: 1 }, folder),
)
```

### 3. Lifecycle as a Feature

External resource disposal is managed declaratively through Reatom primitives:

```ts
const throughput = atom(0, 'throughput').extend(
  withBinding({ label: 'Throughput', view: 'graph' }, folder),
  withConnectHook(() => {
    const interval = setInterval(() => throughput.set(Math.random()), 100)
    return () => clearInterval(interval)
  }),
)
```

### 4. Reactive Properties

Native Tweakpane UI properties (`hidden`, `disabled`, `title`, `label`) are driven by computed atoms:

```ts
advancedFolder.extend(
  withReactiveProperty(
    'hidden',
    computed(() => !isAdvanced()),
  ),
)

masterVolume.binding.extend(
  withReactiveProperty(
    'disabled',
    computed(() => muted()),
  ),
  withReactiveProperty(
    'label',
    computed(() => (muted() ? 'Volume (muted)' : 'Volume')),
  ),
)
```

## Running the Example

```bash
npm install
npm run dev
```

## Architecture

The integration is built on these core primitives:

- **`reatomPane`** - Creates a Tweakpane instance as a computed atom
- **`reatomPaneFolder`** - Creates folders as reactive containers
- **`withBinding`** - Creates bidirectional bindings between atoms and Tweakpane controls
- **`withButton`** - Binds actions to Tweakpane buttons
- **`withBlade`** - Generic blade creation for custom views
- **`withReactiveProperty`** - Makes Tweakpane UI properties reactive to computed values

All primitives support lazy creation and automatic disposal via Reatom's subscription lifecycle.

## Demos

### Overview

**[Overview](/overview)** - Comprehensive demo showing all key concepts: deep composition with `withLocalStorage` + `withSearchParams` + `withBinding`, reactive properties for dynamic UI, and lifecycle hooks.

### Control Types

- **[UI Components](/ui-components)** - Buttons, folders, tabs, and separators
- **[Number](/number)** - Sliders, steppers, lists, and formatted inputs
- **[String](/string)** - Text inputs and select lists
- **[Boolean](/boolean)** - Checkboxes and switches
- **[Color](/color)** - Various color pickers (RGB, RGBA, hex, inline)
- **[Point](/point)** - 2D, 3D, and 4D point controls
- **[Monitor](/monitor)** - Read-only graphs, buffers, and multiline text
- **[Essentials Plugin](/essentials)** - Radio grids, button grids, cubic bezier, and FPS graph

## Known Quirks

1. **Element ordering** - It is hard to control the order of elements with Tweakpane API using our declarative approach, as it only allows defining the index at insertion time. For predictable ordering, consider using tabs or organizing controls into separate folders.

2. **HMR not handled** - Hot Module Replacement is not handled and may leave hanging undisposed controls. A full page refresh clears stale controls.

## Learning Resources

- [Reatom v1000 Core Docs](https://v1000.reatom.dev)
- [Extensions Handbook](https://v1000.reatom.dev/start/extensions/)
- [Lifecycle and Hooks](https://v1000.reatom.dev/handbook/lifecycle/)
- [Tweakpane Documentation](https://tweakpane.github.io/docs/)

## License

MIT
