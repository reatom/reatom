import type { LensEstimate } from '../optics'
import type { DrawingFrame } from './frame'
import {
  EDGE_MIN_MM,
  elementPath,
  fitSags,
  pick,
  patterns,
  shapes,
} from './paths'
import type { ElementShape } from './types'

export interface GlassLayout {
  elements: ElementShape[]
  stopMm: number
}

interface Profile {
  half: number
  thickness: number
  frontSag: number
  rearSag: number
  leftExtent: number
  rightExtent: number
}

export const layoutGlass = (
  estimate: LensEstimate,
  frame: DrawingFrame,
): GlassLayout => {
  const {
    elements: opticalElements,
    kind,
    stopPosition,
    opticalLength,
  } = estimate
  const { mm, toX, axisY, scale } = frame

  const count = opticalElements.length
  const stopIndex = Math.max(
    1,
    Math.min(count - 1, Math.round(count * stopPosition)),
  )
  const frontGroupSize =
    kind === 'normal'
      ? 1
      : Math.min(3, Math.max(1, Math.round(stopIndex * 0.35)))

  const pattern = patterns[kind]
  const cemented = opticalElements.map(
    (_, index) =>
      index > frontGroupSize &&
      index !== stopIndex &&
      (index - frontGroupSize) % 3 === 2,
  )

  const profiles: Profile[] = []
  opticalElements.forEach((element, index) => {
    const shapeName =
      index < frontGroupSize
        ? pick(pattern.front, index)
        : index < stopIndex
          ? pick(pattern.beforeStop, index - frontGroupSize)
          : pick(pattern.afterStop, index - stopIndex)
    const shape = shapes[shapeName]

    const half = mm(element.diameter / 2)
    const thickness = mm(element.thickness)
    const previousRear = profiles[index - 1]?.rearSag ?? 0
    const { frontSag, rearSag } = fitSags(
      cemented[index] ? -previousRear : shape.front * half,
      shape.rear * half,
      thickness,
      mm(EDGE_MIN_MM),
    )

    profiles.push({
      half,
      thickness,
      frontSag,
      rearSag,
      leftExtent: Math.max(0, -frontSag),
      rightExtent: Math.max(0, -rearSag),
    })
  })

  const baseGaps = opticalElements.map((element, index) =>
    index === 0 || cemented[index] ? 0 : 0.025 * element.diameter + 0.6,
  )
  const glassMm = profiles.reduce(
    (sum, profile, index) =>
      sum +
      (profile.thickness + profile.leftExtent + profile.rightExtent) / scale +
      baseGaps[index]!,
    0,
  )
  const spareMm = Math.max(0, opticalLength - glassMm)
  const frontGapShare = kind === 'tele' ? 0.7 : kind === 'wide' ? 0.35 : 0.2
  const stopGapShare = 0.2
  const openGapCount = baseGaps.filter((gap) => gap > 0).length
  const spreadEach =
    (spareMm * (1 - frontGapShare - stopGapShare)) / Math.max(1, openGapCount)

  const gaps = baseGaps.map((gap, index) => {
    if (gap === 0) return 0
    let total = gap + spreadEach
    if (index === frontGroupSize) total += spareMm * frontGapShare
    if (index === stopIndex) total += spareMm * stopGapShare
    return total
  })

  const elements: ElementShape[] = []
  let cursorMm = 0
  let stopMm = 0

  profiles.forEach((profile, index) => {
    cursorMm += gaps[index]!
    if (index === stopIndex) stopMm = cursorMm - gaps[index]! / 2

    const frontVertexX = toX(cursorMm) + profile.leftExtent
    const centerX = frontVertexX + profile.thickness / 2

    elements.push({
      path: elementPath(
        centerX,
        axisY,
        profile.half,
        profile.thickness,
        profile.frontSag,
        profile.rearSag,
      ),
      cementedWithPrevious: cemented[index]!,
      center: { x: centerX, y: axisY },
      radius: profile.half,
    })
    cursorMm +=
      (profile.thickness + profile.leftExtent + profile.rightExtent) / scale
  })

  return { elements, stopMm }
}
