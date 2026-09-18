import {
  action,
  atom,
  computed,
  reatomBoolean,
  reatomEnum,
  withSearchParams,
} from '@reatom/core'

import {
  apertureStops,
  type Barrel,
  barrels,
  bodies,
  type Body,
  clamp,
  FOCAL_MAX,
  FOCAL_MIN,
  type Format,
  formats,
  type LensSpec,
  STOP_SHIFT_MAX,
  STOP_SHIFT_MIN,
  type Tier,
  tiers,
  VIGNETTING_MAX,
  VIGNETTING_MIN,
} from '../optics'

const numberParam =
  (fallback: number, min: number, max: number, digits = 0) =>
  (value?: string) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return fallback
    const factor = 10 ** digits
    return clamp(Math.round(parsed * factor) / factor, min, max)
  }

const flagParam = (fallback: boolean) => (value?: string) =>
  value === undefined ? fallback : value === '1'

const serializeFlag = (fallback: boolean) => (value: boolean) =>
  value === fallback ? undefined : value ? '1' : '0'

const search = { replace: true }

const FOCAL_SLIDER_STEPS = 1000
const focalSpan = Math.log(FOCAL_MAX / FOCAL_MIN)
const STOP_SHIFT_STEP = 0.05

export const defaultSpec = {
  focal: 50,
  fNumber: 1.4,
  vignetting: 2,
  stopShift: 0,
  format: 'ff',
  body: 'mirrorless',
  tier: 'modern',
  barrel: 'aluminium',
  autofocus: true,
  stabilized: false,
} satisfies LensSpec

export const roundFocal = (value: number) => {
  const clamped = clamp(value, FOCAL_MIN, FOCAL_MAX)
  const step = clamped >= 300 ? 10 : clamped >= 100 ? 5 : 1
  return clamp(Math.round(clamped / step) * step, FOCAL_MIN, FOCAL_MAX)
}

export const nearestStop = (value: number) =>
  apertureStops.reduce((best, stop) =>
    Math.abs(Math.log(stop / value)) < Math.abs(Math.log(best / value))
      ? stop
      : best,
  )

export const focal = atom(defaultSpec.focal, 'focal').extend(
  withSearchParams<number>('f', {
    ...search,
    parse: (value) =>
      roundFocal(numberParam(defaultSpec.focal, FOCAL_MIN, FOCAL_MAX)(value)),
    serialize: (value) =>
      value === defaultSpec.focal ? undefined : String(value),
  }),
  (target) => ({
    sliderPosition: computed(
      () =>
        Math.round(
          (Math.log(target() / FOCAL_MIN) / focalSpan) * FOCAL_SLIDER_STEPS,
        ),
      `${target.name}.sliderPosition`,
    ),
    fromSlider: action((position: number) => {
      target.set(
        roundFocal(
          FOCAL_MIN * Math.exp((position / FOCAL_SLIDER_STEPS) * focalSpan),
        ),
      )
    }, `${target.name}.fromSlider`),
    fromInput: action((value: number) => {
      if (!Number.isFinite(value)) return
      target.set(roundFocal(value))
    }, `${target.name}.fromInput`),
  }),
)

export const fNumber = atom<number>(defaultSpec.fNumber, 'fNumber').extend(
  withSearchParams<number>('n', {
    ...search,
    parse: (value) =>
      nearestStop(numberParam(defaultSpec.fNumber, 0.95, 8, 2)(value)),
    serialize: (value) =>
      value === defaultSpec.fNumber ? undefined : String(value),
  }),
  (target) => ({
    apertureIndex: computed(() => {
      const stop = target()
      return apertureStops.findIndex((value) => value === stop)
    }, `${target.name}.apertureIndex`),
    fromIndex: action((index: number) => {
      const stop =
        apertureStops[clamp(Math.round(index), 0, apertureStops.length - 1)]
      if (stop !== undefined) target.set(stop)
    }, `${target.name}.fromIndex`),
  }),
)

export const vignetting = atom(defaultSpec.vignetting, 'vignetting').extend(
  withSearchParams<number>('v', {
    ...search,
    parse: numberParam(
      defaultSpec.vignetting,
      VIGNETTING_MIN,
      VIGNETTING_MAX,
      1,
    ),
    serialize: (value) =>
      value === defaultSpec.vignetting ? undefined : String(value),
  }),
  (target) => ({
    fromInput: action((value: number) => {
      if (!Number.isFinite(value)) return
      target.set(
        clamp(Math.round(value * 2) / 2, VIGNETTING_MIN, VIGNETTING_MAX),
      )
    }, `${target.name}.fromInput`),
  }),
)

export const stopShift = atom(defaultSpec.stopShift, 'stopShift').extend(
  withSearchParams<number>('s', {
    ...search,
    parse: numberParam(
      defaultSpec.stopShift,
      STOP_SHIFT_MIN,
      STOP_SHIFT_MAX,
      2,
    ),
    serialize: (value) =>
      value === defaultSpec.stopShift ? undefined : String(value),
  }),
  (target) => ({
    fromInput: action((value: number) => {
      if (!Number.isFinite(value)) return
      const snapped = Math.round(value / STOP_SHIFT_STEP) * STOP_SHIFT_STEP
      target.set(
        clamp(Math.round(snapped * 100) / 100, STOP_SHIFT_MIN, STOP_SHIFT_MAX),
      )
    }, `${target.name}.fromInput`),
  }),
)

export const format = reatomEnum(formats, {
  name: 'format',
  initState: defaultSpec.format,
}).extend(
  withSearchParams<Format>('fmt', {
    ...search,
    parse: (value = defaultSpec.format) =>
      formats.find((variant) => variant === value) ?? defaultSpec.format,
    serialize: (value) =>
      value === defaultSpec.format ? undefined : value,
  }),
)

export const body = reatomEnum(bodies, {
  name: 'body',
  initState: defaultSpec.body,
}).extend(
  withSearchParams<Body>('body', {
    ...search,
    parse: (value = defaultSpec.body) =>
      bodies.find((variant) => variant === value) ?? defaultSpec.body,
    serialize: (value) => (value === defaultSpec.body ? undefined : value),
  }),
)

export const tier = reatomEnum(tiers, {
  name: 'tier',
  initState: defaultSpec.tier,
}).extend(
  withSearchParams<Tier>('tier', {
    ...search,
    parse: (value = defaultSpec.tier) =>
      tiers.find((variant) => variant === value) ?? defaultSpec.tier,
    serialize: (value) => (value === defaultSpec.tier ? undefined : value),
  }),
)

export const barrel = reatomEnum(barrels, {
  name: 'barrel',
  initState: defaultSpec.barrel,
}).extend(
  withSearchParams<Barrel>('barrel', {
    ...search,
    parse: (value = defaultSpec.barrel) =>
      barrels.find((variant) => variant === value) ?? defaultSpec.barrel,
    serialize: (value) =>
      value === defaultSpec.barrel ? undefined : value,
  }),
)

export const autofocus = reatomBoolean(defaultSpec.autofocus, 'autofocus').extend(
  withSearchParams<boolean>('af', {
    ...search,
    parse: flagParam(defaultSpec.autofocus),
    serialize: serializeFlag(defaultSpec.autofocus),
  }),
)

export const stabilized = reatomBoolean(
  defaultSpec.stabilized,
  'stabilized',
).extend(
  withSearchParams<boolean>('ois', {
    ...search,
    parse: flagParam(defaultSpec.stabilized),
    serialize: serializeFlag(defaultSpec.stabilized),
  }),
)
