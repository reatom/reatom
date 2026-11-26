# Linked list filtering: design notes

Status: decided, option B implemented on `t3/review-reatom-list-virtual-view` (e5f5439a and the
follow-up that moved the model cache into the map). See [Decision](#decision).

## The problem

`list.reatomMap(toState).reatomFilter(test).reatomMap(toView)` is the recommended chain. Today a
filter toggle is reported as `remove` / `insert`, so everything after the filter treats a hidden
row as gone:

- `reatomMap` after the filter drops the model and creates a new one when the row comes back
  (commit 346799e8: a model lives while its origin is a member).
- jsx tears a detached element down permanently (`meta.disposed`, subscribes cleared), so a row
  shown again is a new element: component state, focus and scroll inside it are lost, and the row
  is rendered again.

A physical filter (the list really shrinks) is still needed: `size`, indexes, `reatomView` and
`reatomVirtual` all work on the list structure.

## Directions discussed

1. **Cross-commit model cache in `reatomMap`.** Rejected: a returning origin got its cached model,
   which jsx had already disposed, so the row was a dead element.
2. **Cache only inside `reatomFilter`.** Same lifetime problem, moved one step.
3. **Flag filter (no list changes).** The filter leaves the list intact and gives each node a
   hidden flag, one computed per node; several filters compose through `withComputed`. jsx renders
   every row and marks hidden ones with a `data-reatom-filter` attribute plus an overridable
   `[data-reatom-filter]{display:none}` rule. A row can opt out per node, e.g.
   `{() => shown.has(todo) && <Editor todo={todo} />}`, which needs `has(node)` to notify only when
   that row flips. No chunks, no fixed group sizes: rejected as too complex to debug.
   - Covers: toggles in O(flipped) DOM writes, row state survives, per-row precision for data
     changes.
   - Does not cover: `size`, indexes, `reatomView`, `reatomVirtual`; the DOM always holds every row.
   - Conclusion: it can be a userland recipe (a computed per row plus an attribute); it does not
     replace a physical filter.
4. **New incremental change kind for filter toggles.** See below.

## Option 4: a filter change kind

The list still shrinks physically, but a toggle is reported as "hidden, still alive in the
source" instead of "removed". Proposed records:

| kind   | shape            | structure     | meaning                                                     |
| ------ | ---------------- | ------------- | ----------------------------------------------------------- |
| `hide` | `{nodes}`        | like `remove` | left this list, still in the source, may come back          |
| `show` | `{nodes, after}` | like `insert` | a hidden node came back                                     |
| `drop` | `{nodes}`        | no-op         | a hidden node left the source: release what you kept for it |

`drop` is the one new rule: every derivation forwards it for nodes it never showed, so whoever
kept a hidden row learns when to free it. It is explicit in the protocol, not a hidden lifetime.

Consumers:

- Structure-only consumers (`replayLL`, `reatomView`, `reatomVirtual`, `compare`, admin): read
  `hide` as `remove`, `show` as `insert`, ignore `drop`. One normalisation helper.
- `reatomFilter` after a filter: upstream `hide` of a member → `hide`; upstream `show` → `show` if it
  passes, otherwise nothing; upstream `remove` of a node hidden here → `drop`; `drop` → forwarded.
- `reatomMap`: `hide` parks the model, `show` unparks it, `drop` / `clear` / `remove` release it.
- jsx: `hide` detaches the element and marks it parked so the MutationObserver cleanup skips it,
  `show` re-inserts it, `drop` tears it down explicitly. A parked row keeps its subscriptions (same
  cost as a CSS-hidden row); pausing them needs re-subscribable elements (see below).
- `reatomReduce` users see the new kinds in `apply` (public, breaking).

### Variants

- **4a. `hide`/`show`/`drop`** (above). Recommended.
- **4b. One `filter` record** `{hidden, shown: [{nodes, after}]}` per refilter. Fewer records, but
  `after` anchors are hard to replay in order. Worse.
- **4c. `remove` of a non-member means drop.** One kind fewer, but every structural consumer must
  check membership before removing. Worse.
- **4d. No new kind; lifetime from the root source.** `reatomMap` / jsx park on `remove` when the
  origin is still in the root list and sweep on the root's removes. No protocol change, but the map
  reads a second change stream and depends on what the filter's root is.
- **Related, not a kind: re-subscribable jsx elements.** Cleanup keeps `meta.subscribes`, a
  re-attached element resubscribes. Then a cached model is no longer a dead element and
  direction 1 becomes correct. Costs: hidden rows keep render captures in memory; `onCreate` /
  `onRemove` describe the cache, not membership.

### Cost estimate (4a)

| place                         | lines (src) |
| ----------------------------- | ----------- |
| types, `replayLL`, normaliser | +15         |
| `reatomFilter`                | +15 / −0    |
| `reatomMap` (park set)        | +25         |
| jsx renderer (park, drop)     | +20         |
| docs                          | +30         |
| tests                         | +150        |

Roughly +75 source lines and one new concept ("hidden but alive").

### Performance per toggle (N source rows, F flipped)

| step                | today (`remove`/`insert`)       | 4a (`hide`/`show`) | 3 (flags + CSS)         |
| ------------------- | ------------------------------- | ------------------ | ----------------------- |
| predicate           | O(N) calls                      | O(N) calls         | O(N) per-node computeds |
| list                | O(F) relinks                    | O(F) relinks       | none                    |
| map after filter    | F model creations and disposals | F park/unpark      | none                    |
| jsx                 | F renders + F teardowns         | F DOM moves        | F attribute writes      |
| DOM size            | shown rows                      | shown rows         | all rows                |
| `size`/view/virtual | yes                             | yes                | no                      |

Shared caveat: without chunks, a tracked predicate (one that reads row data) rescans all N rows
on any change it depends on. Fine for cheap predicates on a few thousand rows; per-row precision
needs a computed per row, which only option 3 has.

## Decision

Both options were prototyped from 346799e8 and compared:

|                    | A: `hide`/`show`/`drop` (`proto/filter-kind`, dba9b6d4)              | B: re-subscribable jsx + map cache (`proto/resubscribe`, e5f5439a) |
| ------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Size               | about +620/−100 (core ~200, jsx ~60, tests, docs)                    | core −16, jsx ±12                                                  |
| New concepts       | 3 kinds, "hidden but alive", `drop` forwarding                       | none, `disposed` became `suspended`                                |
| Keeps a row across | filter toggles                                                       | any remove + insert of the same origin                             |
| Hidden row         | stays subscribed                                                     | suspended, resubscribes when shown                                 |
| Release            | explicit (`drop`, `onRemove`)                                        | GC, with the origin or the map                                     |
| Fragile spots      | missed versions forget hidden rows; every derivation forwards `drop` | refs run again on re-attach (like React StrictMode)                |

The keyed js-framework-benchmark showed no CPU or memory difference beyond noise between A and B
(Clear rows: A 138 ms, B 135 ms, Solid 97 ms; 25_run-clear-memory: A 1.13 MiB, B 1.17 MiB).

B was chosen: it fixes the cause (jsx made a removed element permanently dead) instead of one
source of removals, needs no protocol change, and costs nothing while a row is hidden.

### Retention fix on top of B

B cached the model on the origin under a per-map symbol. A map created per component mount over
long-lived origins (an entity store) then left one model, a whole DOM row, on every origin per
mount, forever. The cache now lives in the map state (`models: WeakMap<origin, model>`, carried
from the previous state, per context), so it is collected with the map, and an entry with its
origin. What remains is bounded and documented: a long-lived map keeps one model per origin that
something else still holds. A copy of an origin no longer carries its model.

### Open

- A heap snapshot after a clear, to confirm that kept subscribe thunks do not pin the old list
  state (the benchmark measures only page totals).
- A filter-toggle benchmark case.
