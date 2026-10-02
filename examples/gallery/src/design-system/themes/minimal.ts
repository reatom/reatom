import type { ControlThemeOverrides } from '../themeTypes'

const underlineRest = {
  foreground: 'var(--text-primary)',
  background: 'transparent',
  border: 'transparent',
  shadow: 'none',
}

const underlineSelected = {
  foreground: 'var(--text-primary)',
  background: 'transparent',
  border: 'transparent',
  shadow: 'inset 0 -2px 0 var(--text-primary)',
}

const underline = {
  rest: underlineRest,
  hover: {
    ...underlineRest,
    background: 'var(--hover-bg)',
  },
  press: {
    ...underlineRest,
    background: 'var(--active-bg)',
  },
  selected: underlineSelected,
  selectedHover: {
    ...underlineSelected,
    background: 'var(--hover-bg)',
  },
  selectedPress: {
    ...underlineSelected,
    background: 'var(--active-bg)',
  },
}

const viewer = {
  rest: {
    foreground: '#ffffff',
    background: 'transparent',
    border: 'transparent',
    shadow: 'none',
  },
  hover: {
    foreground: '#ffffff',
    background: '#ffffff18',
    border: 'transparent',
    shadow: 'none',
  },
  press: {
    foreground: '#ffffff',
    background: '#ffffff28',
    border: 'transparent',
    shadow: 'none',
  },
  selected: {
    foreground: '#ffffff',
    background: 'transparent',
    border: 'transparent',
    shadow: 'inset 0 -2px 0 #ffffff',
  },
  selectedHover: {
    foreground: '#ffffff',
    background: '#ffffff18',
    border: 'transparent',
    shadow: 'inset 0 -2px 0 #ffffff',
  },
  selectedPress: {
    foreground: '#ffffff',
    background: '#ffffff28',
    border: 'transparent',
    shadow: 'inset 0 -2px 0 #ffffff',
  },
}

const overlay = {
  rest: {
    foreground: 'var(--text-primary)',
    background: 'var(--bg-primary)',
    border: 'var(--border)',
    shadow: 'none',
  },
  hover: {
    foreground: 'var(--text-primary)',
    background: 'var(--hover-bg)',
    border: 'var(--border)',
    shadow: 'none',
  },
  press: {
    foreground: 'var(--text-primary)',
    background: 'var(--active-bg)',
    border: 'var(--border)',
    shadow: 'none',
  },
  selected: {
    foreground: '#ffffff',
    background: '#111111',
    border: '#111111',
    shadow: 'none',
  },
  selectedHover: {
    foreground: '#ffffff',
    background: '#333333',
    border: '#111111',
    shadow: 'none',
  },
  selectedPress: {
    foreground: '#ffffff',
    background: '#000000',
    border: '#111111',
    shadow: 'none',
  },
}

export const minimalControlOverrides = {
  app: {
    action: {
      typography: { fontWeight: '500' },
    },
    quiet: {
      ...underline,
      typography: { fontWeight: '400' },
    },
    choice: {
      ...underline,
      typography: { fontWeight: '400' },
    },
  },
  viewer: {
    action: viewer,
    quiet: viewer,
    choice: viewer,
  },
  overlay,
} satisfies ControlThemeOverrides
