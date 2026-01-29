/** @doc-expand
 * Testing
 *
 * Testing Reatom + Lit Components
 *
 * This guide covers testing strategies for components built with @reatom/lit
 * using Vitest as the test runner.
 *
 * ## Setup
 *
 * Install dependencies:
 *
 * ```bash
 * npm install -D vitest happy-dom @testing-library/dom
 * ```
 *
 * Configure Vitest in `vitest.config.ts`:
 *
 * ```ts
 * import { defineConfig } from 'vitest/config'
 *
 * export default defineConfig({
 *   test: {
 *     environment: 'happy-dom',
 *     globals: true,
 *   },
 * })
 * ```
 */

import { atom, action, computed, context } from '@reatom/core'
import { ReatomLitElement, watch } from '@reatom/lit'
import { html } from 'lit'

// ============================================================================
// 1. Testing Atoms in Isolation
// ============================================================================

/** @doc-expand
 * ## Testing Atoms in Isolation
 *
 * Test atoms independently from components for unit tests:
 */

// Example atoms to test
const countAtom = atom(0, 'count')
const doubledAtom = computed(() => countAtom() * 2, 'doubled')
const incrementAction = action(() => {
  countAtom.set((n) => n + 1)
}, 'increment')

/**
 * Example test file: counter.test.ts
 *
 * ```ts
 * import { describe, it, expect, beforeEach } from 'vitest'
 * import { context } from '@reatom/core'
 * import { countAtom, doubledAtom, incrementAction } from './counter'
 *
 * describe('Counter atoms', () => {
 *   beforeEach(() => {
 *     // Reset context before each test for isolation
 *     context.start()
 *     // Reset atom to initial state
 *     countAtom.set(0)
 *   })
 *
 *   it('should have initial value of 0', () => {
 *     expect(countAtom()).toBe(0)
 *   })
 *
 *   it('should increment count', () => {
 *     incrementAction()
 *     expect(countAtom()).toBe(1)
 *   })
 *
 *   it('should compute doubled value', () => {
 *     countAtom.set(5)
 *     expect(doubledAtom()).toBe(10)
 *   })
 * })
 * ```
 */

// ============================================================================
// 2. Testing Components
// ============================================================================

/** @doc-expand
 * ## Testing Components
 *
 * Test components with their reactive behavior:
 */

// Example component to test
class CounterElement extends ReatomLitElement {
  render() {
    return html`
      <div data-testid="count">${watch(countAtom)}</div>
      <button data-testid="increment" @click=${incrementAction}>+</button>
    `
  }
}

customElements.define('counter-element', CounterElement)

/**
 * Example test file: counter-element.test.ts
 *
 * ```ts
 * import { describe, it, expect, beforeEach, afterEach } from 'vitest'
 * import { context } from '@reatom/core'
 * import { countAtom } from './counter'
 * import './counter-element'
 *
 * describe('CounterElement', () => {
 *   let element: HTMLElement
 *
 *   beforeEach(async () => {
 *     // Reset context
 *     context.start()
 *     countAtom.set(0)
 *
 *     // Create element
 *     element = document.createElement('counter-element')
 *     document.body.appendChild(element)
 *
 *     // Wait for Lit to render
 *     await element.updateComplete
 *   })
 *
 *   afterEach(() => {
 *     element.remove()
 *   })
 *
 *   it('should display initial count', () => {
 *     const display = element.shadowRoot!.querySelector('[data-testid="count"]')
 *     expect(display?.textContent).toBe('0')
 *   })
 *
 *   it('should update when atom changes', async () => {
 *     countAtom.set(42)
 *
 *     // Wait for reactive update
 *     await element.updateComplete
 *
 *     const display = element.shadowRoot!.querySelector('[data-testid="count"]')
 *     expect(display?.textContent).toBe('42')
 *   })
 *
 *   it('should increment on button click', async () => {
 *     const button = element.shadowRoot!.querySelector('[data-testid="increment"]')
 *     button?.click()
 *
 *     await element.updateComplete
 *
 *     expect(countAtom()).toBe(1)
 *   })
 * })
 * ```
 */

// ============================================================================
// 3. Testing Async Actions
// ============================================================================

/** @doc-expand
 * ## Testing Async Actions
 *
 * Mock async operations and test loading states:
 */

const userAtom = atom<{ name: string } | null>(null, 'user')
const loadingAtom = atom(false, 'loading')
const errorAtom = atom<string | null>(null, 'error')

const fetchUserAction = action(async (userId: string) => {
  loadingAtom.set(true)
  errorAtom.set(null)

  try {
    const response = await fetch(`/api/users/${userId}`)
    const data = await response.json()
    userAtom.set(data)
  } catch (err) {
    errorAtom.set(err instanceof Error ? err.message : 'Unknown error')
  } finally {
    loadingAtom.set(false)
  }
}, 'fetchUser')

/**
 * Example test file: user.test.ts
 *
 * ```ts
 * import { describe, it, expect, beforeEach, vi } from 'vitest'
 * import { context } from '@reatom/core'
 * import { userAtom, loadingAtom, errorAtom, fetchUserAction } from './user'
 *
 * describe('User actions', () => {
 *   beforeEach(() => {
 *     context.start()
 *     userAtom.set(null)
 *     loadingAtom.set(false)
 *     errorAtom.set(null)
 *   })
 *
 *   it('should fetch user successfully', async () => {
 *     // Mock fetch
 *     global.fetch = vi.fn().mockResolvedValue({
 *       json: () => Promise.resolve({ name: 'John' }),
 *     })
 *
 *     await fetchUserAction('123')
 *
 *     expect(userAtom()).toEqual({ name: 'John' })
 *     expect(loadingAtom()).toBe(false)
 *     expect(errorAtom()).toBe(null)
 *   })
 *
 *   it('should handle fetch error', async () => {
 *     global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
 *
 *     await fetchUserAction('123')
 *
 *     expect(userAtom()).toBe(null)
 *     expect(errorAtom()).toBe('Network error')
 *   })
 *
 *   it('should set loading state during fetch', async () => {
 *     let resolvePromise: (value: any) => void
 *     const fetchPromise = new Promise((resolve) => {
 *       resolvePromise = resolve
 *     })
 *
 *     global.fetch = vi.fn().mockReturnValue(fetchPromise)
 *
 *     const actionPromise = fetchUserAction('123')
 *
 *     // Check loading state during fetch
 *     expect(loadingAtom()).toBe(true)
 *
 *     // Resolve fetch
 *     resolvePromise!({ json: () => Promise.resolve({ name: 'John' }) })
 *     await actionPromise
 *
 *     expect(loadingAtom()).toBe(false)
 *   })
 * })
 * ```
 */

// ============================================================================
// 4. Testing Component Integration
// ============================================================================

/** @doc-expand
 * ## Integration Testing
 *
 * Test multiple components working together:
 */

// Parent component
class UserProfile extends ReatomLitElement {
  render() {
    const user = userAtom()
    const loading = loadingAtom()
    const error = errorAtom()

    if (loading) return html`<div data-testid="loading">Loading...</div>`
    if (error) return html`<div data-testid="error">${error}</div>`
    if (user) return html`<div data-testid="user">${user.name}</div>`
    return html`<div data-testid="empty">No user</div>`
  }
}

customElements.define('user-profile', UserProfile)

/**
 * Example integration test:
 *
 * ```ts
 * describe('UserProfile integration', () => {
 *   it('should show loading, then user data', async () => {
 *     let resolvePromise: (value: any) => void
 *     global.fetch = vi.fn().mockReturnValue(
 *       new Promise((resolve) => { resolvePromise = resolve })
 *     )
 *
 *     const element = document.createElement('user-profile')
 *     document.body.appendChild(element)
 *
 *     // Trigger fetch
 *     fetchUserAction('123')
 *     await element.updateComplete
 *
 *     // Should show loading
 *     expect(element.shadowRoot!.querySelector('[data-testid="loading"]')).toBeTruthy()
 *
 *     // Resolve fetch
 *     resolvePromise!({ json: () => Promise.resolve({ name: 'John' }) })
 *     await new Promise((r) => setTimeout(r, 0)) // Wait for async
 *     await element.updateComplete
 *
 *     // Should show user
 *     const userEl = element.shadowRoot!.querySelector('[data-testid="user"]')
 *     expect(userEl?.textContent).toBe('John')
 *
 *     element.remove()
 *   })
 * })
 * ```
 */

// ============================================================================
// 5. Test Utilities
// ============================================================================

/** @doc-expand
 * ## Helpful Test Utilities
 *
 * Create reusable utilities for common testing patterns:
 *
 * ```ts
 * // test-utils.ts
 * import { context } from '@reatom/core'
 *
 * export async function waitForUpdate(element: LitElement) {
 *   await element.updateComplete
 *   // Additional microtask for Reatom updates
 *   await new Promise((r) => setTimeout(r, 0))
 *   await element.updateComplete
 * }
 *
 * export function resetContext() {
 *   context.start()
 * }
 *
 * export function createElement<T extends HTMLElement>(
 *   tagName: string
 * ): T {
 *   const element = document.createElement(tagName) as T
 *   document.body.appendChild(element)
 *   return element
 * }
 * ```
 *
 * ## Summary
 *
 * | Test Type | What to Test | Tools |
 * |-----------|--------------|-------|
 * | Unit | Atoms, computed, actions | Vitest assertions |
 * | Component | Rendering, user interaction | happy-dom, shadowRoot queries |
 * | Integration | Multiple components together | Full DOM, async utilities |
 * | E2E | Complete user flows | Playwright, Cypress |
 */
