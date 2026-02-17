import type { Admin } from '../../index'
import { colors, flex, flexCol, scrollable } from '../styles'
import { Nav } from './Nav'

export interface LayoutProps {
  admin: Admin
  outlet: () => Array<Element>
}

export const Layout = ({ admin, outlet }: LayoutProps) => {
  return (
    <div
      css={`
        ${flex}
        ${flexCol}
        background: ${colors.bg};
        color: ${colors.text};
        min-height: 100%;
        font-size: 0.875rem;
      `}
    >
      <main
        css={`
          flex: 1;
          ${scrollable}
          min-height: 0;
        `}
      >
        {() => outlet().map((child) => child)}
      </main>
      <Nav admin={admin} />
    </div>
  )
}
