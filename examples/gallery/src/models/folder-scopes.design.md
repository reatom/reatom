# Gallery route scope ownership

## Constraints and decision

The user requires folder URLs to survive reload, unrelated folders to stay lazy,
and A → B → A to retain the exact image models and completed thumbnails. The
existing `reatomRoute` loader and `withCache()` own the lifetime; no additional
route registry, model reference counting, LRU, or core runtime is introduced.

## Audit and rejected directions

The previous collection built models by walking the sidebar tree and kept module
maps for image models, folder models, and foreground thumbnail subscriptions.
`FolderImageTree` mounted the whole tree and hid rows outside the selection.
Navigation disposed every model, while the route cache retained only file
sources. Consequently a cache hit repeated file reads and thumbnail decoding.

1. Keep descriptor caching: rejected because it cannot preserve model identity or
   completed thumbnail artifacts.
2. Share models globally by image ID: rejected because parents, descendants,
   separate roots, and simultaneous Reatom contexts acquire overlapping ownership.
3. Cache selected-folder scopes in the existing loader: selected. Each scope owns
   its model maps, source atom, sorted tree, visible images, and demand leases.
   Parent, child, recursive, and All scopes are deliberately independent.

The platform directory handles resolve deep links without traversing unrelated
subtrees. Reatom atoms provide context-local state, actions provide explicit
activation, and the existing cache provides five entries with five-minute expiry.
These existing mechanisms replace the global registries and DOM masking.

## Runtime and ownership

The loader reads route parameters, a per-context root-generation Symbol, the
root handle, and recursion inputs synchronously. It yields through `wrap` before
creating a scope or accessing the filesystem: cache key discovery executes this
synchronous prefix speculatively even on hits.

A progressive scan publishes files only into its own scope. The sidebar receives
separate directory-only snapshots, with counts and discovered branches retained.
The active projection publishes rows and starts foreground/background demand only
for the selected scope. Deactivation drops demand and cancels unfinished work
through each image's nonterminal lifecycle method. Completed file, metadata, and
thumbnail state remain owned by the scope.

Deactivation releases decoded display images, full-resolution and RAW display
URLs, and sized canvases. Returning to a retained scope reuses its exact image
models and completed thumbnail artifacts when the requested representation is
unchanged; thumbnail size or orientation changes can regenerate the thumbnail.
Full-resolution lightbox decoding may run again after reactivation.

A scope is retained by the union of completed loader-cache values and the active
reference. Cache change hooks compare scope identities across old and new maps.
An inactive removed scope is disposed; an active evicted or expired scope stays
pinned until navigation leaves it. Failed or aborted partial scans dispose their
scope and never become completed cache entries. Explicit open, refresh, root
replacement, and reset clear cache timers and advance the generation. Disposal is
idempotent. Worker infrastructure is not shut down by another scope or context.

The preloaded demo/test adapter installs the selected scope synchronously outside
the speculative loader prefix. It uses the same scope factory and directory-only
sidebar projection; injecting a whole fixture tree does not create sibling image
models.

## Verification

Verified in gallery Vitest unit tests on 2026-10-31: warm route model/artifact
identity and no repeated file/metadata/thumbnail work; selected-only preloaded
model creation; distinct shallow/recursive/All membership; progressive immutable
batches; canceled scan recovery; simultaneous contexts; length eviction; actual
five-minute expiry; and active pinning after cache removal. Existing permission,
picker cancellation, missing path, escaped deep link, and sidebar discovery races
remain covered. Browser verification checks native directory enumeration, file
reads, decoder calls, thumbnail blob URLs, history, reload, and ancestor expansion.
