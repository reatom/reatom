import { mono } from './type'

export const rangeInput = `
  appearance: none;
  width: 100%;
  height: 1.5rem;
  margin: 0;
  background: transparent;
  cursor: pointer;

  &::-webkit-slider-runnable-track {
    height: 1px;
    background: var(--ink-faint);
  }

  &::-moz-range-track {
    height: 1px;
    background: var(--ink-faint);
  }

  &::-webkit-slider-thumb {
    appearance: none;
    width: 0.625rem;
    height: 1.125rem;
    margin-top: -0.5625rem;
    border: 1px solid var(--accent);
    border-radius: 1px;
    background: var(--paper);
    transition: background-color 160ms ease;
  }

  &::-moz-range-thumb {
    width: 0.625rem;
    height: 1.125rem;
    border: 1px solid var(--accent);
    border-radius: 1px;
    background: var(--paper);
  }

  &:hover::-webkit-slider-thumb,
  &:focus-visible::-webkit-slider-thumb {
    background: var(--accent);
  }

  &:focus-visible {
    outline: none;
  }
`

export const numberInput = `
  ${mono}
  width: 4.75rem;
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--hairline);
  border-radius: 1px;
  background: var(--paper-deep);
  color: var(--ink);
  font-size: 0.875rem;
  text-align: right;

  &:focus-visible {
    outline: 1px solid var(--accent);
    outline-offset: 1px;
  }
`

export const segmented = `
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 4.5rem), 1fr));
  gap: 1px;
  border: 1px solid var(--hairline);
  border-radius: 1px;
  background: var(--hairline);

  & > button {
    appearance: none;
    min-width: 0;
    padding: 0.45rem 0.3rem;
    border: 0;
    background: var(--paper-deep);
    color: var(--ink-faint);
    font-family: var(--font-ui);
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: var(--segment-tracking);
    line-height: 1.2;
    overflow-wrap: break-word;
    text-transform: uppercase;
    cursor: pointer;
    transition:
      color 160ms ease,
      background-color 160ms ease;

    &:hover {
      color: var(--ink);
    }

    &[aria-checked='true'] {
      color: var(--paper-deep);
      background: var(--accent);
    }

    &:focus-visible {
      outline: 1px solid var(--accent);
      outline-offset: -1px;
    }
  }
`

export const switchInput = `
  appearance: none;
  position: relative;
  width: 2rem;
  height: 1rem;
  margin: 0;
  border: 1px solid var(--ink-faint);
  border-radius: 1px;
  background: var(--paper-deep);
  cursor: pointer;
  transition: border-color 160ms ease;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: calc(50% - 3px);
    height: calc(100% - 4px);
    background: var(--ink-faint);
    transition:
      transform 160ms ease,
      background-color 160ms ease;
  }

  &:checked {
    border-color: var(--accent);
  }

  &:checked::after {
    transform: translateX(calc(100% + 2px));
    background: var(--accent);
  }

  &:focus-visible {
    outline: 1px solid var(--accent);
    outline-offset: 2px;
  }
`
