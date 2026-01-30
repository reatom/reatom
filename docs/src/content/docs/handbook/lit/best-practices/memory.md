---
title: Memory Management
description: Memory Management - Reatom Lit integration
---

Guidelines for managing memory with ReatomLitElement

```ts
import { ReatomLitElement, watch } from '@reatom/lit'
import { atom, computed } from '@reatom/core'
import { repeat } from 'lit/directives/repeat.js'
import { html } from 'lit'

const myAtom = atom(0, 'myAtom')
```

1. Don't create atoms in render methods

```ts
class BadComponent extends ReatomLitElement {
  render() {
    const localAtom = atom(0, 'localAtom')
    return html`<div>${watch(localAtom)}</div>`
  }
}

class GoodComponent extends ReatomLitElement {
  render() {
    return html`<div>${watch(myAtom)}</div>`
  }
}
```

2. Clean up dynamic computed atoms

```ts
const baseAtom = atom(0, 'baseAtom')

class BadDynamicComponent extends ReatomLitElement {
  private createComputedAtom(id: string) {
    return computed(() => baseAtom(), `computed-${id}`)
  }

  render() {
    const uniqueComputed = this.createComputedAtom(Math.random().toString())
    return html`<div>${watch(uniqueComputed)}</div>`
  }
}

class GoodDynamicComponent extends ReatomLitElement {
  private computedAtoms = new Map<string, ReturnType<typeof computed>>()

  private getOrCreateComputed(id: string) {
    if (!this.computedAtoms.has(id)) {
      const comp = computed(() => baseAtom(), `computed-${id}`)
      this.computedAtoms.set(id, comp)
    }
    return this.computedAtoms.get(id)!
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this.computedAtoms.clear()
  }

  render() {
    const comp = this.getOrCreateComputed('static-id')
    return html`<div>${watch(comp)}</div>`
  }
}
```

3. Manual subscription cleanup

```ts
const myValue = atom('test', 'myValue')

class ManualSubscriptionComponent extends ReatomLitElement {
  private unsubscribe?: () => void

  connectedCallback() {
    super.connectedCallback()
    this.unsubscribe = myValue.subscribe((value) => {
      console.log('Value changed:', value)
    })
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this.unsubscribe?.()
  }

  render() {
    return html`<div>${watch(myValue)}</div>`
  }
}
```

4. Large lists and virtualization

```ts
const itemsAtom = atom<Array<{ id: string; name: string }>>([], 'itemsAtom')

type Item = { id: string; name: string }

class LargeListComponent extends ReatomLitElement {
  render() {
    const items = itemsAtom()
 
    return html`
      <ul>
        ${repeat(
          items,
          (item) => item.id,
          (item) => html`<li>${item.name}</li>`
        )}
      </ul>
    `
  }
}
```

5. Be careful with closures in computed atoms

```ts
class BadClosureComponent extends ReatomLitElement {
  private largeData = new Array(10000).fill({ big: 'object' })

  // BAD: largeData is captured in closure, preventing garbage collection
  private derivedAtom = computed(() => {
    console.log(this.largeData.length)  // captures `this`
    return myAtom()
  }, 'derived')

  render() {
    return html`<div>${watch(this.derivedAtom)}</div>`
  }
}

class GoodClosureComponent extends ReatomLitElement {
  private largeData = new Array(10000).fill({ big: 'object' })

  // GOOD: computed atom defined outside, doesn't capture large data
  render() {
    // Use data length directly in template, not in computed
    const dataLength = this.largeData.length

    return html`
      <div>
        Data length: ${dataLength}, Value: ${watch(myAtom)}
      </div>
    `
  }
}
```

Key memory management tips:

- Create atoms once, outside of components
- Dispose dynamic computed atoms when no longer needed
- Unsubscribe manually if you use atom.subscribe directly
- Use repeat() directive for large lists, consider virtualization
- Minimize closure scope in watch directives
- Let ReatomLitElement manage subscriptions through watch when possible

---

← [Debugging](/handbook/lit/best-practices/debugging) | [Organization](/handbook/lit/best-practices/organization) →
