import { label, mono } from '../../styles'

export const Primary = ({
  name,
  value,
  unit,
}: {
  name: string
  value: () => string
  unit: string
}) => (
  <div
    css={`
      display: grid;
      gap: 0.35rem;
    `}
  >
    <span css={label}>{name}</span>
    <span
      css={`
        display: flex;
        align-items: baseline;
        gap: 0.4rem;
      `}
    >
      <span
        css={`
          ${mono}
          font-size: clamp(1.75rem, 3vw, 2.5rem);
          font-weight: 300;
          letter-spacing: -0.02em;
          line-height: 1;
          color: var(--ink);
        `}
      >
        {value}
      </span>
      <span
        css={`
          ${mono}
          font-size: 0.8125rem;
          color: var(--ink-faint);
        `}
      >
        {unit}
      </span>
    </span>
  </div>
)

export const Spec = ({
  name,
  value,
}: {
  name: string
  value: () => string
}) => (
  <div
    css={`
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.45rem 0;
      border-bottom: 1px dashed var(--hairline);
    `}
  >
    <span
      css={`
        font-size: 0.75rem;
        letter-spacing: 0.04em;
        color: var(--ink-faint);
      `}
    >
      {name}
    </span>
    <span
      css={`
        ${mono}
        font-size: 0.8125rem;
        color: var(--ink);
        text-align: right;
      `}
    >
      {value}
    </span>
  </div>
)
