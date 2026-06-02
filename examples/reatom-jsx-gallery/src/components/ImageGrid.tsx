import { gridColumns, gridGap, imagesList, visibleIndexMap } from '../model'
import { GRID_GAP_VALUES } from '../types'
import { GridImage } from './GridImage'

const gridImagesView = imagesList.reatomMap(
  (imageNode) =>
    <div>{() => imageNode.visible() && <GridImage image={imageNode} />}</div>,
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
    css:columns={() => {
      const cols = gridColumns()
      return cols === 0 ? 'auto-fill, minmax(200px, 1fr)' : `${cols}, 1fr`
    }}
    css:gap={() => `${GRID_GAP_VALUES[gridGap()]}px`}
    css={`
      display: grid;
      grid-template-columns: repeat(var(--columns));
      gap: var(--gap);
    `}
  >
    {() => (visibleIndexMap().size === 0 ? <NoImagesMessage /> : null)}
    <div css="display: contents;">{gridImagesView}</div>
  </div>
)
