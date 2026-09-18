import type { Atom } from '@reatom/core'
import type { JSX } from '@reatom/jsx'

import { label, mono, segmented, switchInput } from '../../styles'

export const Section = ({
  title,
  children,
}: {
  title: string
  children: JSX.Element | JSX.Element[]
}) => (
  <section
    css={`
      display: grid;
      gap: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--hairline);

      &:first-child {
        padding-top: 0;
        border-top: 0;
      }
    `}
  >
    <h2
      css={`
        ${label}
        margin: 0;
        font-size: 0.625rem;
        color: var(--ink-faint);
      `}
    >
      {title}
    </h2>
    {children}
  </section>
)

export const FieldHead = ({
  name,
  value,
}: {
  name: string
  value: Atom<string> | (() => string)
}) => (
  <div
    css={`
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 1rem;
    `}
  >
    <span css={label}>{name}</span>
    <span
      css={`
        ${mono}
        font-size: 0.9375rem;
        color: var(--ink);
      `}
    >
      {value}
    </span>
  </div>
)

export const Segmented = <T extends string>({
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
  <div
    css={`
      display: grid;
      gap: 0.5rem;
    `}
  >
    <span css={label}>{name}</span>
    <div role="radiogroup" aria-label={name} css={segmented}>
      {options.map((option) => (
        <button
          type="button"
          role="radio"
          attr:aria-checked={() => value() === option}
          on:click={() => value.set(option)}
        >
          {render(option)}
        </button>
      ))}
    </div>
  </div>
)

export const Switch = ({
  name,
  note,
  checked,
}: {
  name: string
  note: string
  checked: Atom<boolean> & { set: (next: boolean) => boolean }
}) => (
  <label
    css={`
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      cursor: pointer;
    `}
  >
    <span
      css={`
        display: grid;
        gap: 0.15rem;
      `}
    >
      <span css={label}>{name}</span>
      <span
        css={`
          font-size: 0.75rem;
          color: var(--ink-faint);
        `}
      >
        {note}
      </span>
    </span>
    <input type="checkbox" model:checked={checked} css={switchInput} />
  </label>
)

export const chip = `
  appearance: none;
  padding: 0.35rem 0.6rem;
  border: 1px solid var(--hairline);
  border-radius: 1px;
  background: transparent;
  color: var(--ink-dim);
  font-family: var(--font-ui);
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    color 160ms ease,
    border-color 160ms ease,
    opacity 160ms ease;

  &:hover:not(:disabled) {
    color: var(--ink);
    border-color: var(--ink-faint);
  }

  &:focus-visible {
    outline: 1px solid var(--accent);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
`
