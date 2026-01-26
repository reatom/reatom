import type { FieldAtom, FieldValidation } from '@reatom/core'
import { notify, wrap } from '@reatom/core'
import type { Accessor } from 'solid-js'

import { useAtom, useFrame } from './index'

export function bindField<T = any>(
  field: FieldAtom<any, T>,
): {
  value: Accessor<T>
  validation: Accessor<FieldValidation>
  props: {
    value: T extends boolean ? undefined : T
    checked: T extends boolean ? boolean : undefined
    onChange: (
      value:
        | T
        | { currentTarget: T extends boolean ? { checked: T } : { value: T } }
        | Event,
    ) => void
    onBlur: () => void
    onFocus: () => void
  }
} {
  const frame = useFrame()

  const onChange = wrap((event: any) => {
    const isEvent = !!event?.currentTarget?.addEventListener
    const value = isEvent
      ? event.currentTarget.type === 'checkbox'
        ? event.currentTarget.checked
        : event.currentTarget.value
      : event

    field.change(value)
    notify()
  }, frame)

  const onBlur = wrap(() => {
    field.focus.out()
    notify()
  }, frame)
  
  const onFocus = wrap(() => {
    field.focus.in()
    notify()
  }, frame)

  const [valueAccessor] = useAtom(field.value)
  const [validationAccessor] = useAtom(field.validation)

  const props = {
    onChange,
    onBlur,
    onFocus,
    get value() { 
      const value = valueAccessor()
      return (typeof value === 'boolean' ? undefined : value) as T extends boolean ? undefined : T
    },
    get checked() { 
      const value = valueAccessor()
      return (typeof value === 'boolean' ? value : undefined) as T extends boolean ? boolean : undefined
    },
  }

  return {
    value: valueAccessor,
    validation: validationAccessor,
    props,
  }
}
