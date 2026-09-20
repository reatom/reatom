export const srOnlyCss = `
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`

export const isNativeActivationTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return (
    target.closest(
      'button, [data-ui], a, input, textarea, select, [role="button"]',
    ) !== null
  )
}

export const keyboardActivate = (action: () => void) => ({
  'on:keydown': (event: KeyboardEvent) => {
    if (event.target !== event.currentTarget) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    event.stopPropagation()
    action()
  },
})

export const focusableCardAttrs = (
  label: string | (() => string),
  action: () => void,
) => ({
  role: 'button' as const,
  tabindex: 0,
  'aria-label': typeof label === 'function' ? label : () => label,
  ...keyboardActivate(action),
})

export const focusableRowAttrs = (label: string, action: () => void) => ({
  tabindex: 0,
  'aria-label': label,
  ...keyboardActivate(action),
})
