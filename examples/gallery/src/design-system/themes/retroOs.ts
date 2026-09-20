import type { ResolvedThemeMode } from '../../types'
import type { ControlThemeOverrides } from '../themeTypes'

const bevelRest = {
  foreground: 'var(--retro-ink, var(--text-primary))',
  background: 'var(--retro-face, var(--input-bg))',
  border: 'var(--retro-edge, var(--border))',
  shadow: 'var(--retro-raised)',
}

const bevelHover = {
  ...bevelRest,
  background:
    'color-mix(in srgb, var(--retro-face, var(--input-bg)) 78%, #ffffff)',
  shadow: 'var(--retro-raised)',
}

const bevelPress = {
  ...bevelRest,
  shadow: 'var(--retro-inset)',
}

const bevelSelected = {
  foreground: '#ffffff',
  background: '#234e7a',
  border: '#234e7a',
  shadow: 'var(--retro-inset)',
}

const bevel = {
  rest: bevelRest,
  hover: bevelHover,
  press: bevelPress,
  selected: bevelSelected,
  selectedHover: {
    ...bevelSelected,
    background: '#1b3d61',
    border: '#1b3d61',
  },
  selectedPress: {
    ...bevelSelected,
    background: '#163250',
    border: '#163250',
    shadow: 'var(--retro-inset)',
  },
  geometry: {
    radius: '0px',
    borderWidth: '1px',
    borderStyle: 'solid',
  },
}

const farRest = {
  foreground: '#ffffff',
  background: '#008080',
  border: 'transparent',
  shadow: 'none',
}

const far = {
  rest: farRest,
  hover: {
    ...farRest,
    background: '#00aaaa',
  },
  press: {
    foreground: '#000080',
    background: '#00aaaa',
    border: 'transparent',
    shadow: 'none',
  },
  selected: {
    foreground: '#ffffff',
    background: '#000099',
    border: 'transparent',
    shadow: 'none',
  },
  selectedHover: {
    foreground: '#ffffff',
    background: '#0000aa',
    border: 'transparent',
    shadow: 'none',
  },
  selectedPress: {
    foreground: '#000080',
    background: '#00aaaa',
    border: 'transparent',
    shadow: 'none',
  },
  geometry: {
    radius: '0px',
    borderWidth: '1px',
    borderStyle: 'solid',
  },
}

const farOverlay = {
  rest: farRest,
  hover: {
    ...farRest,
    background: '#00aaaa',
  },
  press: {
    foreground: '#000080',
    background: '#00aaaa',
    border: 'transparent',
    shadow: 'none',
  },
  selected: {
    foreground: '#ffff55',
    background: '#000099',
    border: 'transparent',
    shadow: 'none',
  },
  selectedHover: {
    foreground: '#ffff55',
    background: '#0000aa',
    border: 'transparent',
    shadow: 'none',
  },
  selectedPress: {
    foreground: '#000080',
    background: '#00aaaa',
    border: 'transparent',
    shadow: 'none',
  },
}

const bevelOverlay = {
  rest: bevelRest,
  hover: bevelHover,
  press: bevelPress,
  selected: bevelSelected,
  selectedHover: {
    ...bevelSelected,
    background: '#1b3d61',
    border: '#1b3d61',
  },
  selectedPress: {
    ...bevelSelected,
    background: '#163250',
    border: '#163250',
  },
}

export const retroOsControlOverrides = (
  mode: ResolvedThemeMode,
): ControlThemeOverrides => {
  if (mode === 'dark') {
    return {
      app: {
        action: far,
        quiet: far,
        choice: far,
      },
      viewer: {
        action: far,
        quiet: far,
        choice: far,
      },
      overlay: farOverlay,
    }
  }

  return {
    app: {
      action: bevel,
      quiet: bevel,
      choice: bevel,
    },
    viewer: {
      action: bevel,
      quiet: bevel,
      choice: bevel,
    },
    overlay: bevelOverlay,
  }
}
