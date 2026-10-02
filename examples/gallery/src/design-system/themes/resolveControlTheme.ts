import type {
  ControlFocus,
  ControlGeometry,
  ControlMotion,
  ControlPaint,
  ControlTheme,
  ControlThemeOverrides,
  ControlTypography,
  NestedPartial,
  OverlayPalette,
  RolePalette,
  SurfacePalettes,
  SwitchPalette,
  ThemeVariables,
} from '../themeTypes'

const paint = (
  foreground: string,
  background: string,
  border: string,
  shadow: string,
  image = 'none',
): ControlPaint => ({ foreground, background, border, shadow, image })

const sharedFocus = (vars: ThemeVariables): ControlFocus => ({
  color: vars['--focus-ring'],
  width: '2px',
  offset: '3px',
  style: 'solid',
})

const sharedGeometry = (
  vars: ThemeVariables,
  paddingInline: string,
  paddingBlock: string,
  minHeight: string,
): ControlGeometry => ({
  radius: vars['--radius-sm'],
  borderWidth: vars['--border-width'],
  borderStyle: vars['--control-border-style'],
  paddingInline,
  paddingBlock,
  minHeight,
  gap: '6px',
  iconSize: '1em',
})

const sharedTypography = (
  vars: ThemeVariables,
  fontSize: string,
  fontWeight: string,
): ControlTypography => ({
  fontFamily: vars['--font-ui'],
  fontSize,
  fontWeight,
  letterSpacing: 'normal',
  textTransform: vars['--control-transform'],
})

const sharedMotion = (): ControlMotion => ({
  duration: '150ms',
  easing: 'ease',
})

const disabledPaint = (vars: ThemeVariables): ControlPaint =>
  paint(vars['--text-muted'], vars['--input-bg'], vars['--border'], 'none')

const deriveAppAction = (vars: ThemeVariables): RolePalette => ({
  rest: paint(
    vars['--accent-contrast'],
    vars['--accent'],
    vars['--accent'],
    vars['--glow'],
  ),
  hover: paint(
    vars['--accent-contrast'],
    vars['--accent-hover'],
    vars['--accent-hover'],
    vars['--card-hover-shadow'],
  ),
  press: paint(
    vars['--accent-contrast'],
    vars['--accent-hover'],
    vars['--accent-hover'],
    'none',
  ),
  selected: paint(
    vars['--accent-contrast'],
    vars['--accent'],
    vars['--accent'],
    vars['--glow'],
  ),
  selectedHover: paint(
    vars['--accent-contrast'],
    vars['--accent-hover'],
    vars['--accent-hover'],
    vars['--glow'],
  ),
  selectedPress: paint(
    vars['--accent-contrast'],
    vars['--accent-hover'],
    vars['--accent'],
    'none',
  ),
  disabled: disabledPaint(vars),
  focus: sharedFocus(vars),
  geometry: sharedGeometry(vars, '13px', '7px', '32px'),
  typography: sharedTypography(vars, '13px', '650'),
  motion: sharedMotion(),
})

const deriveAppQuiet = (vars: ThemeVariables): RolePalette => ({
  rest: paint(
    vars['--text-primary'],
    vars['--input-bg'],
    vars['--input-border'],
    'none',
  ),
  hover: paint(
    vars['--text-primary'],
    vars['--hover-bg'],
    vars['--text-muted'],
    'none',
  ),
  press: paint(
    vars['--text-primary'],
    vars['--active-bg'],
    vars['--accent'],
    'none',
  ),
  selected: paint(
    vars['--accent-contrast'],
    vars['--accent'],
    vars['--accent'],
    vars['--glow'],
  ),
  selectedHover: paint(
    vars['--accent-contrast'],
    vars['--accent-hover'],
    vars['--accent-hover'],
    vars['--glow'],
  ),
  selectedPress: paint(
    vars['--accent-contrast'],
    vars['--accent-hover'],
    vars['--accent'],
    'none',
  ),
  disabled: disabledPaint(vars),
  focus: sharedFocus(vars),
  geometry: sharedGeometry(vars, '12px', '6px', '32px'),
  typography: sharedTypography(vars, '13px', '650'),
  motion: sharedMotion(),
})

const deriveAppChoice = (vars: ThemeVariables): RolePalette => ({
  rest: paint(
    vars['--text-primary'],
    vars['--bg-secondary'],
    vars['--border'],
    'none',
  ),
  hover: paint(
    vars['--text-primary'],
    vars['--hover-bg'],
    vars['--accent'],
    'none',
  ),
  press: paint(
    vars['--text-primary'],
    vars['--active-bg'],
    vars['--accent'],
    'none',
  ),
  selected: paint(
    vars['--accent-contrast'],
    vars['--accent'],
    vars['--accent'],
    vars['--glow'],
  ),
  selectedHover: paint(
    vars['--accent-contrast'],
    vars['--accent-hover'],
    vars['--accent-hover'],
    vars['--glow'],
  ),
  selectedPress: paint(
    vars['--accent-contrast'],
    vars['--accent-hover'],
    vars['--accent-hover'],
    'none',
  ),
  disabled: disabledPaint(vars),
  focus: sharedFocus(vars),
  geometry: sharedGeometry(vars, '12px', '6px', '30px'),
  typography: sharedTypography(vars, '12px', '600'),
  motion: sharedMotion(),
})

const deriveAppSwitch = (vars: ThemeVariables): SwitchPalette => ({
  rest: paint(
    vars['--text-primary'],
    vars['--bg-tertiary'],
    vars['--border'],
    'none',
  ),
  hover: paint(
    vars['--text-primary'],
    vars['--hover-bg'],
    vars['--border-strong'],
    'none',
  ),
  press: paint(
    vars['--text-primary'],
    vars['--active-bg'],
    vars['--border-strong'],
    'none',
  ),
  selected: paint(
    vars['--accent-contrast'],
    vars['--accent'],
    vars['--accent'],
    'none',
  ),
  selectedHover: paint(
    vars['--accent-contrast'],
    vars['--accent-hover'],
    vars['--accent-hover'],
    'none',
  ),
  selectedPress: paint(
    vars['--accent-contrast'],
    vars['--accent-hover'],
    vars['--accent'],
    'none',
  ),
  disabled: disabledPaint(vars),
  focus: sharedFocus(vars),
  geometry: {
    ...sharedGeometry(vars, '0px', '0px', '22px'),
    radius: vars['--radius-round'],
  },
  typography: sharedTypography(vars, '13px', '500'),
  motion: { duration: '200ms', easing: 'ease' },
  switch: {
    knob: vars['--text-primary'],
    knobChecked: vars['--accent-contrast'],
    width: '40px',
    height: '22px',
    knobSize: '18px',
  },
})

const viewerChrome = (vars: ThemeVariables): RolePalette => ({
  rest: paint(
    'var(--viewer-fg)',
    'var(--viewer-bg)',
    'var(--viewer-border)',
    vars['--glow'],
  ),
  hover: paint(
    'var(--viewer-fg)',
    'var(--viewer-bg-hover)',
    'var(--viewer-border)',
    vars['--glow'],
  ),
  press: paint(
    'var(--viewer-fg)',
    'var(--viewer-bg-hover)',
    'var(--viewer-border)',
    'none',
  ),
  selected: paint(
    vars['--accent-contrast'],
    vars['--accent'],
    vars['--accent'],
    vars['--glow'],
  ),
  selectedHover: paint(
    vars['--accent-contrast'],
    vars['--accent-hover'],
    vars['--accent-hover'],
    vars['--glow'],
  ),
  selectedPress: paint(
    vars['--accent-contrast'],
    vars['--accent-hover'],
    vars['--accent'],
    'none',
  ),
  disabled: paint(
    'color-mix(in srgb, var(--viewer-fg) 45%, transparent)',
    'var(--viewer-bg)',
    'var(--viewer-border)',
    'none',
  ),
  focus: { ...sharedFocus(vars), color: 'var(--viewer-fg)', offset: '2px' },
  geometry: {
    ...sharedGeometry(vars, '10px', '4px', '36px'),
    radius: vars['--radius-round'],
  },
  typography: sharedTypography(vars, '12px', '600'),
  motion: sharedMotion(),
})

const deriveViewerSwitch = (vars: ThemeVariables): SwitchPalette => ({
  ...viewerChrome(vars),
  geometry: {
    ...sharedGeometry(vars, '0px', '0px', '22px'),
    radius: vars['--radius-round'],
  },
  switch: {
    knob: 'var(--viewer-fg)',
    knobChecked: vars['--accent-contrast'],
    width: '40px',
    height: '22px',
    knobSize: '18px',
  },
})

const deriveOverlay = (vars: ThemeVariables): OverlayPalette => ({
  rest: paint(
    vars['--text-primary'],
    vars['--overlay-control'],
    vars['--border'],
    'none',
  ),
  hover: paint(
    vars['--text-primary'],
    vars['--overlay-control-hover'],
    vars['--border-strong'],
    'none',
  ),
  press: paint(
    vars['--text-primary'],
    vars['--overlay-control-hover'],
    vars['--border-strong'],
    'none',
  ),
  selected: paint(
    vars['--accent-contrast'],
    vars['--accent'],
    vars['--accent'],
    vars['--glow'],
  ),
  selectedHover: paint(
    vars['--accent-contrast'],
    vars['--accent-hover'],
    vars['--accent-hover'],
    vars['--glow'],
  ),
  selectedPress: paint(
    vars['--accent-contrast'],
    vars['--accent-hover'],
    vars['--accent'],
    'none',
  ),
})

const deriveSurface = (
  vars: ThemeVariables,
  surface: 'app' | 'viewer',
): SurfacePalettes => {
  if (surface === 'viewer') {
    const chrome = viewerChrome(vars)
    return {
      action: chrome,
      quiet: chrome,
      choice: chrome,
      switch: deriveViewerSwitch(vars),
    }
  }

  return {
    action: deriveAppAction(vars),
    quiet: deriveAppQuiet(vars),
    choice: deriveAppChoice(vars),
    switch: deriveAppSwitch(vars),
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const mergeRecord = (
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> => {
  const next: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue
    const current = next[key]
    next[key] =
      isRecord(current) && isRecord(value) ? mergeRecord(current, value) : value
  }
  return next
}

const mergeDeep = <T>(base: T, override: NestedPartial<T> | undefined): T => {
  if (!override) return base
  if (!isRecord(base) || !isRecord(override)) return base
  return mergeRecord(base, override) as T
}

export const deriveControlTheme = (
  vars: ThemeVariables,
  overrides?: ControlThemeOverrides,
): ControlTheme =>
  mergeDeep(
    {
      app: deriveSurface(vars, 'app'),
      viewer: deriveSurface(vars, 'viewer'),
      overlay: deriveOverlay(vars),
    },
    overrides,
  )

const paintKeys = ['foreground', 'background', 'border', 'shadow'] as const

const overlayStates = [
  'rest',
  'hover',
  'press',
  'selected',
  'selectedHover',
  'selectedPress',
] as const

const paintsEqual = (left: ControlPaint, right: ControlPaint) =>
  paintKeys.every((key) => left[key] === right[key])

const requirePaint = (value: ControlPaint, label: string) => {
  for (const key of paintKeys) {
    if (!value[key]) throw new Error(`${label}.${key} is required`)
  }
}

const requireDistinct = (
  left: ControlPaint,
  right: ControlPaint,
  label: string,
) => {
  if (paintsEqual(left, right)) {
    throw new Error(`${label} must change at least one paint property`)
  }
}

export const assertControlTheme = (theme: ControlTheme, label: string) => {
  for (const surface of ['app', 'viewer'] as const) {
    for (const role of ['action', 'quiet', 'choice', 'switch'] as const) {
      const palette = theme[surface][role]
      const path = `${label}/${surface}/${role}`
      for (const state of [
        'rest',
        'hover',
        'press',
        'selected',
        'selectedHover',
        'selectedPress',
        'disabled',
      ] as const) {
        requirePaint(palette[state], `${path}/${state}`)
      }
      requireDistinct(palette.rest, palette.hover, `${path} rest vs hover`)
      requireDistinct(
        palette.selected,
        palette.selectedHover,
        `${path} selected vs selected-hover`,
      )
      requireDistinct(palette.rest, palette.press, `${path} rest vs press`)
      requireDistinct(
        palette.selected,
        palette.selectedPress,
        `${path} selected vs selected-press`,
      )
      if (
        !palette.focus.color ||
        !palette.focus.width ||
        !palette.focus.offset
      ) {
        throw new Error(`${path}/focus is incomplete`)
      }
      if (role === 'switch') {
        const extras = theme[surface].switch.switch
        if (
          !extras.knob ||
          !extras.knobChecked ||
          !extras.width ||
          !extras.height ||
          !extras.knobSize
        ) {
          throw new Error(`${path}/switch extras are incomplete`)
        }
      }
    }
  }
  for (const state of overlayStates) {
    requirePaint(theme.overlay[state], `${label}/overlay/${state}`)
  }
  requireDistinct(
    theme.overlay.rest,
    theme.overlay.hover,
    `${label}/overlay rest vs hover`,
  )
  requireDistinct(
    theme.overlay.selected,
    theme.overlay.selectedHover,
    `${label}/overlay selected vs selected-hover`,
  )
}

const stateCssKey = (state: string) => {
  if (state === 'selectedHover') return 'selected-hover'
  if (state === 'selectedPress') return 'selected-press'
  return state
}

export const CONTROL_CSS_SURFACES = ['app', 'viewer', 'overlay'] as const
export type ControlCssSurface = (typeof CONTROL_CSS_SURFACES)[number]

export const controlThemeToCssVars = (
  theme: ControlTheme,
  surfaces: readonly ControlCssSurface[] = CONTROL_CSS_SURFACES,
): Record<`--${string}`, string> => {
  const vars: Record<`--${string}`, string> = {}
  const set = (name: `--${string}`, value: string) => {
    vars[name] = value
  }
  const includeApp = surfaces.includes('app')
  const includeViewer = surfaces.includes('viewer')
  const includeOverlay = surfaces.includes('overlay')

  for (const surface of ['app', 'viewer'] as const) {
    if (surface === 'app' && !includeApp) continue
    if (surface === 'viewer' && !includeViewer) continue
    for (const role of ['action', 'quiet', 'choice', 'switch'] as const) {
      const palette = theme[surface][role]
      const prefix = `--ui-${surface}-${role}` as const
      for (const state of [
        'rest',
        'hover',
        'press',
        'selected',
        'selectedHover',
        'selectedPress',
        'disabled',
      ] as const) {
        const key = stateCssKey(state)
        set(`${prefix}-${key}-fg`, palette[state].foreground)
        set(`${prefix}-${key}-bg`, palette[state].background)
        set(`${prefix}-${key}-border`, palette[state].border)
        set(`${prefix}-${key}-shadow`, palette[state].shadow)
        set(`${prefix}-${key}-image`, palette[state].image ?? 'none')
      }
      set(`${prefix}-focus-color`, palette.focus.color)
      set(`${prefix}-focus-width`, palette.focus.width)
      set(`${prefix}-focus-offset`, palette.focus.offset)
      set(`${prefix}-focus-style`, palette.focus.style)
      set(`${prefix}-radius`, palette.geometry.radius)
      set(`${prefix}-border-width`, palette.geometry.borderWidth)
      set(`${prefix}-border-style`, palette.geometry.borderStyle)
      set(`${prefix}-pad-x`, palette.geometry.paddingInline)
      set(`${prefix}-pad-y`, palette.geometry.paddingBlock)
      set(`${prefix}-min-height`, palette.geometry.minHeight)
      set(`${prefix}-gap`, palette.geometry.gap)
      set(`${prefix}-icon-size`, palette.geometry.iconSize)
      set(`${prefix}-font-family`, palette.typography.fontFamily)
      set(`${prefix}-font-size`, palette.typography.fontSize)
      set(`${prefix}-font-weight`, palette.typography.fontWeight)
      set(`${prefix}-letter-spacing`, palette.typography.letterSpacing)
      set(`${prefix}-text-transform`, palette.typography.textTransform)
      set(`${prefix}-duration`, palette.motion.duration)
      set(`${prefix}-easing`, palette.motion.easing)
      if (role === 'switch') {
        const extras = theme[surface].switch.switch
        set(`${prefix}-knob`, extras.knob)
        set(`${prefix}-knob-checked`, extras.knobChecked)
        set(`${prefix}-width`, extras.width)
        set(`${prefix}-height`, extras.height)
        set(`${prefix}-knob-size`, extras.knobSize)
      }
    }
  }

  if (!includeOverlay) return vars

  for (const state of overlayStates) {
    const key = stateCssKey(state)
    set(`--ui-overlay-${key}-fg`, theme.overlay[state].foreground)
    set(`--ui-overlay-${key}-bg`, theme.overlay[state].background)
    set(`--ui-overlay-${key}-border`, theme.overlay[state].border)
    set(`--ui-overlay-${key}-shadow`, theme.overlay[state].shadow)
    set(`--ui-overlay-${key}-image`, theme.overlay[state].image ?? 'none')
  }

  return vars
}
