export const colors = {
  bg: 'var(--admin-bg, #1e1e2e)',
  surface: 'var(--admin-surface, #2a2a3e)',
  surfaceElevated: 'var(--admin-surface-elevated, #31324a)',
  surfaceSoft: 'var(--admin-surface-soft, rgba(69, 71, 90, 0.22))',
  text: 'var(--admin-text, #cdd6f4)',
  textMuted: 'var(--admin-text-muted, #a6adc8)',
  accent: 'var(--admin-accent, #89b4fa)',
  accentSoft: 'var(--admin-accent-soft, rgba(137, 180, 250, 0.16))',
  error: 'var(--admin-error, #f38ba8)',
  errorSoft: 'var(--admin-error-soft, rgba(243, 139, 168, 0.18))',
  success: 'var(--admin-success, #a6e3a1)',
  successSoft: 'var(--admin-success-soft, rgba(166, 227, 161, 0.18))',
  highlight: 'var(--admin-highlight, rgba(137, 180, 250, 0.2))',
  border: 'var(--admin-border, #45475a)',
}

export const space = [0, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4] as const
export type Size = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export const p = (n: Size) => `padding: ${space[n]}rem;`
export const px = (n: Size) => `padding-inline: ${space[n]}rem;`
export const py = (n: Size) => `padding-block: ${space[n]}rem;`
export const m = (n: Size) => `margin: ${space[n]}rem;`
export const mx = (n: Size) => `margin-inline: ${space[n]}rem;`
export const my = (n: Size) => `margin-block: ${space[n]}rem;`

export const bg = (color: string) => `background: ${color};`
export const text = (color: string) => `color: ${color};`
export const rounded = 'border-radius: 8px;'
export const roundedSm = 'border-radius: 4px;'

export const flex = 'display: flex;'
export const flexCol = 'flex-direction: column;'
export const flexCenter = 'justify-content: center; align-items: center;'
export const gap = (n: Size) => `gap: ${space[n]}rem;`

export const card = `${bg(colors.surface)} ${rounded} border: 1px solid ${colors.border};`
export const scrollable = 'overflow-y: auto; -webkit-overflow-scrolling: touch;'
export const truncate =
  'overflow: hidden; text-overflow: ellipsis; white-space: nowrap;'
export const shadowLg = 'box-shadow: 0 18px 40px rgba(0, 0, 0, 0.24);'
export const shadowSm = 'box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);'
export const transitionBase =
  'transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;'
export const focusRing = `outline: 2px solid ${colors.accent}; outline-offset: 2px;`
export const mono =
  'font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;'
