import { urlAtom } from '@reatom/core'

import type { Admin } from '../../index'
import { colors, flex, gap, px, py, rounded } from '../styles'

export interface NavProps {
  admin: Admin
}

const TAB_PATHS = [
  { path: '/', label: 'Log', icon: '📋' },
  { path: '/timeline', label: 'Timeline', icon: '📊' },
  { path: '/graph', label: 'Graph', icon: '🔗' },
  { path: '/filters', label: 'Filters', icon: '🔍' },
] as const

export const Nav = ({ admin }: NavProps) => {
  const frameCount = () => admin.store.frames().length
  const hasActiveFilters = () => admin.filters.engine.configs().length > 0

  return (
    <nav
      css={`
        ${flex}
        ${gap(2)}
        ${px(2)}
        ${py(1)}
        background: ${colors.surface};
        border-top: 1px solid ${colors.border};
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
              ${flex}
              ${gap(1)}
              ${px(2)}
              ${py(1)}
              ${rounded}
              border: none;
              background: ${() =>
                isActive() ? colors.highlight : 'transparent'};
              color: ${colors.text};
              cursor: pointer;
              font-size: 0.75rem;
            `}
            on:click={() => urlAtom.go(tab.path)}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.path === '/' && (
              <span
                css={`
                  ${rounded}
                  ${px(1)}
                  background: ${colors.border};
                  font-size: 0.65rem;
                `}
              >
                {frameCount}
              </span>
            )}
            {tab.path === '/filters' && hasActiveFilters() && (
              <span
                css={`
                  width: 6px;
                  height: 6px;
                  ${rounded}
                  background: ${colors.accent};
                `}
              />
            )}
          </button>
        )
      })}
    </nav>
  )
}
