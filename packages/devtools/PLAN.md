Reatom Devtools - rewrite requirements and notes

Scope and intent

- General-purpose logger UI with optional Reatom frame tracing
- Designed for dev usage and global access via globalThis.REATOM_DEVTOOLS

Public API surface

- createDevtools(options?) -> Devtools
  - log(name: string, payload?: unknown): void
  - state<T>(name: string, initState: T): DevtoolsState<T>
    - callable setter: (newState: T) => void
    - subscribe(cb) -> unsubscribe, only emits when updates come from devtools edit
  - show(): void
  - hide(): void

createDevtools options and defaults

- initVisibility?: boolean (default true)
- initSize?: number (default 1000)
- getColor?: (frame) => string
- separator?: string | RegExp | (name) => string[] (default /\.|#/)
- privatePrefix?: string (default "\_")

UI features: logs view

- Filters
  - Active filter form with regex and state-search fields
  - Filter modes: filter, hide, exclude, highlight (with color)
  - Save filter into a list; list supports remove and edit
  - Default unremovable "private" filter hides names starting with "_" or "._"
  - "garbage/exclude" style filter drops logs before insertion
- Values search
  - Filters by stringified payload with a cached per-log string ()
- Actions and toggles
  - clear logs: remove all collected logs
  - clear lines: remove cause chain highlight lines
  - recording: stop appending new logs
  - preview: toggle inline payload preview
  - time: toggle timestamp lines (requires reload to take effect)
  - snap: snapshot of current visible logs into a list
  - size: log collection limit
- Log row
  - Toggle stack trace
  - Highlight causal chain for that log
  - Toggle inspector view for payload

UI features: payload inspector

- Built on ObservableHQ Inspector (inside Shadow DOM)
- Buttons:
  - edit (open JSON form, apply by JSON.parse)
  - history (diff current and previous states, max length 10)
  - log to console
  - copy JSON to clipboard
  - download JSON file
  - convert to plain JSON (parseAtoms)
- Edit form writes state through a special update action
- History uses jsondiffpatch HTML formatter with links to cause items

UI features: states view

- Hierarchical tree from log names split by separator
- Skips actions and private names
- Tracks atoms and updates via proto.updateHooks
- "reload" button forces snapshot re-render
- "log" button attempts structuredClone then falls back to live data
- Special case: urlAtom displays href only

Architecture and data flow

- Two contexts:
  - clientCtx: user Reatom ctx being inspected
  - ctx: internal devtools ctx for UI state
- Shadow DOM container with isolated styles
- Graph view:
  - clientCtx.subscribe receives patches for a transaction
  - actionsStates and historyStates caches updated per frame
  - initialize causes ordering to display cause before effect
  - filters applied before insertion
  - timestamp items inserted once per transaction
  - list is a linked list for efficient append/remove
  - size limit trims list and preserves scroll offset
- Lines:
  - followingsMap builds cause relationships
  - highlight draws SVG polylines linking cause items

Persistence

- Filters stored in localStorage with versioned key: name + "v27"
- view switch stored in localStorage
- settings are restored on load with Zod validation

Dependencies that affect behavior

- @reatom/framework, @reatom/jsx for reactivity and rendering
- @observablehq/inspector for data view
- jsondiffpatch for history diffs
- zod for filter persistence validation
- @reatom/persist-web-storage for storage helper

Known corner cases, bugs, and complexity hotspots

- initSize option is ignored by graph model (hardcoded 1000)
- state() uses internal ctx for comparison instead of clientCtx
- log() and state() share a cache by name, action/atom name collision possible
- edit form JSON.parse errors are not handled
- recording off still updates internal action/history caches
- timestamp coalescing uses Date.now per transaction; same ms merges
- followingsMap and highlighted are not cleared on size trim, only on clear logs
- history only tracks new references; in-place mutation will not show diffs
- localStorage and clipboard errors are not handled
- auto-scroll assumes list is mounted, uses non-null assertions
- proto.updateHooks added in states view are never removed
- default separator differs between docs and code (docs say ".", code uses /\.|#/)
- hover preview option is described in docs but not found in code
- tests are a stub only

Rewrite guidance checklist

- Preserve API surface and behaviors above, including defaults
- Preserve all UI affordances and inspector actions
- Keep Shadow DOM isolation or equivalent
- Ensure cause tracing and stack linking behavior
- Maintain persistence and versioning semantics
- Keep history size and diff formatting behavior
- Match filtering semantics, including private prefix handling
