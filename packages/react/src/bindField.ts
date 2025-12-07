import type { FieldAtom, Rec } from '@reatom/core'
import { abortVar, memoKey, notify, wrap } from '@reatom/core'
import type { ChangeEvent } from 'react'

export function bindField<T = any>(
  field: FieldAtom<any, T>,
): {
  value: T extends boolean ? undefined : T
  checked: T extends boolean ? boolean : undefined
  onChange: (
    value:
      | T
      | { currentTarget: T extends boolean ? { checked: T } : { value: T } }
      | ChangeEvent<{ value: T }>,
  ) => void
  onBlur: () => void
  onFocus: () => void
  error: undefined | string
} {
  const create = () => {
    const onChange = wrap((event: any) => {
      const isEvent = !!event?.currentTarget?.addEventListener
      const value = isEvent
        ? event.currentTarget.type === 'checkbox'
          ? event.currentTarget.checked
          : event.currentTarget.value
        : event

      field.change(value)
      notify()
    })

    const onBlur = wrap(() => {
      field.focus.out()
      notify()
    })
    const onFocus = wrap(() => {
      field.focus.in()
      notify()
    })

    const controller = abortVar.get()

    return { onChange, onBlur, onFocus, field, controller }
  }

  const value = field.value()

  let ref = memoKey(field.name, () => ({
    current: create(),
  }))
  if (ref.current.controller?.signal.aborted || ref.current.field !== field) {
    ref.current = create()
  }

  const { onChange, onBlur, onFocus } = ref.current

  const { error } = field.validation()

  const result: Rec = {
    onChange,
    onBlur,
    onFocus,
    error,
  }

  if (typeof value === 'boolean') {
    result.checked = value
  } else {
    result.value = value
  }

  // @ts-expect-error generic overloads
  return result
}
