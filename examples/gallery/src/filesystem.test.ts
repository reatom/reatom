import { action, clearStack, context, withAbort, wrap } from '@reatom/core'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { createMockDirHandle } from './__fixtures__/fixtureLoader'
import { createMockImage } from './__fixtures__/mockData'
import { scanDirectoryRecursive } from './filesystem'
import type { FolderNode } from './types'

beforeEach(() => clearStack())
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('fast enumeration starts a preview immediately and bounds later render batches', () => {
  const frames: FrameRequestCallback[] = []
  const batches: FolderNode[] = []
  let visited = 0
  vi.spyOn(performance, 'now').mockReturnValue(0)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback)
    return frames.length
  })
  const root = Object.assign(createMockDirHandle('Root'), {
    values: async function* () {
      for (let index = 0; index < 70; index++) {
        visited++
        yield createMockImage({ name: `image-${index}.jpg` }).fileHandle
      }
    },
  })
  const scan = action(
    () =>
      scanDirectoryRecursive(root, {
        onBatch: ({ tree }) => batches.push(tree),
      }),
    'test.scan',
  ).extend(withAbort())

  return context.start(async () => {
    const result = scan()
    await wrap(vi.waitFor(() => expect(frames).toHaveLength(1)))
    expect(visited).toBe(1)
    expect(batches.map((tree) => tree.imageCount)).toEqual([1])

    // The first rendering opportunity must not resume enumeration.
    frames.shift()!(0)
    await wrap(vi.waitFor(() => expect(frames).toHaveLength(1)))
    expect(visited).toBe(1)
    frames.shift()!(0)
    await wrap(vi.waitFor(() => expect(batches).toHaveLength(2)))
    expect(visited).toBe(65)
    expect(batches.map((tree) => tree.imageCount)).toEqual([1, 65])
    expect(batches[0]!.images).toHaveLength(1)

    frames.shift()!(0)
    await wrap(vi.waitFor(() => expect(frames).toHaveLength(1)))
    expect(visited).toBe(65)
    frames.shift()!(0)
    expect((await wrap(result)).tree.images).toHaveLength(70)
  })
})
