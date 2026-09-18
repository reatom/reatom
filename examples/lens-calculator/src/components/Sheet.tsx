import { SHEET_HEIGHT, SHEET_WIDTH } from '../layout'
import { blueprint } from '../model'
import { annotation, FRAME_INNER } from './sheet/annotation'
import { Defs } from './sheet/Defs'
import { Drawing } from './sheet/Drawing'
import { Frame } from './sheet/Frame'
import { TitleBlock } from './sheet/TitleBlock'

const legendItems = [
  { key: 'glass', color: 'var(--glass)', text: 'element', width: 92 },
  { key: 'metal', color: 'var(--ink)', text: 'barrel section', width: 128 },
  { key: 'iris', color: 'var(--accent)', text: 'iris · dimension', width: 140 },
  { key: 'axial', color: 'var(--glass)', text: 'axial beam', width: 110 },
  {
    key: 'chief',
    color: 'var(--accent)',
    text: 'corner beam · chief ray dashed',
    width: 200,
  },
] as const

const Legend = () => (
  <svg:g>
    {legendItems.map(({ key, color, text }, index) => {
      const x =
        FRAME_INNER +
        16 +
        legendItems.slice(0, index).reduce((sum, item) => sum + item.width, 0)
      const y = FRAME_INNER + 22
      return (
        <svg:g>
          <svg:line
            x1={x}
            y1={y}
            x2={x + 18}
            y2={y}
            stroke={color}
            stroke-width={key === 'iris' ? 2.2 : 1}
            stroke-dasharray={key === 'chief' ? '4 3' : undefined}
          />
          <svg:text
            x={x + 24}
            y={y + 3.5}
            css={`
              ${annotation}
              font-size: 8.5px;
              fill: var(--ink-faint);
            `}
          >
            {text}
          </svg:text>
        </svg:g>
      )
    })}
  </svg:g>
)

export const Sheet = () => (
  <figure
    css={`
      position: relative;
      margin: 0;
      border: 1px solid var(--hairline);
      background: var(--paper-deep);
      overflow-x: auto;
      animation: prime-rise 500ms 160ms ease-out backwards;
    `}
  >
    <svg:svg
      viewBox={`0 0 ${SHEET_WIDTH} ${SHEET_HEIGHT}`}
      role="img"
      aria-label="Cross-section of the estimated lens"
      css={`
        display: block;
        width: 100%;
        min-width: 40rem;
        height: auto;
      `}
    >
      <Defs />
      <Frame />
      <Legend />
      {() => <Drawing plan={blueprint()} />}
      <TitleBlock />
    </svg:svg>
  </figure>
)
