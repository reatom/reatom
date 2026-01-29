/**
 * Performance
 *
 * Performance tips for ReatomLitElement components
 *
 * @file Performance Considerations
 */

import { atom, computed, type Atom } from '@reatom/core'
import { ReatomLitElement, watch } from '@reatom/lit'
import { html } from 'lit'

/**
 * 1. Use computed atoms for derived state
 *
 * Instead of computing derived values in render methods, use computed atoms for
 * better performance:
 */

// ❌ BAD: Computed in render
const itemsBad = atom<{ id: number; active: boolean }[]>([], 'itemsBad')

export class DerivedStateBadComponent extends ReatomLitElement {
  override render() {
    const activeItems = itemsBad().filter((item) => item.active)
    return html`<div>Active items: ${activeItems.length}</div>`
  }
}

customElements.define('derived-state-bad', DerivedStateBadComponent)

// ✅ GOOD: Computed atom
const items = atom<{ id: number; active: boolean }[]>([], 'items')
const activeItems = computed(() => {
  return items().filter((item) => item.active)
}, 'activeItems')

export class DerivedStateComponent extends ReatomLitElement {
  override render() {
    const activeItemsList = activeItems()
    return html`<div>Active items: ${activeItemsList.length}</div>`
  }
}

customElements.define('derived-state', DerivedStateComponent)

/**
 * 2. Use computed atoms for expensive calculations
 *
 * Don't compute expensive values on every render. Use computed atoms to cache
 * the results and only recalculate when dependencies change:
 */

// ❌ BAD: Expensive calculation on every render
const counterAtomBad = atom(5, 'counterAtomBad')

export class BadExpensiveComponent extends ReatomLitElement {
  private factorial(n: number): number {
    // Expensive factorial calculation
    return n <= 1 ? 1 : n * this.factorial(n - 1)
  }

  override render() {
    const counter = counterAtomBad()
    // Recalculates factorial on EVERY render, even when counter doesn't change
    const result = this.factorial(counter)
    return html`<div>${counter}! = ${result}</div>`
  }
}

customElements.define('bad-expensive', BadExpensiveComponent)

// ✅ GOOD: Computed atom caches the result
const counterAtom = atom(5, 'counterAtom')

function factorial(n: number): number {
  // Expensive factorial calculation
  return n <= 1 ? 1 : n * factorial(n - 1)
}

const factorialAtom = computed(() => {
  const n = counterAtom()
  // Only recalculates when counterAtom changes, result is cached
  return factorial(n)
}, 'factorialAtom')

export class ComputedExpensiveComponent extends ReatomLitElement {
  override render() {
    const counter = watch(counterAtom)
    const factorialValue = watch(factorialAtom)
    return html`<div>${counter}! = ${factorialValue}</div>`
  }
}

customElements.define('computed-expensive', ComputedExpensiveComponent)

/**
 * 3. Use computed render props
 *
 * You can create computed atoms as class properties to memoize parts of your
 * render template. This is useful when one part of the tree updates frequently
 * while another doesn't.
 *
 * When used with the watch directive, computed render props update their DOM
 * independently of the component lifecycle.
 *
 * IMPORTANT: Computed render props should ONLY depend on atoms, NOT on Lit
 * properties. If they depend on component props, they won't update when props
 * change:
 */

// ❌ BAD: Template part recreated on every render
export class BadPriceComponent extends ReatomLitElement {
  override render() {
    const finalPrice = finalPriceAtom()
    const savings = savingsAtom()
    // Complex template part recreated on EVERY render
    const savingsTemplate = html`(save $${savings.toFixed(2)})`
    return html`<div>$${finalPrice.toFixed(2)} ${savingsTemplate}</div>`
  }
}

customElements.define('bad-price', BadPriceComponent)

// ✅ GOOD: Computed class property memoizes template part
const priceAtom = atom(100, 'priceAtom')
const taxAtom = atom(20, 'taxAtom')
const discountAtom = atom(10, 'discountAtom')

// Base calculations
const finalPriceAtom = computed(() => {
  const price = priceAtom()
  const tax = taxAtom()
  const discount = discountAtom()
  return price * (1 + tax / 100) * (1 - discount / 100)
}, 'finalPriceAtom')

const savingsAtom = computed(() => {
  const price = priceAtom()
  const finalPrice = finalPriceAtom()
  return price - finalPrice
}, 'savingsAtom')

export class PriceDisplayComponent extends ReatomLitElement {
  // Computed render content - memoized template part
  renderContent = computed(() => {
    const savings = savingsAtom()
    return html`(save $${savings.toFixed(2)})`
  }, 'renderContent')

  override render() {
    const content = this.renderContent()
    return html`<div>$${watch(finalPriceAtom)} ${content}</div>`
  }
}

customElements.define('price-display', PriceDisplayComponent)

// ❌ BAD: Computed render prop depends on Lit property
export class UserGreetingBad extends ReatomLitElement {
  static properties = {
    userName: { type: String },
  }

  declare userName: string

  // This computed depends on `this.userName` which is a Lit property
  greeting = computed(() => {
    // ❌ Won't update when userName prop changes!
    return html`Hello, ${this.userName}!`
  }, 'greeting')

  override render() {
    return html`<div>${this.greeting()}</div>`
  }
}

customElements.define('user-greeting-bad', UserGreetingBad)

// ✅ GOOD: Put prop value into atom, then compute
const userNameAtom = atom('World', 'userNameAtom')

export class UserGreetingGood extends ReatomLitElement {
  greeting = computed(() => {
    const name = userNameAtom()
    // ✅ Will update when userNameAtom changes
    return html`Hello, ${name}!`
  }, 'greeting')

  override render() {
    return html`<div>${this.greeting}</div>`
  }
}

customElements.define('user-greeting', UserGreetingGood)

// ✅ GOOD: External atom as prop works correctly
export class UserGreetingWithAtomProp extends ReatomLitElement {
  static properties = {
    nameAtom: { type: Object },
  }

  declare nameAtom: typeof atom<string>

  greeting = computed(() => {
    // ✅ Will update when nameAtom prop changes, because it's an atom!
    const name = this.nameAtom()
    return html`Hi, ${name}!`
  }, 'greeting')

  override render() {
    return html`<div>${this.greeting}</div>`
  }
}

customElements.define('user-greeting-atom-prop', UserGreetingWithAtomProp)

/**
 * 4. Avoid creating atoms in render methods
 *
 * Creating atoms in render methods creates new atoms on every render, which
 * leads to performance issues and memory leaks:
 */

// ❌ BAD: Creates new atom on every render
export class BadAtomCreationComponent extends ReatomLitElement {
  override render() {
    const myAtom = atom(0, 'myAtom')
    return html`<div>${watch(myAtom)}</div>`
  }
}

customElements.define('bad-atom-creation', BadAtomCreationComponent)

// ✅ GOOD: Create atom once, outside component
const myAtom = atom(0, 'myAtom')

export class GoodComponent extends ReatomLitElement {
  override render() {
    return html`<div>${watch(myAtom)}</div>`
  }
}

customElements.define('good-component', GoodComponent)

/**
 * 5. Use atomization for lists
 *
 * The atomization pattern provides O(1) updates instead of O(n) for list
 * modifications. Each item's mutable properties become individual atoms,
 * so updating one item doesn't trigger re-renders of other items.
 *
 * For detailed explanation and examples, see the
 * [Atomization in Lit Components](/handbook/lit/advanced#atomization) section.
 */

type Todo = {
  id: string
  text: Atom<string>
  completed: Atom<boolean>
}

const todos = atom<Todo[]>([], 'todos')

export class AtomizedListComponent extends ReatomLitElement {
  override render() {
    return html`
      <ul>
        ${todos().map((todo) =>
          computed(() => html`
            <li>
              ${todo.text()} - ${todo.completed() ? '✓' : '✗'}
            </li>
          `),
        )}
      </ul>
    `
  }
}

customElements.define('atomized-list', AtomizedListComponent)

/**
 * Key performance tips:
 *
 * - Use computed atoms for derived state instead of computing in render
 * - Use computed atoms for expensive calculations (auto-memoization)
 * - Use computed render props to memoize template parts (only depend on atoms!)
 * - Avoid creating atoms in render methods (create them outside)
 * - Use atomization for lists - only the changed item re-renders, not the whole
 *   list
 * - Atomization provides O(1) updates instead of O(n) for list modifications
 * - Keep component render functions pure and focused
 * - Minimize DOM operations by batching updates
 * - Use Lit's built-in optimizations like @lit/task
 * - Profile your components to identify bottlenecks
 * - Consider using virtual scrolling for very large lists (1000+ items)
 */
