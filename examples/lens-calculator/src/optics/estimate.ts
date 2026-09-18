import {
  clamp,
  FOCAL_MAX,
  FOCAL_MIN,
  formatSpecs,
  type LensSpec,
  mountSpecs,
  STOP_SHIFT_MAX,
  STOP_SHIFT_MIN,
  tierSpecs,
  VIGNETTING_MAX,
  VIGNETTING_MIN,
} from './catalog'
import {
  classifyKind,
  gaussBackFocusRatioByReach,
  log2,
  pupilDepthByReach,
  stopPositionByReach,
  stopRatioByReach,
  teleTrackRatioByReach,
} from './curves'
import { weighLens } from './mass'
import type { LensEstimate } from './result'
import { stackElements } from './stack'

const filterThreads = [
  37, 39, 40.5, 43, 46, 49, 52, 55, 58, 62, 67, 72, 77, 82, 86, 95, 105, 112,
]

export type { LensEstimate, MassBreakdown, OpticalElement } from './result'

export const estimateLens = (spec: LensSpec): LensEstimate => {
  const format = formatSpecs[spec.format]
  const mount = mountSpecs[spec.format][spec.body]
  const { imageCircle } = format
  const focal = clamp(spec.focal, FOCAL_MIN, FOCAL_MAX)
  const fNumber = spec.fNumber
  const vignetting = clamp(spec.vignetting, VIGNETTING_MIN, VIGNETTING_MAX)
  const stopShift = clamp(spec.stopShift, STOP_SHIFT_MIN, STOP_SHIFT_MAX)

  const reach = log2(focal / imageCircle)
  const kind = classifyKind(focal, imageCircle)

  const entrancePupil = focal / fNumber
  const halfField = Math.atan(imageCircle / 2 / focal)
  const halfFieldDeg = (halfField * 180) / Math.PI
  const diagonalAovDeg = halfFieldDeg * 2

  /**
   * The iris sits deeper behind the front vertex when pushed back, so the
   * off-axis beam enters further off centre and the front group must grow;
   * pulled forward, the rear group has to cover the image circle instead.
   */
  const designStopPosition = stopPositionByReach(reach)
  const stopPosition = clamp(designStopPosition + stopShift, 0.25, 0.85)
  const stopDepthRatio = stopPosition / designStopPosition
  const rearCoverageRatio = (1 - stopPosition) / (1 - designStopPosition)

  const pupilDepth = pupilDepthByReach(reach) * stopDepthRatio
  const vignettingFactor = 1 + (2 - vignetting) * 0.4
  const frontElement = Math.max(
    entrancePupil * 1.04 + 2,
    entrancePupil + 2 * pupilDepth * Math.sin(halfField) * vignettingFactor,
  )

  const rearElement = clamp(
    Math.max(imageCircle * 0.75, entrancePupil * 0.6) *
      Math.sqrt(rearCoverageRatio),
    10,
    mount.throat - 8,
  )

  const stopDiameter = Math.max(
    (entrancePupil * stopRatioByReach(reach)) / Math.sqrt(stopDepthRatio),
    imageCircle * 0.55,
  )

  const filterThread =
    filterThreads.find((size) => size >= frontElement + 6) ?? null

  const barrelBase =
    filterThread === null ? frontElement + 12 : filterThread + 6
  const mountDiameter = mount.throat + 14
  const barrelDiameter =
    Math.max(barrelBase, mount.throat + 16) + (spec.stabilized ? 3 : 0)

  const fastness = Math.max(0, log2(2.8 / fNumber))
  const wideness = Math.max(0, -reach)
  const teleness = Math.max(0, reach) + Math.max(0, reach - 2) ** 2
  const asymmetry = 4 * Math.abs(stopShift)
  const rawCount =
    4 + 2 * fastness + 2.2 * wideness + 1.5 * teleness + asymmetry
  const elementCount = Math.max(
    3,
    Math.round(rawCount * tierSpecs[spec.tier].elementFactor),
  )
  const groupCount = Math.max(1, Math.round(elementCount * 0.72))

  const elements = stackElements({
    elementCount,
    stopPosition,
    reach,
    frontElement,
    stopDiameter,
    rearElement,
    fastness,
  })

  const glassStack = elements.reduce(
    (sum, element, index) =>
      sum +
      element.thickness +
      (index === 0 ? 0 : 0.025 * element.diameter + 0.6),
    0,
  )

  const gaussBackFocus = focal * gaussBackFocusRatioByReach(reach)
  const backFocus = Math.max(mount.flange + 5, gaussBackFocus)

  const teleTrack = focal * teleTrackRatioByReach(reach)
  const track = Math.max(glassStack + backFocus, teleTrack)
  const opticalLength = track - backFocus

  const frontRim = 3
  const mountPlate = 2
  const length =
    opticalLength +
    backFocus -
    mount.flange +
    mountPlate +
    frontRim +
    (spec.autofocus ? 2 : 0) +
    (spec.stabilized ? 8 : 0)

  return {
    spec: { ...spec, focal, vignetting, stopShift },
    kind,
    format,
    mount,
    entrancePupil,
    halfFieldDeg,
    diagonalAovDeg,
    pupilDepth,
    frontElement,
    rearElement,
    stopDiameter,
    stopPosition,
    designStopPosition,
    filterThread,
    barrelDiameter,
    mountDiameter,
    length,
    frontRim,
    mountPlate,
    backFocus,
    opticalLength,
    track,
    elementCount,
    groupCount,
    elements,
    mass: weighLens({
      elements,
      spec,
      barrelDiameter,
      length,
      stopDiameter,
      mountThroat: mount.throat,
    }),
  }
}
