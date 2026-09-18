import type { LensKind } from '../optics/catalog'
import type { Point } from './types'

interface SurfacePair {
  front: number
  rear: number
}

/** Sag as a fraction of the half-aperture; positive bulges outwards (convex). */
export const shapes = {
  biconvex: { front: 0.16, rear: 0.16 },
  biconcave: { front: -0.12, rear: -0.12 },
  meniscusPositive: { front: 0.2, rear: -0.08 },
  meniscusNegative: { front: 0.1, rear: -0.22 },
  reverseMeniscusPositive: { front: -0.08, rear: 0.2 },
  planoConvex: { front: 0.18, rear: 0 },
} satisfies Record<string, SurfacePair>

export const EDGE_MIN_MM = 0.6

/** Keep convex sags inside the centre thickness and concave edges modest. */
export const fitSags = (
  frontSag: number,
  rearSag: number,
  thickness: number,
  edgeMin: number,
) => {
  const convexSum = Math.max(0, frontSag) + Math.max(0, rearSag)
  const convexBudget = Math.max(0, thickness - edgeMin)
  const convexScale = convexSum > convexBudget ? convexBudget / convexSum : 1

  const concaveSum = Math.max(0, -frontSag) + Math.max(0, -rearSag)
  const concaveBudget = thickness * 0.6
  const concaveScale =
    concaveSum > concaveBudget ? concaveBudget / concaveSum : 1

  const fit = (sag: number) => sag * (sag > 0 ? convexScale : concaveScale)
  return { frontSag: fit(frontSag), rearSag: fit(rearSag) }
}

type ShapeName = keyof typeof shapes

interface Pattern {
  front: ShapeName[]
  beforeStop: ShapeName[]
  afterStop: ShapeName[]
}

export const patterns: Record<LensKind, Pattern> = {
  wide: {
    front: ['meniscusNegative', 'meniscusNegative', 'biconcave'],
    beforeStop: ['biconvex', 'meniscusPositive', 'biconcave', 'biconvex'],
    afterStop: ['biconcave', 'biconvex', 'reverseMeniscusPositive', 'biconvex'],
  },
  normal: {
    front: ['meniscusPositive'],
    beforeStop: ['meniscusPositive', 'biconvex', 'meniscusNegative'],
    afterStop: [
      'biconcave',
      'reverseMeniscusPositive',
      'biconvex',
      'planoConvex',
    ],
  },
  tele: {
    front: ['biconvex', 'planoConvex', 'biconcave'],
    beforeStop: ['biconvex', 'biconcave', 'meniscusPositive'],
    afterStop: ['biconcave', 'biconvex', 'meniscusNegative', 'biconvex'],
  },
}

export const pick = <T>(list: T[], index: number): T =>
  list[index % list.length]!

const round = (value: number) => Math.round(value * 100) / 100

const point = ({ x, y }: Point) => `${round(x)} ${round(y)}`

/**
 * Arc between two vertically aligned points. `sag` is the surface bulge; the
 * front surface bulges to the left when convex, the rear one to the right.
 */
const surfacePath = (
  from: Point,
  to: Point,
  sag: number,
  isFrontSurface: boolean,
) => {
  if (Math.abs(sag) < 0.15) return `L ${point(to)}`
  const half = Math.abs(to.y - from.y) / 2
  const radius = (half * half + sag * sag) / (2 * Math.abs(sag))
  const bulgesLeft = isFrontSurface === sag > 0
  const goingDown = to.y > from.y
  const sweep = bulgesLeft === goingDown ? 0 : 1
  return `A ${round(radius)} ${round(radius)} 0 0 ${sweep} ${point(to)}`
}

export const elementPath = (
  centerX: number,
  axisY: number,
  half: number,
  centerThickness: number,
  frontSag: number,
  rearSag: number,
) => {
  const frontEdgeX = centerX - centerThickness / 2 + frontSag
  const rearEdgeX = centerX + centerThickness / 2 - rearSag
  const top = axisY - half
  const bottom = axisY + half

  return [
    `M ${round(frontEdgeX)} ${round(top)}`,
    surfacePath(
      { x: frontEdgeX, y: top },
      { x: frontEdgeX, y: bottom },
      frontSag,
      true,
    ),
    `L ${round(rearEdgeX)} ${round(bottom)}`,
    surfacePath(
      { x: rearEdgeX, y: bottom },
      { x: rearEdgeX, y: top },
      rearSag,
      false,
    ),
    'Z',
  ].join(' ')
}

export const polyline = (points: Point[], close = false) =>
  points
    .map((item, index) => `${index === 0 ? 'M' : 'L'} ${point(item)}`)
    .join(' ') + (close ? ' Z' : '')

export const segment = (from: Point, to: Point) =>
  `M ${point(from)} L ${point(to)}`

export const mirrorY = (points: Point[], axisY: number) =>
  points.map(({ x, y }) => ({ x, y: 2 * axisY - y }))

export const formatMm = (value: number) =>
  value >= 100 ? value.toFixed(0) : value.toFixed(1)
