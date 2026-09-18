import type { Beam, BeamLabel, Callout, Dimension, Ray } from '../../layout'
import { annotation } from './annotation'

export const rayStyle: Record<
  Ray['role'],
  { stroke: string; dash?: string; width: number }
> = {
  marginal: { stroke: 'var(--glass)', width: 0.9 },
  chief: { stroke: 'var(--accent)', dash: '6 4', width: 0.9 },
  bundle: { stroke: 'var(--ink-faint)', width: 0.7 },
}

export const RayLine = ({ ray }: { ray: Ray }) => {
  const style = rayStyle[ray.role]
  return (
    <svg:polyline
      points={ray.points.map(({ x, y }) => `${x},${y}`).join(' ')}
      fill="none"
      stroke={style.stroke}
      stroke-width={style.width}
      stroke-dasharray={style.dash}
      stroke-opacity={ray.role === 'bundle' ? 0.8 : 1}
    />
  )
}

export const beamFill: Record<Beam['role'], string> = {
  axial: 'var(--glass)',
  corner: 'var(--accent)',
}

export const BeamFan = ({ beam }: { beam: Beam }) => (
  <svg:path d={beam.outline} fill={beamFill[beam.role]} fill-opacity={0.07} />
)

export const BeamTag = ({ tag }: { tag: BeamLabel }) => (
  <svg:text
    x={tag.x}
    y={tag.y}
    text-anchor="end"
    css={`
      ${annotation}
      font-size: 8.5px;
      fill: ${beamFill[tag.role]};
      paint-order: stroke;
      stroke: var(--paper-deep);
      stroke-width: 3px;
      stroke-linejoin: round;
    `}
  >
    {tag.lines.map((line, index) => (
      <svg:tspan x={tag.x} dy={index === 0 ? 0 : 11}>
        {line}
      </svg:tspan>
    ))}
  </svg:text>
)

export const DimensionLine = ({ dimension }: { dimension: Dimension }) => {
  const { from, to, offset, label, orientation } = dimension
  const horizontal = orientation === 'horizontal'
  const lineFrom = horizontal
    ? { x: from.x, y: from.y + offset }
    : { x: from.x + offset, y: from.y }
  const lineTo = horizontal
    ? { x: to.x, y: to.y + offset }
    : { x: to.x + offset, y: to.y }
  const labelX = (lineFrom.x + lineTo.x) / 2
  const labelY = (lineFrom.y + lineTo.y) / 2
  const extension = 6 * Math.sign(offset)

  return (
    <svg:g>
      <svg:line
        x1={from.x}
        y1={from.y}
        x2={horizontal ? from.x : lineFrom.x + extension}
        y2={horizontal ? lineFrom.y + extension : from.y}
        stroke="var(--ink-faint)"
        stroke-width={0.7}
      />
      <svg:line
        x1={to.x}
        y1={to.y}
        x2={horizontal ? to.x : lineTo.x + extension}
        y2={horizontal ? lineTo.y + extension : to.y}
        stroke="var(--ink-faint)"
        stroke-width={0.7}
      />
      <svg:line
        x1={lineFrom.x}
        y1={lineFrom.y}
        x2={lineTo.x}
        y2={lineTo.y}
        stroke="var(--accent)"
        stroke-width={0.9}
        marker-start="url(#arrow)"
        marker-end="url(#arrow)"
      />
      <svg:text
        x={labelX}
        y={labelY}
        text-anchor="middle"
        transform={horizontal ? undefined : `rotate(-90 ${labelX} ${labelY})`}
        dy={horizontal ? (offset > 0 ? 14 : -6) : offset > 0 ? 14 : -5}
        css={`
          ${annotation}
          fill: var(--accent);
        `}
      >
        {label}
      </svg:text>
    </svg:g>
  )
}

export const CalloutLine = ({ callout }: { callout: Callout }) => {
  const direction = callout.align === 'start' ? 1 : -1
  const shelfX = callout.text.x + 12 * direction
  return (
    <svg:g>
      <svg:circle
        cx={callout.anchor.x}
        cy={callout.anchor.y}
        r={1.6}
        fill="var(--ink-dim)"
      />
      <svg:polyline
        points={`${callout.anchor.x},${callout.anchor.y} ${callout.text.x},${callout.text.y + 4} ${shelfX},${callout.text.y + 4}`}
        fill="none"
        stroke="var(--ink-faint)"
        stroke-width={0.7}
      />
      <svg:text
        x={shelfX + 4 * direction}
        y={callout.text.y}
        text-anchor={callout.align}
        css={annotation}
      >
        {callout.label}
      </svg:text>
    </svg:g>
  )
}
