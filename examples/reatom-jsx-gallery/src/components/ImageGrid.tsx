import { atom, computed, reatomObservable } from '@reatom/core'

import { gridColumns, gridGap, imagesList, visibleIndexMap } from '../model'
import { GRID_GAP_VALUES } from '../types'
import { GridImage } from './GridImage'

const AUTO_COLUMN_MIN_SIZE = 200

const imageGrid = atom<HTMLElement | null>(null, 'imageGrid').extend((target) => {
  const width = reatomObservable(
    () => ({
      initState: 0,
      getState: () => {
        const element = target()
        return element ? Math.ceil(element.getBoundingClientRect().width) : 0
      },
      subscribe: (fn) => {
        let observer: ResizeObserver | undefined

        const readWidth = () => {
          const element = target()
          return element ? Math.ceil(element.getBoundingClientRect().width) : 0
        }

        const observeElement = () => {
          observer?.disconnect()
          observer = undefined

          const element = target()
          if (!element) return

          fn(readWidth())
          observer = new ResizeObserver(() => fn(readWidth()))
          observer.observe(element)
        }

        observeElement()
        const stopElementSubscription = target.subscribe(observeElement)

        return () => {
          stopElementSubscription()
          observer?.disconnect()
        }
      },
    }),
    `${target.name}.width`,
  )

  const itemSize = computed(() => {
    const gridWidth = width()
    const gap = GRID_GAP_VALUES[gridGap()]
    const configuredColumns = gridColumns()
    const columns =
      configuredColumns === 0
        ? Math.max(1, Math.floor((gridWidth + gap) / (AUTO_COLUMN_MIN_SIZE + gap)))
        : configuredColumns

    return Math.max(0, Math.ceil((gridWidth - gap * (columns - 1)) / columns))
  }, `${target.name}.itemSize`)

  return {
    width,
    itemSize,
    ref: (element: HTMLElement) => {
      target.set(element)
      return () => target.set(null)
    },
  }
})

const gridImagesView = imagesList.reatomMap(
  (imageNode) =>
    <div css="display: contents;">
      {() =>
        imageNode.visible() && (
          <GridImage image={imageNode} renderedSize={imageGrid.itemSize} />
        )
      }
    </div>,
  'imagesList.gridView',
)

const NoImagesMessage = () => (
  <div
    css={`
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      color: var(--text-secondary);
      gap: 12px;
    `}
  >
    <div css="font-size: 48px; user-select: none;">🔍</div>
    <p css="font-size: 16px; margin: 0; font-weight: 500;">No images found</p>
    <p css="font-size: 14px; margin: 0; color: var(--text-muted);">
      Try adjusting your search or filter settings.
    </p>
  </div>
)

export const ImageGrid = () => (
  <div
    ref={imageGrid.ref}
    css:columns={() => {
      const cols = gridColumns()
      return cols === 0
        ? 'auto-fill, minmax(min(200px, 100%), 1fr)'
        : `${cols}, minmax(0, 1fr)`
    }}
    css:gap={() => `${GRID_GAP_VALUES[gridGap()]}px`}
    css={`
      display: grid;
      grid-template-columns: repeat(var(--columns));
      gap: var(--gap);
      width: 100%;
      min-width: 0;
    `}
  >
    {() => (visibleIndexMap().size === 0 ? <NoImagesMessage /> : null)}
    <div css="display: contents;">{gridImagesView}</div>
  </div>
)
