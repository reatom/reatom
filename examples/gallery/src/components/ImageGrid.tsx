import { computed } from '@reatom/core'

import {
  bindLoupeDismiss,
  gridColumns,
  imageGrid,
  openFolder,
  viewMode,
  visibleIndexMap,
} from '../model'
import { pack } from '../themeVars'
import { FolderImageTree, VisibleImageSlot } from './FolderImageTree'
import { GridImage } from './GridImage'
import { GridLoupe } from './GridLoupe'
import { SearchIcon } from './Icons'
import { ImageList } from './ImageList'
import { ImageTable } from './ImageTable'

const gridEntryCss = `
  ${pack.container('bauhaus')} {
      [data-mod3] {
        --print-color: var(--bauhaus-red);
        --print-shape: circle(50%);
      }
      [data-mod3='1'] {
        --print-color: var(--bauhaus-blue);
        --print-shape: inset(0);
      }
      [data-mod3='2'] {
        --print-color: var(--bauhaus-yellow);
        --print-shape: polygon(50% 0, 100% 100%, 0 100%);
      }
    }
  ${pack.container('polaroid')} {
      [data-mod5='1'] > [data-gap='medium']:not([data-density='tiny']):not([data-density='micro']),
      [data-mod5='1'] > [data-gap='large']:not([data-density='tiny']):not([data-density='micro']),
      [data-mod5='1'] > [data-gap='xl']:not([data-density='tiny']):not([data-density='micro']) {
        transform: rotate(-0.55deg);
      }
      [data-mod5='3'] > [data-gap='medium']:not([data-density='tiny']):not([data-density='micro']),
      [data-mod5='3'] > [data-gap='large']:not([data-density='tiny']):not([data-density='micro']),
      [data-mod5='3'] > [data-gap='xl']:not([data-density='tiny']):not([data-density='micro']) {
        transform: rotate(0.65deg);
      }
      [data-mod6='1'] > [data-gap]::before,
      [data-mod6='4'] > [data-gap]::before {
        content: '';
        position: absolute;
        top: clamp(1px, calc(var(--item-size, 220px) * 0.02), 3px);
        left: 50%;
        width: min(calc(var(--item-size, 220px) * 0.4), 68px);
        height: min(calc(var(--item-size, 220px) * 0.1), 17px);
        background: linear-gradient(105deg, rgba(255,255,255,.25), transparent 42%), var(--polaroid-tape);
        box-shadow: 0 2px 3px rgba(49, 38, 28, 0.18);
        opacity: 0.94;
        pointer-events: none;
        z-index: 3;
      }
      [data-mod6='1'] > [data-gap][data-density='micro']::before,
      [data-mod6='4'] > [data-gap][data-density='micro']::before {
        display: none;
      }
      [data-mod6='1'] > [data-gap]::before {
        transform: translateX(-50%) rotate(-4deg);
      }
      [data-mod6='4'] > [data-gap]::before {
        transform: translateX(-50%) rotate(5deg);
      }
    }
`

const NoImagesMessage = () => (
  <div
    role="status"
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
    <div css="font-size: 48px; user-select: none;">
      <SearchIcon />
    </div>
    <p css="font-size: 16px; margin: 0; font-weight: 500;">No images found</p>
    <p css="font-size: 14px; margin: 0; color: var(--text-muted);">
      Try adjusting your search or filter settings.
    </p>
  </div>
)

const hasVisibleImages = computed(
  () => visibleIndexMap().size > 0,
  'gallery.hasVisibleImages',
)

export const ImageGrid = () => (
  <div
    ref={(element) => {
      const unbindGrid = imageGrid.ref(element)
      const unbindDismiss = bindLoupeDismiss()
      return () => {
        unbindGrid()
        unbindDismiss()
      }
    }}
    attr:data-view-mode={viewMode}
    attr:data-density={imageGrid.density}
    css:columns={() => {
      const mode = viewMode()
      if (mode === 'list' || mode === 'table') return '1, minmax(0, 1fr)'

      if (gridColumns() === 0) return 'auto-fill, minmax(min(200px, 100%), 1fr)'

      return `${imageGrid.columnCount()}, minmax(0, 1fr)`
    }}
    css:gap={() => `${imageGrid.effectiveGap()}px`}
    css:item-size={() => `${imageGrid.itemSize()}px`}
    css={`
      display: grid;
      grid-template-columns: repeat(var(--columns));
      gap: calc(var(--gap) + var(--shadow-clearance, 0px));
      width: 100%;
      min-width: 0;

      &[data-view-mode='list'] {
        grid-template-columns: minmax(0, 1fr);
      }
      &[data-view-mode='table'] {
        display: flex;
        grid-template-columns: minmax(0, 1fr);
        height: 100%;
        min-height: 0;
      }
      ${gridEntryCss}
    `}
  >
    {() =>
      !hasVisibleImages() && openFolder.pending() === 0 ? (
        <NoImagesMessage />
      ) : null
    }
    {() => {
      if (!hasVisibleImages()) return null

      const mode = viewMode()
      if (mode === 'table') return <ImageTable />

      return (
        <div css="display: contents;">
          {mode === 'list' ? (
            <ImageList />
          ) : (
            <FolderImageTree
              renderImage={(image) => (
                <VisibleImageSlot image={image}>
                  <GridImage image={image} />
                </VisibleImageSlot>
              )}
            />
          )}
        </div>
      )
    }}
    <GridLoupe />
  </div>
)
