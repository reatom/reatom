/** @doc-expand
 * Paginated list
 * 
 * Paginated list that fetches data from an API
 * 
 * This example demonstrates:
 *
 * - Lazy loading with async computed + withAsyncData
 * - Automatic data fetching when page changes
 * - Built-in status management (ready, pending, error)
 * - Derived atoms from async data (.data atom)
 * - Reactive UI updates without manual fetching
 *
 * The async computed `pageDataResource` automatically fetches data when:
 * - Component first accesses it (via derived atoms)
 * - The page atom changes
 *
 * Data is managed by withAsyncData extension which provides:
 * - .data atom containing the fetched data
 * - .ready() computed - true if not loading
 * - .pending() computed - count of active requests
 * - .error atom containing the last error
 */

import { atom, action, computed } from '@reatom/core'
import { withAsyncData } from '@reatom/core'
import { ReatomLitElement, watch } from '@reatom/lit'
import { html } from 'lit'
import { repeat } from 'lit/directives/repeat.js'

// ============================================================================
// Types
// ============================================================================

type Item = {
  id: number
  title: string
  body: string
}

type PageData = {
  items: Item[]
  totalPages: number
}

// ============================================================================
// Constants
// ============================================================================

const PER_PAGE = 10
const API_URL = 'https://jsonplaceholder.typicode.com/posts'

// ============================================================================
// State
// ============================================================================

const page = atom(1, 'page')

// ============================================================================
// Async resource with lazy loading
// ============================================================================

const pageDataResource = computed(async () => {
  const pageNum = page()
  const response = await fetch(
    `${API_URL}?_page=${pageNum}&_limit=${PER_PAGE}`,
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.statusText}`)
  }

  const items = (await response.json()) as Item[]
  const totalCount = response.headers.get('x-total-count')
  const totalPages = Math.ceil(Number(totalCount) / PER_PAGE)

  return { items, totalPages }
}, 'pageDataResource').extend(
  withAsyncData({
    initState: { items: [], totalPages: 1 },
  }),
)

// ============================================================================
// Derived atoms
// ============================================================================

const items = computed(() => pageDataResource.data().items, 'items')
const totalPages = computed(() => pageDataResource.data().totalPages, 'totalPages')
const isLoading = computed(() => !pageDataResource.ready(), 'isLoading')
const error = computed(() => {
  const err = pageDataResource.error()
  return err instanceof Error ? err.message : null
}, 'error')

const hasNextPage = computed(() => page() < totalPages(), 'hasNextPage')
const hasPrevPage = computed(() => page() > 1, 'hasPrevPage')

const prevDisabled = computed(
  () => !hasPrevPage() || isLoading(),
  'pagination.prevDisabled',
)

const nextDisabled = computed(
  () => !hasNextPage() || isLoading(),
  'pagination.nextDisabled',
)

const renderContent = computed(() => {
  if (isLoading()) {
    return html`<div class="loading">Loading...</div>`
  }

  const err = error()
  if (err) {
    return html`<div class="error">Error: ${err}</div>`
  }

  const list = items()
  return html`
    <ul class="item-list">
      ${repeat(
        list,
        (item) => item.id,
        (item) => html`
          <li class="item">
            <h3>${item.title}</h3>
            <p>${item.body}</p>
          </li>
        `,
      )}
    </ul>
  `
}, 'paginatedList.renderContent')

// ============================================================================
// Actions
// ============================================================================

const nextPage = action(() => {
  if (hasNextPage()) {
    page.set((p) => p + 1)
  }
}, 'nextPage')

const prevPage = action(() => {
  if (hasPrevPage()) {
    page.set((p) => p - 1)
  }
}, 'prevPage')

// ============================================================================
// Component
// ============================================================================

export class PaginatedList extends ReatomLitElement {
  override render() {
    return html`
      <div class="paginated-list">
        <h2>Paginated List</h2>

        ${watch(renderContent)}

        <div class="pagination">
          <button
            @click=${prevPage}
            ?disabled=${watch(prevDisabled)}
          >
            Previous
          </button>
          <span>Page ${watch(page)} of ${watch(totalPages)}</span>
          <button
            @click=${nextPage}
            ?disabled=${watch(nextDisabled)}
          >
            Next
          </button>
        </div>
      </div>
    `
  }
}

customElements.define('paginated-list', PaginatedList)
