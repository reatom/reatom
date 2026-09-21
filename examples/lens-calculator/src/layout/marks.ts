import type { LensEstimate } from '../optics'
import { t } from '../translations'
import type { DrawingFrame } from './frame'
import type { HardwareLayout } from './hardware'
import { formatMm, polyline } from './paths'
import {
  type Beam,
  type BeamLabel,
  type Callout,
  type Dimension,
  DRAW_LEFT,
  type Ray,
  SHEET_HEIGHT,
  SHEET_WIDTH,
} from './types'

export interface MarkLayout {
  beams: Beam[]
  beamLabels: BeamLabel[]
  rays: Ray[]
  dimensions: Dimension[]
  callouts: Callout[]
  scaleBar: { x: number; y: number; width: number; label: string }
}

export const layoutMarks = (
  estimate: LensEstimate,
  frame: DrawingFrame,
  hardware: HardwareLayout,
): MarkLayout => {
  const {
    entrancePupil,
    pupilDepth,
    halfFieldDeg,
    filterThread,
    stopDiameter,
    barrelDiameter,
    length,
    mount,
    format,
    spec: { vignetting },
  } = estimate
  const { mm, axisY } = frame
  const {
    frontFaceX,
    frontX,
    mountX,
    imageX,
    stopX,
    outerR,
    frontR,
    imageHalf,
    slotOuterR,
  } = hardware

  /**
   * Paraxial sketch, not a trace: two beams drawn as straight fans through the
   * iris. The axial beam fills the entrance pupil and lands on the image
   * centre; the corner beam aims at the pupil `pupilDepth` behind the front
   * vertex and lands on the image corner, so it enters off centre by the same
   * amount that sized the front element.
   */
  const pupilR = mm(entrancePupil / 2)
  const stopR = mm(stopDiameter / 2)
  const halfFieldRad = (halfFieldDeg * Math.PI) / 180
  const chiefEntryY = axisY - mm(pupilDepth) * Math.sin(halfFieldRad)
  const clampToRim = (y: number) =>
    axisY + Math.max(-frontR, Math.min(frontR, y - axisY))

  const axialTop = { x: frontX, y: axisY - pupilR }
  const axialBottom = { x: frontX, y: axisY + pupilR }
  const stopTop = { x: stopX, y: axisY - stopR }
  const stopBottom = { x: stopX, y: axisY + stopR }
  const imageCentre = { x: imageX, y: axisY }
  const imageCorner = { x: imageX, y: axisY + imageHalf }
  const cornerUpper = { x: frontX, y: clampToRim(chiefEntryY - pupilR) }
  const cornerLower = { x: frontX, y: clampToRim(chiefEntryY + pupilR) }

  const beams: Beam[] = [
    {
      role: 'axial',
      outline: polyline(
        [axialTop, stopTop, imageCentre, stopBottom, axialBottom],
        true,
      ),
    },
    {
      role: 'corner',
      outline: polyline(
        [cornerUpper, stopTop, imageCorner, stopBottom, cornerLower],
        true,
      ),
    },
  ]

  const rays: Ray[] = [
    { role: 'marginal', points: [axialTop, stopTop, imageCentre] },
    { role: 'marginal', points: [axialBottom, stopBottom, imageCentre] },
    {
      role: 'chief',
      points: [
        { x: frontX, y: clampToRim(chiefEntryY) },
        { x: stopX, y: axisY },
        imageCorner,
      ],
    },
    { role: 'bundle', points: [cornerUpper, stopTop, imageCorner] },
    { role: 'bundle', points: [cornerLower, stopBottom, imageCorner] },
  ]

  const beamLabels: BeamLabel[] = [
    {
      role: 'axial',
      x: imageX - 8,
      y: axisY - 7,
      lines: [t.sheet.axialBeam],
    },
    {
      role: 'corner',
      x: imageX - 8,
      y: axisY + imageHalf - 19,
      lines: [t.sheet.cornerBeam, t.sheet.falloff(vignetting.toFixed(1))],
    },
  ]

  const below = axisY + outerR
  const dimensions: Dimension[] = [
    {
      orientation: 'horizontal',
      from: { x: frontFaceX, y: below },
      to: { x: mountX, y: below },
      offset: 34,
      label: `L ${formatMm(length)}`,
    },
    {
      orientation: 'horizontal',
      from: { x: mountX, y: below },
      to: { x: imageX, y: below },
      offset: 34,
      label: `FFD ${formatMm(mount.flange)}`,
    },
    {
      orientation: 'vertical',
      from: { x: frontFaceX, y: axisY - outerR },
      to: { x: frontFaceX, y: axisY + outerR },
      offset: -60,
      label: `Ø ${formatMm(barrelDiameter)}`,
    },
    {
      orientation: 'vertical',
      from: { x: frontFaceX, y: axisY - frontR },
      to: { x: frontFaceX, y: axisY + frontR },
      offset: -26,
      label: `Ø ${formatMm(estimate.frontElement)}`,
    },
    {
      orientation: 'vertical',
      from: { x: imageX, y: axisY - imageHalf },
      to: { x: imageX, y: axisY + imageHalf },
      offset: 30,
      label: t.sheet.imagePlane(formatMm(format.imageCircle), format.sensor),
    },
  ]

  const above = axisY - outerR
  const stopOnRightHalf = stopX > SHEET_WIDTH / 2
  const callouts: Callout[] = [
    {
      anchor: { x: frontFaceX + mm(1.5), y: above },
      text: { x: frontFaceX + 6, y: above - 36 },
      label:
        filterThread === null
          ? t.sheet.noThread
          : t.sheet.filterThread(filterThread),
      align: 'start',
    },
    {
      anchor: { x: stopX, y: axisY - slotOuterR },
      text: { x: stopOnRightHalf ? stopX - 14 : stopX + 14, y: above - 14 },
      label: t.sheet.irisCallout(
        formatMm(stopDiameter),
        formatMm(entrancePupil),
      ),
      align: stopOnRightHalf ? 'end' : 'start',
    },
  ]

  const scaleBarMm = length > 250 ? 100 : length > 90 ? 50 : 20

  return {
    beams,
    beamLabels,
    rays,
    dimensions,
    callouts,
    scaleBar: {
      x: DRAW_LEFT - 70,
      y: SHEET_HEIGHT - 46,
      width: mm(scaleBarMm),
      label: `${scaleBarMm} mm`,
    },
  }
}
