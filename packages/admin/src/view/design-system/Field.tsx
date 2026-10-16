import type { Atom } from '@reatom/core'

import { Icon } from './Icon'
import { controlBase, focusVisible, visuallyHidden } from './mixins'
import { radius, size, tokens, type } from './tokens'

export interface SearchFieldProps {
  value: Atom<string>
  label: string
  placeholder: string
  testId?: string
  shortcut?: string
}

export const SearchField = ({
  value,
  label,
  placeholder,
  testId,
  shortcut = '⌘K',
}: SearchFieldProps) => {
  return (
    <label
      css={`
        display: flex;
        align-items: center;
        flex: 1 1 8rem;
        min-width: min(8rem, 100%);
        position: relative;
        ${type.ui}
        color: ${tokens.text2};
      `}
    >
      <span css={visuallyHidden}>{label}</span>
      <span
        aria-hidden="true"
        css={`
          position: absolute;
          inset-inline-start: var(--admin-space-8);
          display: inline-flex;
          color: ${tokens.text3};
          pointer-events: none;
        `}
      >
        <Icon name="search" />
      </span>
      <input
        type="search"
        placeholder={placeholder}
        model:value={value}
        data-testid={testId}
        aria-label={label}
        css={`
          ${controlBase}
          ${focusVisible}
          width: 100%;
          min-width: 0;
          padding-inline: 2rem 2.4rem;
          background: ${tokens.surface2};
          color: ${tokens.text1};
          ${type.data}
          border-radius: ${radius[6]};
        `}
      />
      {shortcut ? (
        <kbd
          css={`
            ${type.meta}
            position: absolute;
            inset-inline-end: var(--admin-space-8);
            color: ${tokens.text3};
            pointer-events: none;
          `}
        >
          {shortcut}
        </kbd>
      ) : null}
    </label>
  )
}

export interface SelectFieldProps<T extends string> {
  value: Atom<T>
  label: string
  options:
    | Array<{ value: T; label: string }>
    | (() => Array<{ value: T; label: string }>)
}

export const SelectField = <T extends string>({
  value,
  label,
  options,
}: SelectFieldProps<T>) => {
  const optionList = () => (typeof options === 'function' ? options() : options)
  return (
    <label
      css={`
        display: inline-flex;
        align-items: center;
        gap: var(--admin-space-6);
        ${type.ui}
        color: ${tokens.text2};
        flex: 0 0 auto;
      `}
    >
      <span css={visuallyHidden}>{label}</span>
      <select
        aria-label={label}
        model:value={value}
        css={`
          ${controlBase}
          ${focusVisible}
          padding-inline: var(--admin-space-8);
          background: ${tokens.surface2};
          color: ${tokens.text1};
          min-width: 6rem;
          border-radius: ${radius[6]};
        `}
      >
        {() =>
          optionList().map((option) => (
            <option
              value={option.value}
              prop:selected={() => value() === option.value}
            >
              {option.label}
            </option>
          ))
        }
      </select>
    </label>
  )
}

export interface NumberFieldProps {
  value: () => number | ''
  label: string
  min?: number
  step?: number
  placeholder?: string
  onChange: (next: number | '') => void
}

export const NumberField = ({
  value,
  label,
  min,
  step,
  placeholder,
  onChange,
}: NumberFieldProps) => {
  return (
    <label
      css={`
        display: grid;
        gap: var(--admin-space-4);
        ${type.meta}
        color: ${tokens.text2};
      `}
    >
      {label}
      <input
        type="number"
        min={min}
        step={step}
        placeholder={placeholder}
        prop:value={value}
        css={`
          ${controlBase}
          ${focusVisible}
          padding-inline: var(--admin-space-8);
          background: ${tokens.surface2};
          color: ${tokens.text1};
          min-width: ${size.control};
        `}
        on:input={(event: Event) => {
          const target = event.currentTarget
          if (!(target instanceof HTMLInputElement)) return
          if (target.value === '') {
            onChange('')
            return
          }
          const nextValue = Number.parseInt(target.value, 10)
          if (Number.isNaN(nextValue)) return
          onChange(nextValue)
        }}
      />
    </label>
  )
}
