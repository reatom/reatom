import {
  action,
  atom,
  computed,
  withAsync,
  withLocalStorage,
  wrap,
} from '@reatom/core'
import { z } from 'zod/v4'

import { fakeBackend } from '../../shared/api/fakeBackend'
import type { Session, User } from '../../shared/api/types'

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'manager', 'viewer']),
  title: z.string(),
  avatarColor: z.string(),
})

const sessionSchema = z
  .object({
    token: z.string(),
    user: userSchema,
  })
  .nullable()

export const sessionAtom = atom<Session | null>(null, 'auth.session').extend(
  withLocalStorage({
    key: 'reatom-mantine-dashboard.session',
    version: 1,
    schema: sessionSchema,
  }),
)

export const currentUserAtom = computed(
  () => sessionAtom()?.user ?? null,
  'auth.currentUser',
)

export const isAuthenticatedAtom = computed(
  () => sessionAtom() !== null,
  'auth.isAuthenticated',
)

export const requireSession = () => {
  const session = sessionAtom()
  if (!session) throw new Error('Not authenticated')
  return session
}

export const syncSessionUserAction = action((user: User) => {
  const session = sessionAtom()
  if (session) sessionAtom.set({ ...session, user })
}, 'auth.syncSessionUser')

export const logoutAction = action(async () => {
  const session = sessionAtom()
  if (session) await wrap(fakeBackend.logout(session.token))
  sessionAtom.set(null)
}, 'auth.logout').extend(withAsync({ status: true }))
