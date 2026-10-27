import { atom, clearStack, context } from '@reatom/core'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { createMockImage, mockFolderTree } from '../__fixtures__/mockData'
import { loadGalleryState } from '../shared/testSetup'
import { currentImages, resetGallerySession } from './collection'
import { lightboxPreloadImageElement } from './lightboxNavigation'
import { lightboxImage, lightboxSizedImageWindowIds } from './lightboxState'

beforeEach(() => clearStack())
afterEach(() => vi.restoreAllMocks())

test('neighbor decoding waits for the selected image and does not request a second original', () =>
  context.start(() => {
    loadGalleryState({
      tree: {
        ...mockFolderTree,
        images: [
          createMockImage({ name: 'a.jpg' }),
          createMockImage({ name: 'b.jpg' }),
        ],
        children: [],
        imageCount: 2,
      },
    })
    const [current, next] = currentImages()
    lightboxImage.set(() => current!)
    lightboxSizedImageWindowIds.set(new Set([current!.id, next!.id]))
    const currentPending = atom(1, 'test.currentPending')
    vi.spyOn(current!.sizedImage, 'pending').mockImplementation(currentPending)
    const neighbor = vi
      .spyOn(next!.sizedImage, 'data')
      .mockReturnValue(undefined)
    const full = vi.spyOn(next!.fullImage, 'data').mockReturnValue(undefined)
    expect(lightboxPreloadImageElement()).toBeNull()
    expect(neighbor).not.toHaveBeenCalled()

    currentPending.set(0)
    expect(lightboxPreloadImageElement()).toBeNull()
    expect(neighbor).toHaveBeenCalledOnce()
    expect(full).not.toHaveBeenCalled()
    lightboxImage.set(null)
    resetGallerySession()
  }))
