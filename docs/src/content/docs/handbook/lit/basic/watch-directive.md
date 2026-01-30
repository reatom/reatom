---
title: Watch Directive
description: Watch Directive - Reatom Lit integration
---

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
// APPROACH 2: Input binding without full re-renders
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
            // Update atom without re-rendering entire component
            this.inputValue.set(target.value)
          }}
        />
        <p>Value: ${watch(this.inputValue)}</p>
      </div>
    `
  }
}

customElements.define('input-example', InputExample)

// Without watch(), the entire component re-renders on every keystroke:
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
// Using html from 'lit' instead of '@reatom/lit' means NO direct atom updates
// ReatomLitElement still tracks atoms and calls render(), but the entire
// component re-renders instead of updating specific DOM parts

import { html as litHtml } from 'lit'

class LessEfficientComponent extends ReatomLitElement {
  render() {
    // Entire component re-renders on atom changes (less efficient)
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
   - Large components where full re-renders are expensive
   - When you need to bind atoms to properties (.value=${watch(atom)})
   - Example: <input .value=${watch(textAtom)} />
3. Avoid standard Lit html (from 'lit') for reactive content
   - Entire component re-renders on every atom change
   - Less efficient than direct DOM updates via watch()
   - Only use when you specifically need full re-render behavior

----------------------------------------------------------------------------
PERFORMANCE NOTE
----------------------------------------------------------------------------
watch() and auto-reactive html have the SAME performance:
- html from @reatom/lit automatically wraps atoms with watch()
- Both use Lit's directive system for direct DOM updates
- Only the changed part updates, not entire component

Standard Lit html is LESS efficient:
- Causes full component re-render on every atom change
- Use watch() or auto-reactive html for better performance

---

← [ReatomLitElement](/handbook/lit/basic/reatom-lit-element) | [Debugging](/handbook/lit/best-practices/debugging) →
