import type { JSX } from '@reatom/jsx'

import { label, mono } from '../../styles'

export const Formula = ({
  children,
}: {
  children: string | (() => string)
}) => (
  <p
    css={`
      ${mono}
      margin: 0;
      padding: 0.7rem 0.9rem;
      border-left: 2px solid var(--accent);
      background: var(--paper-deep);
      font-size: 0.8125rem;
      line-height: 1.55;
      color: var(--accent);
    `}
  >
    {children}
  </p>
)

export const Section = ({
  index,
  title,
  children,
}: {
  index: string
  title: string
  children: JSX.Element | JSX.Element[]
}) => (
  <section
    css={`
      display: grid;
      gap: 0.75rem;
      align-content: start;
    `}
  >
    <h3
      css={`
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0.65rem 1rem;
        margin: 0;
        font-size: 1.05rem;
        font-weight: 500;
        letter-spacing: 0.02em;
      `}
    >
      <span
        css={`
          ${label}
          font-size: 0.625rem;
          color: var(--accent);
        `}
      >
        {index}
      </span>
      {title}
    </h3>
    {children}
  </section>
)

export const prose = `
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.65;
  color: var(--ink-dim);
`
