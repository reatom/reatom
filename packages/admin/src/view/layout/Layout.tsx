import type { Computed, RouteChild } from '@reatom/core'

import type { Admin } from '../../index'
import { HeaderBar } from '../components/HeaderBar'
import { colors, p, scrollable } from '../styles'
import { Nav } from './Nav'

export interface LayoutProps {
  admin: Admin
  outlet: Computed<RouteChild[]>
}

export const Layout = ({ admin, outlet }: LayoutProps) => {
  return (
    <div
      css={`
        display: grid;
        grid-template-rows: auto minmax(0, 1fr) auto;
        background: ${colors.bg};
        color: ${colors.text};
        height: 100%;
        min-height: 0;
        font-size: 0.875rem;
      `}
    >
      <div
        css={`
          ${p(2)}
          padding-bottom: 0;
        `}
      >
        <HeaderBar admin={admin} />
      </div>
      <main
        css={`
          ${scrollable}
          min-height: 0;
          ${p(2)}
        `}
      >
        {outlet}
      </main>
      <Nav admin={admin} />
    </div>
  )
}
