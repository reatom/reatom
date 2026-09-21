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

export const Quote = ({
  children,
  cite,
}: {
  children: string
  cite: string
}) => (
  <blockquote
    css={`
      margin: 0;
      padding: 0.7rem 0.9rem;
      border-left: 2px solid var(--hairline);
      color: var(--ink-dim);
      font-size: 0.875rem;
      line-height: 1.55;
      font-style: italic;
    `}
  >
    <p
      css={`
        margin: 0;
      `}
    >
      {children}
    </p>
    <footer
      css={`
        ${label}
        margin-top: 0.45rem;
        font-style: normal;
        font-size: 0.5625rem;
        color: var(--ink-faint);
      `}
    >
      {cite}
    </footer>
  </blockquote>
)

export const Code = ({
  caption,
  children,
}: {
  caption: string
  children: string
}) => (
  <figure
    css={`
      margin: 0;
      display: grid;
      gap: 0.45rem;
    `}
  >
    <figcaption
      css={`
        ${label}
        font-size: 0.625rem;
        color: var(--accent);
      `}
    >
      {caption}
    </figcaption>
    <pre
      css={`
        ${mono}
        margin: 0;
        padding: 0.85rem 0.95rem;
        overflow-x: auto;
        background: var(--paper-deep);
        border: 1px solid var(--hairline);
        font-size: 0.75rem;
        line-height: 1.5;
        color: var(--ink);
      `}
    >
      <code>{children}</code>
    </pre>
  </figure>
)
