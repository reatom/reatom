---
title: Using withReatomElement Mixin
description: Using withReatomElement Mixin - Reatom Lit integration
---

The `withReatomElement` mixin adds Reatom reactivity to any Lit component.
Use it when:

- You need to extend a different base class (not LitElement directly)
- You're integrating Reatom into an existing component library
- You want to add reactivity to third-party Lit components

## Basic Usage

The mixin wraps any LitElement subclass and adds automatic atom tracking:

```ts
import { atom, computed } from '@reatom/core'
import { withReatomElement, watch } from '@reatom/lit'
import { LitElement } from 'lit'
import { html } from 'lit'

// ============================================================================
// Basic Mixin Usage
// ============================================================================

// Your existing base class
class MyBaseElement extends LitElement {
  // Custom functionality, styles, etc.
  protected logLifecycle(event: string) {
    console.log(`[${this.tagName}] ${event}`)
  }
}

// Add Reatom reactivity with the mixin
class ReactiveElement extends withReatomElement(MyBaseElement) {
  private count = atom(0, 'count')

  override connectedCallback() {
    super.connectedCallback()
    this.logLifecycle('connected')
  }

  render() {
    return html`
      <div>
        <p>Count: ${watch(this.count)}</p>
        <button @click=${() => this.count.set((n) => n + 1)}>Increment</button>
      </div>
    `
  }
}

customElements.define('reactive-element', ReactiveElement)

// ============================================================================
// Integrating with Component Libraries
// ============================================================================
```

## Integrating with Component Libraries

You can use the mixin with base classes from component libraries like
Shoelace, Vaadin, or your own design system:

```ts
// Example: Extending a library's base class
// import { SlElement } from '@shoelace-style/shoelace'

// Simulated library base class for example
class LibraryBaseElement extends LitElement {
  static styles = [] // Library styles would be here
}

const userAtom = atom({ name: 'Guest', role: 'viewer' }, 'user')

// Computed atom for user name
const userNameAtom = computed(() => userAtom()?.name ?? 'Guest', 'userName')

class MyAppHeader extends withReatomElement(LibraryBaseElement) {
  render() {
    const user = userAtom()
    return html`
      <header>
        <span>Welcome, ${watch(userNameAtom)}</span>
        <span>Role: ${user?.role ?? 'viewer'}</span>
      </header>
    `
  }
}

customElements.define('my-app-header', MyAppHeader)

// ============================================================================
// Comparison: ReatomLitElement vs withReatomElement
// ============================================================================
```

## When to Use Which

| Feature | ReatomLitElement | withReatomElement |
|---------|------------------|-------------------|
| Simplicity | Simpler, just extend | Requires mixin syntax |
| Custom base class | No | Yes |
| Existing components | No | Yes |
| Performance | Same | Same |
| TypeScript support | Full | Full |

### Use ReatomLitElement when:
- Starting a new project
- Building components from scratch
- You don't need a custom base class

### Use withReatomElement when:
- Integrating with existing component libraries
- You have a custom base class with shared functionality
- Gradually adopting Reatom in an existing codebase

```ts
// ============================================================================
// TypeScript: Preserving Type Information
// ============================================================================
```

## TypeScript Support

The mixin preserves all type information from your base class:

```ts
// Types are preserved through the mixin
class TypedBase extends LitElement {
  protected sharedMethod(): string {
    return 'shared'
  }
}

class TypedComponent extends withReatomElement(TypedBase) {
  render() {
    // TypeScript knows about sharedMethod from base class
    const value = this.sharedMethod()
    return html`<div>${value}</div>`
  }
}

customElements.define('typed-component', TypedComponent)
```

## How It Works

The `withReatomElement` mixin:

1. Wraps the `render()` method with Reatom's abstract render
2. Tracks atom dependencies automatically
3. Schedules re-renders when tracked atoms change
4. Manages subscriptions in `connectedCallback`/`disconnectedCallback`

This is the same mechanism used by `ReatomLitElement` internally.

---

← [Mixed Reactivity](/handbook/lit/advanced/mixed-reactivity) | [SSR](/handbook/lit/advanced/ssr) →
