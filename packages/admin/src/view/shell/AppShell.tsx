import type { Admin } from '../../index'
import { createAdminRoutes } from '../routes'
import { colors } from '../styles'

export interface AppShellProps {
  admin: Admin
}

export const AppShell = ({ admin }: AppShellProps) => {
  const routes = createAdminRoutes(admin)
  const content = () => routes.layoutRoute.render()

  return (
    <div
      css={`
        height: 100%;
        min-height: 100vh;
        background:
          radial-gradient(circle at top, rgba(139, 183, 255, 0.12), transparent 32%),
          linear-gradient(180deg, ${colors.bgElevated} 0%, ${colors.bg} 28%, ${colors.bg} 100%);
        font-family:
          Inter,
          ui-sans-serif,
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          'Segoe UI',
          sans-serif;
      `}
    >
      {() => content()}
    </div>
  )
}
