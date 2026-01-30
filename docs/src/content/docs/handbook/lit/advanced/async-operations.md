---
title: Async Operations
description: Async Operations - Reatom Lit integration
---

Reatom's wrap function is essential for preserving reactive context across
async boundaries

```ts
import { atom, action, wrap } from '@reatom/core'
import { ReatomLitElement, html } from '@reatom/lit'

const dataAtom = atom<{ id: number; name: string } | null>(null, 'data')
const loading = atom(false, 'loading')
const errorAtom = atom<string | null>(null, 'error')

const fetchData = action(async () => {
  loading.set(true)
  errorAtom.set(null)

  try {
    const response = await wrap(fetch('/api/data'))
    const json = await wrap(response.json())
    dataAtom.set(json)
  } catch (err) {
    errorAtom.set(err instanceof Error ? err.message : 'Unknown error')
  } finally {
    loading.set(false)
  }
}, 'fetchData')

export class DataElement extends ReatomLitElement {
  override render() {
    return html`
      <div>
        ${this.renderContent()}
        <button @click=${fetchData}>Fetch Data</button>
      </div>
    `
  }

  private renderContent() {
    // Get atom values for conditional checks
    const isLoading = loading()
    const error = errorAtom()
    const data = dataAtom()

    if (isLoading) {
      return html`<p>Loading...</p>`
    }

    if (error) {
      return html`<p>Error: ${error}</p>`
    }

    if (data) {
      return html`<p>Name: ${data.name}</p>`
    }

    return html`<p>No data</p>`
  }
}

customElements.define('data-element', DataElement)
```

Always use wrap around async operations that interact with Reatom atoms or
actions. This preserves the reactive context and enables proper cancellation
and debugging.

Without wrap:

- Context is lost after await
- Debugging and cause tracking won't work
- Automatic cancellation won't work properly

With wrap:

- Context is preserved across async boundaries
- Full debugging support with cause tracking
- Automatic cancellation works correctly

---

[Atomization](/handbook/lit/advanced/atomization) →
