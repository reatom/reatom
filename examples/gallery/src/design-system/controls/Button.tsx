import type { JSX } from '@reatom/jsx'

import type { ControlRole, ControlSize, ControlSurface } from '../themeTypes'
import { type ActivationMode, createActivationHandlers } from './activation'
import { composeControlCss } from './controlStyles'
import {
  type ReactiveBoolean,
  type ReactiveString,
  resolveReactiveBoolean,
} from './shared'

export type ButtonAppearance = Exclude<ControlRole, 'switch'>
export type ChoiceSelection = 'pressed' | 'checked' | 'current'

export type ButtonProps = {
  label: ReactiveString
  onClick: () => void
  appearance?: ButtonAppearance
  surface?: ControlSurface
  size?: ControlSize
  disabled?: ReactiveBoolean
  selected?: ReactiveBoolean
  selection?: ChoiceSelection
  title?: ReactiveString
  expanded?: ReactiveBoolean
  bracket?: boolean
  describedBy?: string
  slot?: string
  activation?: ActivationMode
  stopPropagation?: boolean
  onBefore?: () => void
  type?: 'button' | 'submit'
  css?: string
  ref?: (element: HTMLButtonElement) => void | (() => void)
  children?: JSX.ElementChildren
}

export const Button = ({
  label,
  onClick,
  appearance = 'action',
  surface = 'app',
  size = 'md',
  disabled,
  selected,
  selection,
  title,
  expanded,
  bracket,
  describedBy,
  slot,
  activation = 'click',
  stopPropagation = false,
  onBefore,
  type = 'button',
  css,
  ref,
  children,
}: ButtonProps) => {
  const handlers = createActivationHandlers(onClick, {
    mode: activation,
    disabled: () => resolveReactiveBoolean(disabled),
    stopPropagation,
    onBefore,
  })
  const selectedValue =
    selected === undefined ? undefined : () => resolveReactiveBoolean(selected)
  const selectionMode =
    selection ?? (selected === undefined ? undefined : 'pressed')

  return (
    <button
      type={type}
      data-ui="button"
      data-ui-role={appearance}
      data-ui-surface={surface}
      data-ui-size={size}
      data-terminal-bracket={bracket ? 'true' : undefined}
      data-ui-slot={slot}
      attr:aria-describedby={describedBy}
      attr:data-ui-selected={selectedValue}
      role={selectionMode === 'checked' ? 'checkbox' : undefined}
      aria-pressed={selectionMode === 'pressed' ? selectedValue : undefined}
      aria-checked={selectionMode === 'checked' ? selectedValue : undefined}
      attr:aria-current={
        selectionMode === 'current'
          ? () => (selectedValue?.() ? 'true' : undefined)
          : undefined
      }
      aria-label={label}
      title={title ?? (size === 'icon' ? label : undefined)}
      aria-expanded={
        expanded === undefined
          ? undefined
          : () => resolveReactiveBoolean(expanded)
      }
      prop:disabled={() => resolveReactiveBoolean(disabled)}
      css={composeControlCss(surface, appearance, size, css)}
      ref={ref}
      {...handlers}
    >
      {children ?? label}
    </button>
  )
}
