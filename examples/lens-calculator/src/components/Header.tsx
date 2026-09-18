import { designation, estimate } from '../model'
import { formatSpecs } from '../optics'
import { label, mono } from '../styles'

const Wordmark = () => (
  <div
    css={`
      display: flex;
      align-items: baseline;
      gap: 0.85rem;
    `}
  >
    <span
      css={`
        font-family: var(--font-ui);
        font-size: 1.5rem;
        font-weight: 600;
        letter-spacing: 0.32em;
        text-transform: uppercase;
        color: var(--ink);
      `}
    >
      Prime
    </span>
    <span
      css={`
        ${label}
        font-size: 0.625rem;
        letter-spacing: 0.26em;
        color: var(--ink-faint);
      `}
    >
      lens envelope estimator
    </span>
  </div>
)

const Designation = () => (
  <div
    css={`
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.4rem 1.25rem;
    `}
  >
    <span
      css={`
        ${mono}
        font-size: 1.25rem;
        font-weight: 300;
        color: var(--accent);
      `}
    >
      {designation}
    </span>
    <span
      css={`
        ${label}
        font-size: 0.625rem;
      `}
    >
      {() =>
        `${formatSpecs[estimate().spec.format].label} · ${estimate().mount.label}`
      }
    </span>
    <span
      css={`
        ${label}
        font-size: 0.625rem;
        color: var(--ink-faint);
      `}
    >
      first-order estimate · ±25 %
    </span>
  </div>
)

export const Header = () => (
  <header
    css={`
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.75rem 2rem;
      padding: 0 0.25rem;
      animation: prime-rise 500ms ease-out backwards;
    `}
  >
    <Wordmark />
    <Designation />
  </header>
)
