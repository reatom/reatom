import { colors, p, panelTitle, roundedLg } from '../styles'

export interface EmptyStateCardProps {
  title: string
  description: string
  action?: Element | null
}

export const EmptyStateCard = ({
  title,
  description,
  action = null,
}: EmptyStateCardProps) => {
  return (
    <div
      css={`
        ${p(4)}
        ${roundedLg}
        border: 1px dashed ${colors.borderStrong};
        background:
          radial-gradient(circle at top, ${colors.accentSoft}, transparent 55%),
          ${colors.surface};
        color: ${colors.text};
        text-align: left;
      `}
    >
      <h3
        css={`
          ${panelTitle}
          margin-bottom: 0.5rem;
        `}
      >
        {title}
      </h3>
      <p
        css={`
          margin: 0;
          color: ${colors.textMuted};
          line-height: 1.5;
        `}
      >
        {description}
      </p>
      {action && (
        <div
          css={`
            margin-top: 1rem;
          `}
        >
          {action}
        </div>
      )}
    </div>
  )
}
