import type { Admin } from '../../index'
import { formatRelativeCount } from '../format'
import {
  badge,
  cardRaised,
  colors,
  flex,
  flexWrap,
  gap,
  p,
  rounded,
} from '../styles'

export interface SummaryCardsProps {
  admin: Admin
}

interface SummaryItem {
  label: string
  value: string
  tone: 'default' | 'accent' | 'success' | 'warning' | 'error'
}

function getToneColors(tone: SummaryItem['tone']): {
  background: string
  borderColor: string
  textColor: string
} {
  switch (tone) {
    case 'accent':
      return {
        background: colors.accentSoft,
        borderColor: colors.accent,
        textColor: colors.accent,
      }
    case 'success':
      return {
        background: colors.successSoft,
        borderColor: colors.success,
        textColor: colors.success,
      }
    case 'warning':
      return {
        background: colors.warningSoft,
        borderColor: colors.warning,
        textColor: colors.warning,
      }
    case 'error':
      return {
        background: colors.errorSoft,
        borderColor: colors.error,
        textColor: colors.error,
      }
    default:
      return {
        background: colors.surface,
        borderColor: colors.borderStrong,
        textColor: colors.text,
      }
  }
}

export const SummaryCards = ({ admin }: SummaryCardsProps) => {
  const summary = () => admin.view.summary()

  const items = (): Array<SummaryItem> => [
    {
      label: 'Captured',
      value: formatRelativeCount(summary().totalFrames, 'frame'),
      tone: 'accent',
    },
    {
      label: 'Visible',
      value: formatRelativeCount(summary().visibleFrames, 'frame'),
      tone: 'success',
    },
    {
      label: 'Hidden',
      value: formatRelativeCount(summary().hiddenFrames, 'frame'),
      tone: 'warning',
    },
    {
      label: 'Errors',
      value: formatRelativeCount(summary().errorFrames, 'error'),
      tone: summary().errorFrames > 0 ? 'error' : 'default',
    },
    {
      label: 'Atoms',
      value: formatRelativeCount(summary().uniqueAtoms, 'atom'),
      tone: 'default',
    },
  ]

  return (
    <div
      css={`
        ${flex}
        ${gap(2)}
        ${flexWrap}
      `}
    >
      {() =>
        items().map((item) => {
          const toneColors = getToneColors(item.tone)
          return (
            <section
              css={`
                ${cardRaised}
                ${p(2)}
                min-width: 9rem;
                flex: 1 1 10rem;
              `}
            >
              <div
                css={`
                  ${badge}
                  width: fit-content;
                  background: ${toneColors.background};
                  border-color: ${toneColors.borderColor};
                  color: ${toneColors.textColor};
                `}
              >
                {item.label}
              </div>
              <div
                css={`
                  margin-top: 0.75rem;
                  font-size: 1.2rem;
                  font-weight: 700;
                  color: ${colors.text};
                `}
              >
                {item.value}
              </div>
              <div
                css={`
                  margin-top: 0.4rem;
                  ${rounded}
                  color: ${colors.textSubtle};
                  font-size: 0.72rem;
                `}
              >
                {item.label === 'Visible'
                  ? 'after all current filters'
                  : item.label === 'Hidden'
                    ? 'filtered from the main activity feed'
                    : item.label === 'Captured'
                      ? 'current session data source'
                      : item.label === 'Errors'
                        ? 'frames with a captured error'
                        : 'distinct atoms in the workspace'}
              </div>
            </section>
          )
        })
      }
    </div>
  )
}
