import type { Atom } from '@reatom/core'

import { label } from '../../styles'

export const Select = <T extends string>({
  name,
  value,
  options,
  render,
}: {
  name: string
  value: Atom<T> & { set: (next: T) => T }
  options: ReadonlyArray<T>
  render: (option: T) => string
}) => (
  <label
    css={`
      display: grid;
      gap: 0.5rem;
    `}
  >
    <span css={label}>{name}</span>
    <select
      prop:value={() => value()}
      on:change={(event) => {
        const next = options.find(
          (option) => option === event.currentTarget.value,
        )
        if (next !== undefined) value.set(next)
      }}
      css={`
        appearance: none;
        width: 100%;
        padding: 0.5rem 0.65rem;
        border: 1px solid var(--hairline);
        border-radius: 1px;
        background: var(--paper-deep);
        color: var(--ink);
        font-family: var(--font-ui);
        font-size: 0.8125rem;
        letter-spacing: 0.04em;
        cursor: pointer;

        &:focus-visible {
          outline: 1px solid var(--accent);
          outline-offset: 1px;
        }
      `}
    >
      {options.map((option) => (
        <option value={option}>{render(option)}</option>
      ))}
    </select>
  </label>
)
