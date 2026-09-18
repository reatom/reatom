import { SHEET_HEIGHT, SHEET_WIDTH } from '../../layout'
import { designation, estimate } from '../../model'
import { bodySpecs, formatSpecs, tierSpecs } from '../../optics'
import { annotation, FRAME_INNER } from './annotation'

export const TitleCell = ({
  x,
  y,
  width,
  height,
  title,
  value,
  strong,
}: {
  x: number
  y: number
  width: number
  height: number
  title: string
  value: string | (() => string)
  strong?: boolean
}) => (
  <svg:g>
    <svg:rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill="none"
      stroke="var(--ink-faint)"
    />
    <svg:text
      x={x + 7}
      y={y + 12}
      css={`
        ${annotation}
        font-size: 7px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        fill: var(--ink-faint);
      `}
    >
      {title}
    </svg:text>
    <svg:text
      x={x + 7}
      y={y + height - 8}
      css={`
        ${annotation}
        font-size: ${strong ? 13 : 10}px;
        fill: ${strong ? 'var(--accent)' : 'var(--ink)'};
      `}
    >
      {value}
    </svg:text>
  </svg:g>
)

export const TitleBlock = () => {
  const columns = [200, 190, 120]
  const width = columns.reduce((sum, column) => sum + column, 0)
  const height = 78
  const x = SHEET_WIDTH - FRAME_INNER - width
  const y = SHEET_HEIGHT - FRAME_INNER - height
  const rowHeight = height / 2
  const columnX = (index: number) =>
    x + columns.slice(0, index).reduce((sum, column) => sum + column, 0)

  return (
    <svg:g>
      <svg:rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="var(--paper)"
        stroke="var(--ink-faint)"
      />
      <TitleCell
        x={columnX(0)}
        y={y}
        width={columns[0]!}
        height={rowHeight}
        title="Designation"
        value={() => `PRIME ${designation()}`}
        strong
      />
      <TitleCell
        x={columnX(1)}
        y={y}
        width={columns[1]!}
        height={rowHeight}
        title="Format · mount"
        value={() =>
          `${formatSpecs[estimate().spec.format].label} · ${estimate().mount.label}`
        }
      />
      <TitleCell
        x={columnX(2)}
        y={y}
        width={columns[2]!}
        height={rowHeight}
        title="Est. mass"
        value={() => `${Math.round(estimate().mass.total / 5) * 5} g`}
        strong
      />
      <TitleCell
        x={columnX(0)}
        y={y + rowHeight}
        width={columns[0]!}
        height={rowHeight}
        title="Envelope Ø × L"
        value={() =>
          `${estimate().barrelDiameter.toFixed(1)} × ${estimate().length.toFixed(1)} mm`
        }
      />
      <TitleCell
        x={columnX(1)}
        y={y + rowHeight}
        width={columns[1]!}
        height={rowHeight}
        title="Design"
        value={() =>
          `${tierSpecs[estimate().spec.tier].label} · ${estimate().elementCount} el / ${estimate().groupCount} gr`
        }
      />
      <TitleCell
        x={columnX(2)}
        y={y + rowHeight}
        width={columns[2]!}
        height={rowHeight}
        title="Body · sheet"
        value={() => `${bodySpecs[estimate().spec.body].label} · 1/1`}
      />
    </svg:g>
  )
}
