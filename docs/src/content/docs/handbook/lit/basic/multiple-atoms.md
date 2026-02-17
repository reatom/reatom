---
title: Multiple Atoms
description: Multiple Atoms - Reatom Lit integration
---

You can use multiple atoms in a single component

```ts
import { atom, computed } from '@reatom/core'
import { ReatomLitElement, html } from '@reatom/lit'
import { customElement } from 'lit/decorators.js'

const firstName = atom('John', 'firstName')
const lastName = atom('Doe', 'lastName')

const fullName = computed(() => {
  return `${firstName()} ${lastName()}`
}, 'fullName')

@customElement('greeting-element')
export class GreetingElement extends ReatomLitElement {
  render() {
    return html`
      <div>
        <h2>${fullName}</h2>
        <button @click=${() => firstName.set('Jane')}>Change first name</button>
      </div>
    `
  }
}
```

When firstName or lastName changes, the fullName computed atom updates, and
the component updates to show the new full name.

---

← [Auto Reactivity](/handbook/lit/basic/auto-reactivity) | [Passing Atoms](/handbook/lit/basic/passing-atoms) →
