import type { Meta, StoryObj } from '@storybook/html'
import { waitFor } from '@testing-library/dom'
import { expect } from 'storybook/test'

import { Button } from '../design-system'
import { createMockImage, mockEmptyFolder } from '../__fixtures__/mockData'
import {
  currentImages,
  folderTree,
  openFolder,
  publishFolderScan,
  resetOpenedFolder,
  sortField,
  sortOrder,
  viewMode,
} from '../model'
import { StoryWrapper } from '../shared/StoryWrapper'
import { createMyself, type Locator } from '../shared/test'
import { loadGalleryState } from '../shared/testSetup'
import type { ViewMode } from '../types'
import { ImageGrid } from './ImageGrid'
import { GalleryWorkspace } from './GalleryWorkspace'

const loc = {
  firstImage: (canvas) => canvas.findByRole('img', { name: 'b.png' }),
  appendBatch: (canvas) =>
    canvas.findByRole('button', { name: 'Parse next batch' }),
  reverseOrder: (canvas) =>
    canvas.findByRole('button', { name: 'Reverse order' }),
  upgradeQuality: (canvas) =>
    canvas.findByRole('button', { name: 'Upgrade image quality' }),
} satisfies Record<string, Locator>

const I = createMyself((I) => ({
  seeDecodedImage: async () => {
    const image = (await I.see(loc.firstImage)) as HTMLImageElement
    await waitFor(() => expect(image.naturalWidth).toBeGreaterThan(0))
    return image
  },
  parseNextBatch: () => I.click(loc.appendBatch),
  reverseOrder: () => I.click(loc.reverseOrder),
  upgradeQuality: () => I.click(loc.upgradeQuality),
  seeSameDecodedImage: async (original: HTMLImageElement) => {
    // Identity is intentional: remounting an identical URL restarts lazy image
    // presentation and was the source of flicker on every parsing batch.
    await waitFor(async () => {
      await expect(await I.resolveLocator(loc.firstImage)).toBe(original)
      await expect(original.naturalWidth).toBeGreaterThan(0)
      await expect(original).toBeInTheDocument()
    })
  },
}))

const meta: Meta = {
  title: 'Regression/ProgressiveImages',
  loaders: [(ctx) => void I.init(ctx)],
}
export default meta

type Story = StoryObj

function image(name: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 24
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'teal'
  ctx.fillRect(0, 0, 32, 24)
  const bytes = Uint8Array.from(
    atob(canvas.toDataURL().split(',')[1]!),
    (char) => char.charCodeAt(0),
  )
  const file = new File([bytes], name, { type: 'image/png' })
  const fileHandle = {
    kind: 'file',
    name,
    getFile: () => Promise.resolve(file),
    isSameEntry: () => Promise.resolve(false),
  } as unknown as FileSystemFileHandle
  return createMockImage({ name, fileHandle, type: file.type, size: file.size })
}

function progressiveStory(mode: ViewMode): Story {
  return {
    render: () => {
      loadGalleryState({
        tree: { ...mockEmptyFolder, images: [image('b.png')], imageCount: 1 },
      })
      viewMode.set(mode)
      sortField.setName()
      sortOrder.setAsc()
      let batch = 0
      return (
        <StoryWrapper>
          <Button
            label="Parse next batch"
            onClick={() => {
              const tree = folderTree()!
              // The first append also changes the position of the existing image.
              const images = [
                ...tree.images,
                image(`${batch++ === 0 ? 'a' : 'c'}.png`),
              ]
              publishFolderScan({
                tree: { ...tree, images, imageCount: images.length },
              })
            }}
          />
          <Button label="Reverse order" onClick={() => sortOrder.setDesc()} />
          <Button
            label="Upgrade image quality"
            onClick={() => {
              const canvas = document.createElement('canvas')
              canvas.width = 64
              canvas.height = 48
              const ctx = canvas.getContext('2d')!
              ctx.fillStyle = 'teal'
              ctx.fillRect(0, 0, 64, 48)
              const model = currentImages().find(
                (image) => image.source.name === 'b.png',
              )!
              model.thumbnail.data.set({
                url: canvas.toDataURL(),
                width: 64,
                height: 48,
                source: 'generated',
              })
            }}
          />
          <ImageGrid />
        </StoryWrapper>
      )
    },
    play: async () => {
      const original = await I.seeDecodedImage()
      await I.parseNextBatch()
      await I.seeSameDecodedImage(original)
      await I.parseNextBatch()
      await I.seeSameDecodedImage(original)
      await I.reverseOrder()
      await I.seeSameDecodedImage(original)
      const previewUrl = original.src
      await I.upgradeQuality()
      await I.seeSameDecodedImage(original)
      await expect(original.src).not.toBe(previewUrl)
      await waitFor(() => expect(original.naturalWidth).toBe(64))
    },
  }
}

export const GridKeepsDecodedImages = progressiveStory('grid')
export const ListKeepsDecodedImages = progressiveStory('list')
export const TableKeepsDecodedImages = progressiveStory('table')

export const FirstThumbnailWhileScanning1200Files: Story = {
  render: () => {
    loadGalleryState({ tree: mockEmptyFolder })
    const resume: Array<() => void> = []
    const gates = [0, 65, 129].map(
      () =>
        new Promise<void>((resolve) => {
          resume.push(resolve)
        }),
    )
    const first = image('b.png')
    const root = {
      ...mockEmptyFolder.handle,
      values: async function* () {
        await gates[0]
        yield first.fileHandle
        for (let index = 1; index < 1200; index++) {
          if (index === 65) await gates[1]
          if (index === 129) await gates[2]
          yield {
            ...first.fileHandle,
            name: `scan-${String(index).padStart(4, '0')}.png`,
          }
        }
      },
    } as FileSystemDirectoryHandle
    return (
      <StoryWrapper>
        <Button
          label="Open 1200 images"
          onClick={() => {
            void openFolder(root)
          }}
        />
        <Button label="Continue parsing" onClick={() => resume.shift()?.()} />
        <Button label="Stop parsing" onClick={resetOpenedFolder} />
        <output aria-label="Scan state">
          {() => (openFolder.pending() ? 'Parsing' : 'Complete')}
        </output>
        <output aria-label="Parsed images">
          {() => folderTree()?.imageCount ?? 0}
        </output>
        <GalleryWorkspace />
      </StoryWrapper>
    )
  },
  play: async () => {
    await I.click((canvas) =>
      canvas.findByRole('button', { name: 'Open 1200 images' }),
    )
    const loading = await I.see((canvas) =>
      canvas.findByRole('status', { name: 'Scanning folder' }),
    )
    await expect(loading.parentElement).toHaveAttribute(
      'id',
      'gallery-folder-count',
    )
    await expect(loading.parentElement).toHaveTextContent('0 images')
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const animations = loading.getAnimations()
      await expect(animations).toHaveLength(1)
      await expect(animations[0]!.playState).toBe('running')
      const initialTransform = getComputedStyle(loading).transform
      await waitFor(() =>
        expect(getComputedStyle(loading).transform).not.toBe(initialTransform),
      )
    }
    await I.dontSee((canvas) => canvas.queryByText('No images found'))
    await I.click((canvas) =>
      canvas.findByRole('button', { name: 'Continue parsing' }),
    )
    const original = await I.seeDecodedImage()
    await I.seeText((canvas) => canvas.findByLabelText('Scan state'), 'Parsing')
    const parsed = await I.see((canvas) =>
      canvas.findByLabelText('Parsed images'),
    )
    const firstCount = Number(parsed.textContent)
    await expect(firstCount).toBeGreaterThan(0)
    await expect(firstCount).toBeLessThanOrEqual(65)
    await I.click((canvas) =>
      canvas.findByRole('button', { name: 'Continue parsing' }),
    )
    await waitFor(async () => {
      await expect(Number(parsed.textContent)).toBeGreaterThan(65)
    })
    await I.seeText((canvas) => canvas.findByLabelText('Scan state'), 'Parsing')
    await I.seeSameDecodedImage(original)
    await I.see((canvas) =>
      canvas.findByRole('status', { name: 'Scanning folder' }),
    )
    await I.click((canvas) =>
      canvas.findByRole('button', { name: 'Stop parsing' }),
    )
    await waitFor(async () =>
      I.dontSee((canvas) =>
        canvas.queryByRole('status', { name: 'Scanning folder' }),
      ),
    )
  },
}
