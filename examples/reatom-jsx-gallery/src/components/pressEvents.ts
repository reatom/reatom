type PressEventsOptions = {
  stopPropagation?: boolean
}

export const pressEvents = (
  action: () => void,
  { stopPropagation = true }: PressEventsOptions = {},
) => ({
  'on:mousedown': (event: MouseEvent) => {
    if (event.button !== 0) return
    if (stopPropagation) event.stopPropagation()
    action()
  },
  'on:click': (event: PointerEvent) => {
    event.preventDefault()
    if (stopPropagation) event.stopPropagation()
  },
  'on:keydown': (event: KeyboardEvent) => {
    if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    if (stopPropagation) event.stopPropagation()
    action()
  },
})
