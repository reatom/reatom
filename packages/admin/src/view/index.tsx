import { mount } from '@reatom/jsx'

import type { AdminOptions } from '../index'
import { createAdmin } from '../index'
import { ADMIN_FRAME } from '../root'
import { AppShell } from './shell/AppShell'

export type { AdminDevtools, AdminDevtoolsOptions } from './shell/DevtoolsShell'
export { createAdminDevtools } from './shell/DevtoolsShell'

export function createAdminApp(
  target: Element,
  options?: AdminOptions,
): { admin: ReturnType<typeof createAdmin>; unmount: () => void } {
  const admin = createAdmin(options)
  const app = ADMIN_FRAME.run(() => <AppShell admin={admin} />)
  const { unmount } = mount(target, app)
  return { admin, unmount }
}
