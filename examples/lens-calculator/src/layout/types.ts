/**
 * Turns a `LensEstimate` into cross-section geometry in SVG pixel space. The
 * sheet has a fixed viewBox and the lens is scaled to fit, so annotation text
 * keeps its size while the drawing grows and shrinks.
 */

export const SHEET_WIDTH = 1000
export const SHEET_HEIGHT = 600

export const DRAW_LEFT = 130
export const DRAW_RIGHT = 850
export const DRAW_TOP = 100
export const DRAW_BOTTOM = 440
export const IMAGE_PLANE_PAD_MM = 6

export interface Point {
  x: number
  y: number
}

export interface ElementShape {
  path: string
  cementedWithPrevious: boolean
  center: Point
  radius: number
}

export interface Ray {
  points: Point[]
  role: 'marginal' | 'chief' | 'bundle'
}

export interface Beam {
  role: 'axial' | 'corner'
  outline: string
}

export interface BeamLabel {
  role: Beam['role']
  x: number
  y: number
  lines: string[]
}

export interface Iris {
  housing: string
  leaves: string[]
}

export interface Dimension {
  from: Point
  to: Point
  offset: number
  label: string
  orientation: 'horizontal' | 'vertical'
}

export interface Callout {
  anchor: Point
  text: Point
  label: string
  align: 'start' | 'end'
}

export interface Blueprint {
  scale: number
  axisY: number
  frontFaceX: number
  mountX: number
  imageX: number
  stopX: number
  barrelPath: string
  focusRingPath: string
  mountPath: string
  iris: Iris
  imagePlane: { x: number; halfHeight: number }
  elements: ElementShape[]
  beams: Beam[]
  beamLabels: BeamLabel[]
  rays: Ray[]
  dimensions: Dimension[]
  callouts: Callout[]
  scaleBar: { x: number; y: number; width: number; label: string }
}
