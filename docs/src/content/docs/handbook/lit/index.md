---
title: Integration with Lit
description: Build reactive Web Components with Reatom and Lit
---

## Introduction

Integration of Reatom with Lit enables you to create powerful reactive Web Components that combine the declarative power of Lit's templating with Reatom's predictable state management.

The @reatom/lit package provides a seamless integration between Reatom's reactive state management and Lit's component system. This combination gives you:

- **Reactive state management** - predictable and testable state updates
- **Automatic reactivity tracking** - components update automatically when atoms change
- **Mixed reactivity** - use both Reatom atoms and Lit properties in the same component
- **Performance optimization** - fine-grained updates and subscription management
- **TypeScript support** - full type safety with excellent inference
- **Web Components** - reusable and framework-agnostic components

## Installation

```bash
npm install @reatom/lit
```

## Quick Start

Quick Start

Simple counter component demonstrating basic Reatom + Lit integration

```ts
import { atom } from '@reatom/core'
import { ReatomLitElement, watch } from '@reatom/lit'
import { html } from 'lit'

// Create a reactive atom
export const count = atom(0, 'count')

// Create a component that extends ReatomLitElement
export class CounterElement extends ReatomLitElement {
  render() {
    return html`
      <div>
        <h2>Count: ${watch(count)}</h2>
        <button @click=${() => count.set((v) => v + 1)}>Increment</button>
      </div>
    `
  }
}

customElements.define('counter-element', CounterElement)
```

Usage example in HTML:
```html
<counter-element></counter-element>
```

## ReatomLitElement

ReatomLitElement

Provides automatic reactivity for Lit components

```ts
import {atom} from '@reatom/core'
import { ReatomLitElement, html } from '@reatom/lit'
import { customElement } from 'lit/decorators.js'

const myAtom = atom('Value', 'myAtom')
// ReatomLitElement automatically manages subscriptions and updates for you:
// - Manages Reatom subscriptions for atoms used in the component
// - Applies atom changes to the DOM (via host updates or Part-level directive updates)
// - Cleans up subscriptions when the component disconnects

@customElement('my-component')
class MyComponent extends ReatomLitElement {
  render() {
    return html`<div>${myAtom}</div>`
  }
}
```

## watch Directive

Watch Directive

The watch directive for fine-grained reactivity

This file demonstrates watch directive and different approaches
to reactive rendering in @reatom/lit components.

```ts
import { watch, ReatomLitElement, html } from '@reatom/lit'
import { atom } from '@reatom/core'

// The watch directive subscribes to atoms and updates the DOM when they change
// Use html from @reatom/lit for automatic reactivity - it wraps atoms with watch() automatically

const countAtom = atom(0, 'countAtom')
const nameAtom = atom('John', 'nameAtom')

// ============================================================================
// APPROACH 1: Auto-reactive html (Recommended for most cases)
// ============================================================================
// html from @reatom/lit automatically detects atoms and makes them reactive
// No need to use watch() explicitly - cleaner and more concise

class AutoReactiveComponent extends ReatomLitElement {
  render() {
    return html`
      <div>
        <p>Count: ${countAtom}</p>
        <p>Name: ${nameAtom}</p>
      </div>
    `
  }
}

customElements.define('auto-reactive', AutoReactiveComponent)

// ============================================================================
// APPROACH 2: Input binding without host updates
// ============================================================================
// watch() directive updates ONLY the input value, not the entire component
// This is crucial for inputs - prevents losing focus on every keystroke

class InputExample extends ReatomLitElement {
  // NOTE: Creating atom as class property creates a NEW atom for each component instance.
  // This is intentional here - each input has its own isolated state.
  // For shared state across instances, define atoms outside the component class.
  private inputValue = atom('', 'inputValue')

  render() {
    return html`
      <div>
        <input
          type="text"
          .value=${watch(this.inputValue)}
          @input=${(e: InputEvent) => {
            const target = e.target as HTMLInputElement
            // Update atom without running a host update cycle
            this.inputValue.set(target.value)
          }}
        />
        <p>Value: ${watch(this.inputValue)}</p>
      </div>
    `
  }
}

customElements.define('input-example', InputExample)

// Without watch(), the host element runs an update cycle on every keystroke:
// - Input loses focus
// - Performance degrades with many inputs
// - Unnecessary DOM diffing

// With watch(), only the value updates:
// - Input keeps focus
// - Better performance
// - Direct DOM updates

// ============================================================================
// APPROACH 3: Standard Lit html (Less efficient)
// ============================================================================
// Using `html` from 'lit' is fine.
// The key difference: `html` from `@reatom/lit` auto-wraps atoms with `watch()`.
// With `html` from 'lit', you must use `watch()` explicitly for Part-level updates.
// If you read atoms directly in `render()` (e.g. `${countAtom()}`), atom changes trigger a host update cycle
// and `render()` executes again.

import { html as litHtml } from 'lit'

class LessEfficientComponent extends ReatomLitElement {
  render() {
    // Host update cycle runs on atom changes (less efficient)
    return litHtml`
      <div>
        <p>Count: ${countAtom()}</p>
        <p>Name: ${nameAtom()}</p>
      </div>
    `
  }
}

customElements.define('less-efficient', LessEfficientComponent)
```

----------------------------------------------------------------------------
WHEN TO USE EACH APPROACH
-------------------------------------------------------------------------------- 
1. Use auto-reactive html (from @reatom/lit) for:
   - Simple templates with atoms
   - Most common use cases
   - When you want cleaner, more readable code
   - Example: html`<div>${myAtom}</div>`
2. Use explicit watch() for inputs and performance-critical cases:
   - Input fields to prevent losing focus on keystrokes
   - Large components where host updates are expensive
   - When you need to bind atoms to properties (.value=${watch(atom)})
   - Example: <input .value=${watch(textAtom)} />
3. Use `html` from `@reatom/lit` for auto-reactivity, or use `watch()` with `html` from `lit`
   for explicit control
   - `@reatom/lit` html/svg automatically wraps atoms with `watch()`
   - `lit` html requires you to write `watch(atom)` explicitly
   - Reading atoms directly in `render()` triggers a host update cycle

----------------------------------------------------------------------------
PERFORMANCE NOTE
----------------------------------------------------------------------------
watch() and auto-reactive html have the SAME performance:
- html from @reatom/lit automatically wraps atoms with watch()
- Both use Lit's directive system for direct DOM updates
- Only the changed Part is updated, not the whole template

Lit reference (update cycle & DOM patching):
- https://lit.dev/docs/components/lifecycle/
- https://lit.dev/docs/components/rendering/
- https://lit.dev/docs/api/directives/

## Automatic Reactivity

Auto Reactivity

Automatic Reactivity with html and svg

Import html and svg from @reatom/lit for automatic atom wrapping.
These functions detect atoms in template expressions and apply the
watch directive automatically — no need for explicit watch() calls.

```ts
import { atom } from '@reatom/core'
import { ReatomLitElement, html, svg } from '@reatom/lit'

const label = atom('Hello', 'label')
const radius = atom(40, 'radius')
const color = atom('#4CAF50', 'color')

class AutoReactiveComponent extends ReatomLitElement {
  render() {
    // Atoms are automatically wrapped with watch() — just use them directly
    return html`
      <div>
        <p>${label}</p>
        ${svg`
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="${radius}" fill="${color}" />
          </svg>
        `}
      </div>
    `
  }
}
```

Both html and svg from @reatom/lit work the same way:
atoms passed in template expressions are automatically reactive.
This is equivalent to wrapping each atom with watch(), but cleaner.

For a detailed comparison of reactive approaches (auto-reactive html,
explicit watch(), and standard Lit html), see
[watch Directive](/handbook/lit/basic/watch-directive).

