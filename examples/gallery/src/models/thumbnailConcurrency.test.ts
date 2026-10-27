import { expect, test } from 'vitest'

import {
  acquireThumbnailSlot,
  maxParallelThumbnails,
} from './thumbnailConcurrency'

test('queued promotion takes effect without restarting active leases', async () => {
  const active = await Promise.all(
    Array.from({ length: maxParallelThumbnails }, () =>
      acquireThumbnailSlot(new AbortController().signal),
    ),
  )
  active.forEach((lease) => lease.start())
  let priority: 'background' | 'high' = 'background'
  const order: string[] = []
  const first = acquireThumbnailSlot(
    new AbortController().signal,
    'background',
  ).then((lease) => {
    order.push('background')
    return lease
  })
  const promoted = acquireThumbnailSlot(
    new AbortController().signal,
    () => priority,
  ).then((lease) => {
    order.push('promoted')
    return lease
  })
  priority = 'high'
  active[0]!.release()
  const promotedLease = await promoted
  expect(order).toEqual(['promoted'])
  promotedLease.release()
  const firstLease = await first
  expect(order).toEqual(['promoted', 'background'])
  firstLease.release()
  active.forEach((lease) => lease.release())
})
