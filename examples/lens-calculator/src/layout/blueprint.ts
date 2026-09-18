import type { LensEstimate } from '../optics'
import { createFrame } from './frame'
import { layoutGlass } from './glass'
import { layoutHardware } from './hardware'
import { layoutMarks } from './marks'
import type { Blueprint } from './types'

export const buildBlueprint = (estimate: LensEstimate): Blueprint => {
  const frame = createFrame(estimate)
  const glass = layoutGlass(estimate, frame)
  const hardware = layoutHardware(estimate, frame, glass)
  const marks = layoutMarks(estimate, frame, hardware)

  return {
    scale: frame.scale,
    axisY: frame.axisY,
    frontFaceX: hardware.frontFaceX,
    mountX: hardware.mountX,
    imageX: hardware.imageX,
    stopX: hardware.stopX,
    barrelPath: hardware.barrelPath,
    focusRingPath: hardware.focusRingPath,
    mountPath: hardware.mountPath,
    iris: hardware.iris,
    imagePlane: { x: hardware.imageX, halfHeight: hardware.imageHalf },
    elements: glass.elements,
    beams: marks.beams,
    beamLabels: marks.beamLabels,
    rays: marks.rays,
    dimensions: marks.dimensions,
    callouts: marks.callouts,
    scaleBar: marks.scaleBar,
  }
}
