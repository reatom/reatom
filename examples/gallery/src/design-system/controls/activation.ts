import { pressEvents } from './pressEvents'

export type ActivationMode = 'click' | 'press'

export type ActivationOptions = {
  mode?: ActivationMode
  disabled?: () => boolean
  stopPropagation?: boolean
  onBefore?: () => void
}

export const createActivationHandlers = (
  action: () => void,
  {
    mode = 'click',
    disabled,
    stopPropagation = false,
    onBefore,
  }: ActivationOptions = {},
) => {
  const run = () => {
    if (disabled?.()) return
    onBefore?.()
    action()
  }

  if (mode === 'press') {
    const press = pressEvents(run, { stopPropagation })
    let armedByPointer = false
    return {
      'on:mousedown': (event: MouseEvent) => {
        if (disabled?.()) return
        if (event.button !== 0) return
        armedByPointer = true
        press['on:mousedown'](event)
      },
      'on:click': (event: PointerEvent) => {
        if (disabled?.()) {
          event.preventDefault()
          if (stopPropagation) event.stopPropagation()
          return
        }
        if (armedByPointer) {
          armedByPointer = false
          press['on:click'](event)
          return
        }
        if (stopPropagation) event.stopPropagation()
        run()
      },
      'on:keydown': (event: KeyboardEvent) => {
        if (disabled?.()) return
        press['on:keydown'](event)
      },
    }
  }

  return {
    'on:click': (event: MouseEvent) => {
      if (disabled?.()) return
      if (stopPropagation) event.stopPropagation()
      onBefore?.()
      action()
    },
  }
}
