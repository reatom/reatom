import { gridColumns, gridGap, imageGrid, viewMode, visibleIndexMap } from '../model'
import { themeCss } from '../themeCss'
import { GRID_GAP_VALUES } from '../types'
import { FolderImageTree, PreviewBoundImage } from './FolderImageTree'
import { GridImage } from './GridImage'
import { SearchIcon } from './Icons'
import { ImageList } from './ImageList'
import { ImageTable } from './ImageTable'

const gridEntryCss = `
  ${themeCss(
    'bauhaus',
    `
      --print-color: var(--bauhaus-red);
      --print-shape: circle(50%);
      &:nth-child(3n + 2) {
        --print-color: var(--bauhaus-blue);
        --print-shape: inset(0);
      }
      &:nth-child(3n) {
        --print-color: var(--bauhaus-yellow);
        --print-shape: polygon(50% 0, 100% 100%, 0 100%);
      }
    `,
  )}
  ${themeCss(
    'polaroid',
    `
      &:nth-child(5n + 2) > [data-gap='medium'],
      &:nth-child(5n + 2) > [data-gap='large'],
      &:nth-child(5n + 2) > [data-gap='xl'] {
        transform: rotate(-0.55deg);
      }
      &:nth-child(5n + 4) > [data-gap='medium'],
      &:nth-child(5n + 4) > [data-gap='large'],
      &:nth-child(5n + 4) > [data-gap='xl'] {
        transform: rotate(0.65deg);
      }
      &:nth-child(6n + 2) > [data-gap]::before,
      &:nth-child(6n + 5) > [data-gap]::before {
        content: '';
        position: absolute;
        top: 3px;
        left: 50%;
        width: 68px;
        height: 17px;
        background: linear-gradient(105deg, rgba(255,255,255,.25), transparent 42%), var(--polaroid-tape);
        box-shadow: 0 2px 3px rgba(49, 38, 28, 0.18);
        opacity: 0.94;
        pointer-events: none;
        z-index: 3;
      }
      &:nth-child(6n + 2) > [data-gap]::before {
        transform: translateX(-50%) rotate(-4deg);
      }
      &:nth-child(6n + 5) > [data-gap]::before {
        transform: translateX(-50%) rotate(5deg);
      }
    `,
  )}
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

export const ImageGrid = () => (
  <div
    ref={imageGrid.ref}
    attr:data-view-mode={viewMode}
    css:columns={() => {
      const mode = viewMode()
      if (mode === 'list' || mode === 'table') return '1, minmax(0, 1fr)'

      const cols = gridColumns()
      return cols === 0
        ? 'auto-fill, minmax(min(200px, 100%), 1fr)'
        : `${cols}, minmax(0, 1fr)`
    }}
    css:gap={() => `${GRID_GAP_VALUES[gridGap()]}px`}
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
    `}
  >
    {() => (visibleIndexMap().size === 0 ? <NoImagesMessage /> : null)}
    {() => {
      if (visibleIndexMap().size === 0) return null

      const mode = viewMode()
      if (mode === 'table') return <ImageTable />

      return (
        <div css="display: contents;">
          {mode === 'list' ? (
            <ImageList />
          ) : (
            <FolderImageTree
              renderImage={(image, folder) => (
                <PreviewBoundImage
                  image={image}
                  folder={folder}
                  css={gridEntryCss}
                >
                  <GridImage image={image} />
                </PreviewBoundImage>
              )}
            />
          )}
        </div>
      )
    }}
  </div>
)
