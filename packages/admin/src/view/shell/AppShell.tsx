import type { Admin } from '../../index'
import { createAdminRoutes } from '../routes'
import { colors } from '../styles'

export interface AppShellProps {
  admin: Admin
}

export const AppShell = ({ admin }: AppShellProps) => {
  const routes = createAdminRoutes(admin)

  return (
    <div
      css={`
        height: 100%;
        min-height: 100vh;
        background: ${colors.bg};
        font-family: system-ui, sans-serif;
      `}
    >
      {routes.layoutRoute.render}
    </div>
  )
}
