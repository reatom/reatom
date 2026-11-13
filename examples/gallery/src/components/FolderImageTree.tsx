import { action, effect, reatomLinkedList } from '@reatom/core'
import type { JSX } from '@reatom/jsx'

import { currentImages, type ImageModel, visibleIndexMap } from '../model'

/** Keep mounted image rows while folder snapshots and sort order change. */
export const reatomFolderImageRows = () => {
  const rows = reatomLinkedList(
    (image: ImageModel) => ({ image }),
    'gallery.imageRows',
  )
  const byImage = new Map<ImageModel, ReturnType<typeof rows.create>>()
  const sync = action((next: ImageModel[]) => {
    const present = new Set(next)
    rows.batch(() => {
      for (const [image, row] of byImage) {
        if (present.has(image)) continue
        rows.remove(row)
        byImage.delete(image)
      }
      let previous: ReturnType<typeof rows.create> | null = null
      for (const image of next) {
        let row = byImage.get(image)
        if (!row) {
          row = rows.insertMany([{ image }], previous)[0]!
          byImage.set(image, row)
        } else if (row[rows.LL_PREV] !== previous) {
          rows.move(row, previous)
        }
        previous = row
      }
    })
  }, 'gallery.syncImageRows')

  return {
    rows,
    bind: () => {
      const watcher = effect(() => {
        sync(currentImages())
      }, 'gallery.bindImageRows')
      return () => watcher.unsubscribe()
    },
  }
}

export const FolderImageTree = ({
  renderImage,
}: {
  renderImage: (image: ImageModel) => JSX.Element
}) => {
  const { rows, bind } = reatomFolderImageRows()
  return (
    <div style:display="contents" ref={bind}>
      {rows.reatomMap(({ image }) => (
        <div style:display="contents">{renderImage(image)}</div>
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
