import type { LensEstimate } from '../optics'
import {
  DRAW_BOTTOM,
  DRAW_LEFT,
  DRAW_RIGHT,
  DRAW_TOP,
  IMAGE_PLANE_PAD_MM,
} from './types'

export interface DrawingFrame {
  scale: number
  axisY: number
  mm: (value: number) => number
  toX: (valueMm: number) => number
}

export const createFrame = (estimate: LensEstimate): DrawingFrame => {
  const { frontRim, length, mount, format, barrelDiameter } = estimate
  const totalMm = frontRim + length + mount.flange + IMAGE_PLANE_PAD_MM
  const tallestMm = Math.max(barrelDiameter, format.imageCircle) + 8
  const scale = Math.min(
    (DRAW_RIGHT - DRAW_LEFT) / totalMm,
    (DRAW_BOTTOM - DRAW_TOP) / tallestMm,
  )
  const axisY = (DRAW_TOP + DRAW_BOTTOM) / 2
  const drawWidth = DRAW_RIGHT - DRAW_LEFT
  const originX =
    DRAW_LEFT + (drawWidth - totalMm * scale) / 2 + frontRim * scale

  const mm = (value: number) => value * scale
  const toX = (valueMm: number) => originX + mm(valueMm)

  return { scale, axisY, mm, toX }
}
