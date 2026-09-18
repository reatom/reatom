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

export const keyboardActivate = (action: () => void) => ({
  'on:keydown': (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    action()
  },
})

export const focusableCardAttrs = (label: string, action: () => void) => ({
  role: 'button' as const,
  tabindex: 0,
  'aria-label': label,
  ...keyboardActivate(action),
})

export const focusableRowAttrs = (label: string, action: () => void) => ({
  tabindex: 0,
  'aria-label': label,
  ...keyboardActivate(action),
})
