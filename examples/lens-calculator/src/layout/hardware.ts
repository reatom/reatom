import type { LensEstimate } from '../optics'
import type { DrawingFrame } from './frame'
import type { GlassLayout } from './glass'
import { mirrorY, polyline, segment } from './paths'
import type { Iris, Point } from './types'

export interface HardwareLayout {
  frontFaceX: number
  frontX: number
  mountX: number
  imageX: number
  stopX: number
  outerR: number
  frontR: number
  imageHalf: number
  slotOuterR: number
  barrelPath: string
  focusRingPath: string
  mountPath: string
  iris: Iris
}

export const layoutHardware = (
  estimate: LensEstimate,
  frame: DrawingFrame,
  glass: GlassLayout,
): HardwareLayout => {
  const {
    frontRim,
    length,
    mount,
    format,
    barrelDiameter,
    mountDiameter,
    frontElement,
    stopDiameter,
    opticalLength,
    kind,
  } = estimate
  const { mm, toX, axisY } = frame
  const { elements, stopMm } = glass

  const frontFaceX = toX(-frontRim)
  const frontX = toX(0)
  const mountX = toX(length - frontRim)
  const imageX = mountX + mm(mount.flange)
  const stopX = toX(stopMm)
  const outerR = mm(barrelDiameter / 2)
  const rearR = Math.min(outerR, mm(mountDiameter / 2))
  const throatR = mm(mount.throat / 2)

  const taperStartX = Math.max(
    frontFaceX + mm(6),
    kind === 'tele' ? toX(opticalLength * 0.55) : mountX - mm(10),
  )
  const lastElement = elements[elements.length - 1]!
  const rearSeat = lastElement.radius + mm(1.4)

  const outerTop: Point[] = [
    { x: frontFaceX, y: axisY - mm(frontElement / 2 + 1.5) },
    { x: frontFaceX, y: axisY - outerR },
    { x: Math.min(taperStartX, mountX - mm(8)), y: axisY - outerR },
    { x: mountX - mm(6), y: axisY - rearR },
    { x: mountX, y: axisY - rearR },
    { x: mountX, y: axisY - throatR },
    { x: mountX - mm(2), y: axisY - throatR },
    { x: mountX - mm(2), y: axisY - rearSeat },
  ]

  const bore = elements.flatMap((shape) => {
    const seat = shape.radius + mm(1.4)
    return [
      { x: shape.center.x - mm(1), y: axisY - seat },
      { x: shape.center.x + mm(1), y: axisY - seat },
    ]
  })
  const barrelTop = [...outerTop, ...bore.reverse()]
  const barrelPath = `${polyline(barrelTop, true)} ${polyline(
    mirrorY(barrelTop, axisY),
    true,
  )}`

  const ringStartX = Math.max(frontFaceX + mm(8), toX(opticalLength * 0.18))
  const ringEndX = Math.min(taperStartX, toX(opticalLength * 0.55))
  const ribs: string[] = []
  for (let x = ringStartX; x < ringEndX; x += mm(2.2)) {
    ribs.push(
      segment({ x, y: axisY - outerR }, { x, y: axisY - outerR - mm(1.2) }),
      segment({ x, y: axisY + outerR }, { x, y: axisY + outerR + mm(1.2) }),
    )
  }

  const bayonetDepth = mm(3.5)
  const mountTop: Point[] = [
    { x: mountX, y: axisY - throatR - mm(4) },
    { x: mountX + mm(1.6), y: axisY - throatR - mm(4) },
    { x: mountX + mm(1.6), y: axisY - throatR + mm(1) },
    { x: mountX + bayonetDepth, y: axisY - throatR + mm(1) },
    { x: mountX + bayonetDepth, y: axisY - throatR + mm(2.5) },
    { x: mountX, y: axisY - throatR + mm(2.5) },
  ]

  /**
   * The iris is a thin unit let into the barrel wall: a housing slot holding a
   * shallow cone of overlapping leaves whose tips define the opening.
   */
  const stopR = mm(stopDiameter / 2)
  const leafCount = 3
  const leafTilt = Math.max(3, mm(1.6))
  const leafHalf = Math.max(0.9, mm(0.45))
  const leafStagger = Math.max(1.6, mm(0.8))
  const slotHalfWidth =
    (leafStagger * (leafCount - 1)) / 2 + leafTilt / 2 + leafHalf + 1.2
  const slotInnerR = stopR + Math.max(4, mm(1.5))
  const slotOuterR = Math.max(
    slotInnerR + 3,
    Math.min(outerR - Math.max(2, mm(1)), stopR + mm(7)),
  )
  const irisSides = [-1, 1] as const
  const housing = irisSides
    .map((sign) =>
      polyline(
        [
          { x: stopX - slotHalfWidth, y: axisY + sign * slotOuterR },
          { x: stopX + slotHalfWidth, y: axisY + sign * slotOuterR },
          { x: stopX + slotHalfWidth, y: axisY + sign * slotInnerR },
          { x: stopX - slotHalfWidth, y: axisY + sign * slotInnerR },
        ],
        true,
      ),
    )
    .join(' ')

  const leaves = irisSides.flatMap((sign) =>
    Array.from({ length: leafCount }, (_, index) => {
      const offset = (index - (leafCount - 1) / 2) * leafStagger
      const baseY = axisY + sign * ((slotOuterR + slotInnerR) / 2)
      const tipY = axisY + sign * (stopR + Math.abs(offset) * 0.6)
      const baseX = stopX + offset - leafTilt / 2
      const tipX = stopX + offset + leafTilt / 2
      return polyline(
        [
          { x: baseX - leafHalf, y: baseY },
          { x: baseX + leafHalf, y: baseY },
          { x: tipX + leafHalf * 0.6, y: tipY },
          { x: tipX - leafHalf * 0.6, y: tipY },
        ],
        true,
      )
    }),
  )

  return {
    frontFaceX,
    frontX,
    mountX,
    imageX,
    stopX,
    outerR,
    frontR: mm(frontElement / 2),
    imageHalf: mm(format.imageCircle / 2),
    slotOuterR,
    barrelPath,
    focusRingPath: ribs.join(' '),
    mountPath: `${polyline(mountTop, true)} ${polyline(
      mirrorY(mountTop, axisY),
      true,
    )}`,
    iris: { housing, leaves },
  }
}
