import { SHEET_HEIGHT, SHEET_WIDTH } from '../../layout'
import {
  annotation,
  FRAME_INNER,
  FRAME_INSET,
  ZONE_COLUMNS,
  ZONE_ROWS,
  zoneLetters,
} from './annotation'

export const Frame = () => {
  const columnWidth = (SHEET_WIDTH - FRAME_INSET * 2) / ZONE_COLUMNS
  const rowHeight = (SHEET_HEIGHT - FRAME_INSET * 2) / ZONE_ROWS

  return (
    <svg:g aria-hidden="true">
      <svg:rect
        x={FRAME_INSET}
        y={FRAME_INSET}
        width={SHEET_WIDTH - FRAME_INSET * 2}
        height={SHEET_HEIGHT - FRAME_INSET * 2}
        fill="none"
        stroke="var(--ink-faint)"
        stroke-width={1}
      />
      <svg:rect
        x={FRAME_INNER}
        y={FRAME_INNER}
        width={SHEET_WIDTH - FRAME_INNER * 2}
        height={SHEET_HEIGHT - FRAME_INNER * 2}
        fill="none"
        stroke="var(--hairline)"
        stroke-width={1}
      />

      {Array.from({ length: ZONE_COLUMNS }, (_, index) => {
        const x = FRAME_INSET + columnWidth * index
        const centerX = x + columnWidth / 2
        return (
          <svg:g>
            <svg:line
              x1={x}
              y1={FRAME_INSET}
              x2={x}
              y2={FRAME_INNER}
              stroke="var(--ink-faint)"
            />
            <svg:line
              x1={x}
              y1={SHEET_HEIGHT - FRAME_INNER}
              x2={x}
              y2={SHEET_HEIGHT - FRAME_INSET}
              stroke="var(--ink-faint)"
            />
            <svg:text
              x={centerX}
              y={FRAME_INSET + 6.5}
              text-anchor="middle"
              css={`
                ${annotation}
                font-size: 7px;
                fill: var(--ink-faint);
              `}
            >
              {index + 1}
            </svg:text>
            <svg:text
              x={centerX}
              y={SHEET_HEIGHT - FRAME_INSET - 2.5}
              text-anchor="middle"
              css={`
                ${annotation}
                font-size: 7px;
                fill: var(--ink-faint);
              `}
            >
              {index + 1}
            </svg:text>
          </svg:g>
        )
      })}

      {zoneLetters.map((letter, index) => {
        const y = FRAME_INSET + rowHeight * index
        const centerY = y + rowHeight / 2 + 2.5
        return (
          <svg:g>
            <svg:line
              x1={FRAME_INSET}
              y1={y}
              x2={FRAME_INNER}
              y2={y}
              stroke="var(--ink-faint)"
            />
            <svg:line
              x1={SHEET_WIDTH - FRAME_INNER}
              y1={y}
              x2={SHEET_WIDTH - FRAME_INSET}
              y2={y}
              stroke="var(--ink-faint)"
            />
            <svg:text
              x={FRAME_INSET + 4}
              y={centerY}
              text-anchor="middle"
              css={`
                ${annotation}
                font-size: 7px;
                fill: var(--ink-faint);
              `}
            >
              {letter}
            </svg:text>
            <svg:text
              x={SHEET_WIDTH - FRAME_INSET - 4}
              y={centerY}
              text-anchor="middle"
              css={`
                ${annotation}
                font-size: 7px;
                fill: var(--ink-faint);
              `}
            >
              {letter}
            </svg:text>
          </svg:g>
        )
      })}
    </svg:g>
  )
}
