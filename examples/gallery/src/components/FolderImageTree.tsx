import { action, effect, reatomLinkedList } from '@reatom/core'
import type { JSX } from '@reatom/jsx'

import {
  folderModelTree,
  type GalleryFolderModel,
  type ImageModel,
  isFolderImagesInCurrentScope,
  visibleIndexMap,
} from '../model'

export const mapFolderImages = <T,>(
  folder: GalleryFolderModel,
  mapImage: (image: ImageModel, folder: GalleryFolderModel) => T,
): T[] => [
  ...folder.sortedImages().map((image) => mapImage(image, folder)),
  ...folder.children.flatMap((child) => mapFolderImages(child, mapImage)),
]

/** Keep mounted image rows while folder snapshots and sort order change. */
export const reatomFolderImageRows = () => {
  const rows = reatomLinkedList(
    (image: ImageModel, folder: GalleryFolderModel) => ({ image, folder }),
    'gallery.imageRows',
  )
  const byImage = new Map<ImageModel, ReturnType<typeof rows.create>>()
  const sync = action(
    (next: Array<{ image: ImageModel; folder: GalleryFolderModel }>) => {
      const present = new Set(next.map(({ image }) => image))
      rows.batch(() => {
        for (const [image, row] of byImage) {
          if (present.has(image)) continue
          rows.remove(row)
          byImage.delete(image)
        }
        let previous: ReturnType<typeof rows.create> | null = null
        for (const { image, folder } of next) {
          let row = byImage.get(image)
          if (!row) {
            row = rows.insertMany([{ image, folder }], previous)[0]!
            byImage.set(image, row)
          } else if (row[rows.LL_PREV] !== previous) {
            rows.move(row, previous)
          }
          previous = row
        }
      })
    },
    'gallery.syncImageRows',
  )

  return {
    rows,
    bind: () => {
      const watcher = effect(() => {
        const tree = folderModelTree()
        sync(
          tree
            ? mapFolderImages(tree, (image, folder) => ({ image, folder }))
            : [],
        )
      }, 'gallery.bindImageRows')
      return () => watcher.unsubscribe()
    },
  }
}

export const FolderImageTree = ({
  renderImage,
}: {
  renderImage: (image: ImageModel, folder: GalleryFolderModel) => JSX.Element
}) => {
  const { rows, bind } = reatomFolderImageRows()
  return (
    <div style:display="contents" ref={bind}>
      {rows.reatomMap(({ image, folder }) => (
        <div
          style:display={() =>
            isFolderImagesInCurrentScope(folder) ? 'contents' : 'none'
          }
        >
          {renderImage(image, folder)}
        </div>
      ))}
    </div>
  )
}

export const VisibleImageSlot = ({
  image,
  css,
  children,
}: {
  image: ImageModel
  css?: string
  children: JSX.ElementChildren
}) => (
  <div
    style:display={() => (image.visible() ? 'contents' : 'none')}
    attr:data-mod3={() => String((visibleIndexMap().get(image) ?? 0) % 3)}
    attr:data-mod5={() => String((visibleIndexMap().get(image) ?? 0) % 5)}
    attr:data-mod6={() => String((visibleIndexMap().get(image) ?? 0) % 6)}
    css={css}
  >
    {children}
  </div>
)
