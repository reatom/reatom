import { SHEET_HEIGHT, SHEET_WIDTH } from '../layout'
import { blueprint } from '../model'
import { t } from '../translations'
import { annotation, FRAME_INNER } from './sheet/annotation'
import { Defs } from './sheet/Defs'
import { Drawing } from './sheet/Drawing'
import { Frame } from './sheet/Frame'
import { TitleBlock } from './sheet/TitleBlock'

const legendItems = [
  { key: 'glass', color: 'var(--glass)', text: t.sheet.legend.element },
  { key: 'metal', color: 'var(--ink)', text: t.sheet.legend.barrel },
  { key: 'iris', color: 'var(--accent)', text: t.sheet.legend.iris },
  { key: 'axial', color: 'var(--glass)', text: t.sheet.legend.axial },
  {
    key: 'chief',
    color: 'var(--accent)',
    text: t.sheet.legend.corner,
  },
].map((item) => ({
  ...item,
  width: Math.max(88, 36 + item.text.length * 6.2),
}))

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
      aria-label={t.sheet.aria}
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
