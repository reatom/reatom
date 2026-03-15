import { urlAtom } from '@reatom/core'

import type { Admin } from '../../index'
import { badge, buttonGhost, colors, flex, gap, px, py } from '../styles'

export interface NavProps {
  admin: Admin
}

const TAB_PATHS = [
  { path: '/', label: 'Activity', icon: '📋' },
  { path: '/timeline', label: 'Timeline', icon: '📊' },
  { path: '/graph', label: 'Graph', icon: '🔗' },
  { path: '/filters', label: 'Filters', icon: '🧪' },
] as const

export const Nav = ({ admin }: NavProps) => {
  const summary = () => admin.view.summary()

  return (
    <nav
      css={`
        ${flex}
        ${gap(1)}
        ${px(2)}
        ${py(1)}
        background: ${colors.bgElevated};
        border-top: 1px solid ${colors.border};
        justify-content: space-between;
        align-items: center;
      `}
    >
      <div
        css={`
          ${flex}
          ${gap(1)}
        `}
      >
        {TAB_PATHS.map((tab) => {
          const isActive = () =>
            urlAtom().pathname === tab.path ||
            (tab.path === '/' && urlAtom().pathname === '/')
          return (
            <button
              type="button"
              css={`
                ${buttonGhost}
                ${flex}
                ${gap(1)}
                background: ${() =>
                  isActive() ? colors.highlight : 'transparent'};
                color: ${() => (isActive() ? colors.text : colors.textMuted)};
                border-color: ${() =>
                  isActive() ? colors.accent : colors.borderStrong};
              `}
              on:click={() => urlAtom.go(tab.path)}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      <div
        css={`
          ${flex}
          ${gap(1)}
          flex-wrap: wrap;
          justify-content: flex-end;
        `}
      >
        {() => {
          const currentSummary = summary()
          return (
            <>
              <span
                css={`
                  ${badge}
                  background: ${colors.bg};
                  color: ${colors.textMuted};
                `}
              >
                {currentSummary.source === 'replay' ? 'Replay' : 'Live'}
              </span>
              <span
                css={`
                  ${badge}
                  background: ${colors.bg};
                  color: ${colors.textMuted};
                `}
              >
                {currentSummary.visibleFrames}/{currentSummary.totalFrames} visible
              </span>
              {currentSummary.errorFrames > 0 && (
                <span
                  css={`
                    ${badge}
                    background: ${colors.errorSoft};
                    border-color: ${colors.error};
                    color: ${colors.error};
                  `}
                >
                  {currentSummary.errorFrames} error
                  {currentSummary.errorFrames === 1 ? '' : 's'}
                </span>
              )}
              {currentSummary.highlightedFrames > 0 && (
                <span
                  css={`
                    ${badge}
                    background: ${colors.accentSoft};
                    border-color: ${colors.accent};
                    color: ${colors.accent};
                  `}
                >
                  {currentSummary.highlightedFrames} highlighted
                </span>
              )}
            </>
          )
        }}
      </div>
    </nav>
  )
}
