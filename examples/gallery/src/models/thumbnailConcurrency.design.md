# Thumbnail admission

The gallery has one production caller of `acquireThumbnailSlot`, in `reatomImage`.
Its priority used to be captured when enqueued, so promoting an image could leave
it behind background jobs. File and preview metadata reads also began before
priority, measurement, and queue admission.

Constraints: preserve dependency tracking for thumbnail options, preserve active
native decoder leases, and avoid restarting active decodes to promote queued work.

Three directions were considered: keeping static priority leaves the race;
subscribing each queued job to priority requires a separate cleanup protocol;
sampling a bound priority reader when the existing native queue admits a job
updates ordering without new observers or interrupting active work. The last
option is implemented. String priorities remain supported for ordinary callers.
Ties preserve FIFO order. Canceled entries are removed before readers run.
`bind` retains the image's Reatom context when native completion releases a lease.

No new scheduler abstraction is needed. The existing array queue owns admission;
Reatom owns demand and cancellation. Thumbnail option dependencies are captured
synchronously, while immutable-source queries start only after admission. Demand
is rechecked before starting a lease because it can disappear while queued.

Verified on 2026-10-27 with gallery Vitest tests: queue promotion, promotion after
an external timer releases a lease, deferred file IO, and late artifact disposal.
