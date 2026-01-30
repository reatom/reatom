/** @doc-expand
 * Orderbook
 *
 * Bybit Orderbook - Real-time Trading Interface
 *
 * This advanced example demonstrates building a high-performance real-time
 * trading interface using Reatom for state management and Lit for rendering.
 *
 * **<a href="/demo/lit-orderbook/" target="_blank" rel="noopener noreferrer">Live Demo</a>** |
 * **[View Source Code](https://github.com/artalar/reatom/tree/v1000/packages/lit/demo)**
 *
 * ## Key Patterns Demonstrated
 *
 * ### Atomized State (80 individual atoms)
 *
 * Each orderbook level (40 bids + 40 asks) has its own atom:
 *
 * ```ts
 * const orderbook = {
 *   bids: Array.from({ length: 40 }, (_, i) =>
 *     atom<OrderLevel>(['0', '0'], `orderbook.bids.${i}`)
 *   ),
 *   asks: Array.from({ length: 40 }, (_, i) =>
 *     atom<OrderLevel>(['0', '0'], `orderbook.asks.${i}`)
 *   ),
 * }
 * ```
 *
 * This ensures updates to individual levels don't require updating other
 * levels - critical for high-frequency data.
 *
 * ### WebSocket with Reactive Symbol Changes
 *
 * ```ts
 * const currentSymbol = atom(DEFAULT_SYMBOL, 'currentSymbol').extend(
 *   withChangeHook((newSymbol) => {
 *     // Automatically resubscribe when symbol changes
 *     if (shouldConnect() && status() === 'connected') {
 *       resubscribe(newSymbol)
 *     }
 *   })
 * )
 * ```
 *
 * ### Computed Derived Values
 *
 * ```ts
 * const spread = computed(() => {
 *   const bid = orderbook.bids[0]()[0]
 *   const ask = orderbook.asks[0]()[0]
 *   return parseFloat(ask) - parseFloat(bid)
 * }, 'spread')
 *
 * const maxVolume = computed(() => {
 *   return Math.max(...orderbook.bids.map(a => parseFloat(a()[1])))
 * }, 'maxVolume')
 * ```
 *
 * ### Component Lifecycle Integration
 *
 * ```ts
 * class BybitOrderbook extends ReatomLitElement {
 *   connectedCallback() {
 *     super.connectedCallback()
 *     orderbookClient.connect()  // Auto-connect on mount
 *   }
 *
 *   disconnectedCallback() {
 *     super.disconnectedCallback()
 *     orderbookClient.disconnect()  // Auto-disconnect on unmount
 *   }
 * }
 * ```
 *
 * ### Performance Optimizations
 *
 * - **CSS containment** for isolated rendering
 * - **transform** instead of width for volume bars
 * - **will-change** hints for animated properties
 * - **Atomic updates** - only changed levels update
 *
 * ## Architecture Benefits
 *
 * | Feature | Benefit |
 * |---------|---------|
 * | Fine-grained reactivity | Each of 80 atoms updates independently |
 * | Encapsulated state | WebSocket client owns all connection logic |
 * | No callback hell | Components just subscribe to atoms |
 * | Reactive by design | Symbol change → automatic reconnection |
 * | Easy testing | Client logic testable without UI |
 *
 * ## Running the Demo
 *
 * ```bash
 * cd packages/lit/demo
 * pnpm install
 * pnpm dev
 * ```
 *
 * Open http://localhost:5173 to see the orderbook in action.
 */

export {}
