import type { Blueprint } from '../../layout'
import { annotation } from './annotation'
import { BeamFan, BeamTag, CalloutLine, DimensionLine, RayLine } from './Marks'

export const Drawing = ({ plan }: { plan: Blueprint }) => (
  <svg:g>
    <svg:line
      x1={plan.frontFaceX - 48}
      y1={plan.axisY}
      x2={plan.imageX + 40}
      y2={plan.axisY}
      stroke="var(--ink-faint)"
      stroke-width={0.8}
      stroke-dasharray="20 4 3 4"
    />

    {plan.beams.map((beam) => (
      <BeamFan beam={beam} />
    ))}
    {plan.rays.map((ray) => (
      <RayLine ray={ray} />
    ))}
    {plan.beamLabels.map((tag) => (
      <BeamTag tag={tag} />
    ))}

    <svg:path
      d={plan.barrelPath}
      fill="url(#hatch-metal)"
      stroke="var(--ink)"
      stroke-width={1}
      stroke-linejoin="miter"
    />
    <svg:path
      d={plan.focusRingPath}
      stroke="var(--ink-dim)"
      stroke-width={0.8}
    />
    <svg:path
      d={plan.mountPath}
      fill="url(#hatch-metal)"
      stroke="var(--ink)"
      stroke-width={1}
    />

    {plan.elements.map((element) => (
      <svg:path
        d={element.path}
        fill="url(#hatch-glass)"
        stroke="var(--glass)"
        stroke-width={element.cementedWithPrevious ? 0.7 : 1}
        stroke-linejoin="round"
      />
    ))}

    <svg:path
      d={plan.iris.housing}
      fill="var(--paper-deep)"
      stroke="var(--ink)"
      stroke-width={0.9}
    />
    {plan.iris.leaves.map((leaf) => (
      <svg:path
        d={leaf}
        fill="var(--accent)"
        stroke="var(--paper-deep)"
        stroke-width={0.6}
        stroke-linejoin="round"
      />
    ))}

    <svg:line
      x1={plan.imagePlane.x}
      y1={plan.axisY - plan.imagePlane.halfHeight}
      x2={plan.imagePlane.x}
      y2={plan.axisY + plan.imagePlane.halfHeight}
      stroke="var(--ink)"
      stroke-width={2.2}
    />
    <svg:line
      x1={plan.imagePlane.x}
      y1={plan.axisY - plan.imagePlane.halfHeight - 26}
      x2={plan.imagePlane.x}
      y2={plan.axisY + plan.imagePlane.halfHeight + 26}
      stroke="var(--ink-faint)"
      stroke-width={0.7}
      stroke-dasharray="2 3"
    />

    {plan.dimensions.map((dimension) => (
      <DimensionLine dimension={dimension} />
    ))}

    {plan.callouts.map((callout) => (
      <CalloutLine callout={callout} />
    ))}

    <svg:g>
      <svg:line
        x1={plan.scaleBar.x}
        y1={plan.scaleBar.y}
        x2={plan.scaleBar.x + plan.scaleBar.width}
        y2={plan.scaleBar.y}
        stroke="var(--ink)"
        stroke-width={1}
      />
      <svg:line
        x1={plan.scaleBar.x}
        y1={plan.scaleBar.y - 4}
        x2={plan.scaleBar.x}
        y2={plan.scaleBar.y + 4}
        stroke="var(--ink)"
      />
      <svg:line
        x1={plan.scaleBar.x + plan.scaleBar.width}
        y1={plan.scaleBar.y - 4}
        x2={plan.scaleBar.x + plan.scaleBar.width}
        y2={plan.scaleBar.y + 4}
        stroke="var(--ink)"
      />
      <svg:text
        x={plan.scaleBar.x + plan.scaleBar.width + 8}
        y={plan.scaleBar.y + 3.5}
        css={annotation}
      >
        {plan.scaleBar.label}
      </svg:text>
    </svg:g>
  </svg:g>
)
