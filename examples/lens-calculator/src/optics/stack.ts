import { frontCliffByReach, frontGroupShareByReach, lerp } from './curves'
import type { OpticalElement } from './result'

const smoothstep = (t: number) => t * t * (3 - 2 * t)

export const stackElements = ({
  elementCount,
  stopPosition,
  reach,
  frontElement,
  stopDiameter,
  rearElement,
  fastness,
}: {
  elementCount: number
  stopPosition: number
  reach: number
  frontElement: number
  stopDiameter: number
  rearElement: number
  fastness: number
}): OpticalElement[] => {
  const preStopCount = Math.round(elementCount * stopPosition)
  const frontGroupCount = Math.min(
    3,
    Math.round(frontGroupShareByReach(reach) * preStopCount),
  )
  const frontGroupShare = preStopCount > 0 ? frontGroupCount / preStopCount : 0
  const frontCliff = frontCliffByReach(reach)
  const thicknessRatio = 0.06 + 0.04 * fastness

  const frontDiameter = (t: number) => {
    if (t < frontGroupShare) {
      return lerp(frontElement, frontElement * 0.9, t / frontGroupShare)
    }
    const rest = (t - frontGroupShare) / (1 - frontGroupShare)
    return lerp(frontElement * frontCliff, stopDiameter, smoothstep(rest))
  }

  return Array.from({ length: elementCount }, (_, index) => {
    const u = (index + 0.5) / elementCount
    const diameter =
      u < stopPosition
        ? frontDiameter(u / stopPosition)
        : lerp(
            stopDiameter,
            rearElement,
            smoothstep((u - stopPosition) / (1 - stopPosition)),
          )
    return { diameter, thickness: thicknessRatio * diameter + 0.5 }
  })
}
