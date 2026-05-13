import {
  action,
  atom,
  reatomRoute,
  sleep,
  urlAtom,
  withAsync,
  withChangeHook,
  withRollback,
  withTransaction,
  wrap,
} from '@reatom/core'
import { z } from 'zod/v4'

import {
  currentUserAtom,
  isAuthenticatedAtom,
  logoutAction,
  requireSession,
  sessionAtom,
  syncSessionUserAction,
} from '../features/auth/authModel'
import {
  reatomLoginForm,
  reatomRegisterForm,
} from '../features/auth/authForms'
import { LoginPage } from '../features/auth/LoginPage'
import { RegisterPage } from '../features/auth/RegisterPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { ProjectCreatePage } from '../features/projects/ProjectCreatePage'
import { ProjectDetailsPage } from '../features/projects/ProjectDetailsPage'
import { ProjectsPage } from '../features/projects/ProjectsPage'
import {
  reatomProjectCreateForm,
  reatomProjectFilterForm,
  toProjectCreateInput,
} from '../features/projects/projectForms'
import {
  colorSchemeAtom,
  densityAtom,
  emailDigestAtom,
  settingsSnapshotAtom,
  sidebarCollapsedAtom,
} from '../features/settings/settingsModel'
import { reatomSettingsForm } from '../features/settings/settingsForm'
import { SettingsPage } from '../features/settings/SettingsPage'
import { fakeBackend } from '../shared/api/fakeBackend'
import type {
  ProjectListQuery,
  ProjectStatus,
} from '../shared/api/types'
import { statusFilters } from '../shared/api/types'
import { showToastAction } from '../shared/toasts/toastModel'
import { NotFoundPage } from '../shared/ui/NotFoundPage'
import { PageError, PageLoader } from '../shared/ui/PageState'
import { PrivateAppShell } from './PrivateAppShell'

const projectSearchSchema = z.object({
  q: z.string().default(''),
  status: z.enum(statusFilters).default('all'),
  page: z.string().regex(/^[1-9]\d*$/).default('1'),
})

const projectSearchParams = ({
  q = '',
  status = 'all',
  page = 1,
}: Partial<ProjectListQuery> = {}) => ({
  q: q.trim(),
  status,
  page: String(page),
})

export const rootRoute = reatomRoute(
  {
    path: '',
    layout: true,
    render(self) {
      return <>{self.outlet()}</>
    },
  },
  'routes.root',
)

export const loginRoute = rootRoute.reatomRoute(
  {
    path: 'login',
    params() {
      if (isAuthenticatedAtom()) {
        dashboardRoute.go(undefined, true)
        return null
      }
      return {}
    },
    async loader() {
      await wrap(sleep(80))
      const form = reatomLoginForm(async (values) => {
        const session = await wrap(fakeBackend.login(values))
        sessionAtom.set(session)
        showToastAction({
          title: 'Signed in',
          message: `Welcome back, ${session.user.name}`,
          color: 'green',
        })
        dashboardRoute.go(undefined, true)
        return session
      })

      return {
        form,
        goRegister: () => registerRoute.go(),
      }
    },
    render(self) {
      const status = self.loader.status()

      if (status.isFirstPending) return <PageLoader label="Preparing sign in..." />
      if (status.isFulfilled) {
        return (
          <div className="auth-shell">
            <LoginPage model={status.data} />
          </div>
        )
      }
      if (status.isPending && status.isEverSettled && status.data) {
        return (
          <div className="auth-shell">
            <LoginPage model={status.data} refreshing />
          </div>
        )
      }
      if (status.isRejected) {
        return (
          <PageError
            error={self.loader.error() ?? new Error('Failed to prepare sign in')}
            onRetry={wrap(() => self.loader.retry())}
          />
        )
      }
      return <PageLoader label="Preparing sign in..." />
    },
  },
  'routes.login',
)

export const registerRoute = rootRoute.reatomRoute(
  {
    path: 'register',
    params() {
      if (isAuthenticatedAtom()) {
        dashboardRoute.go(undefined, true)
        return null
      }
      return {}
    },
    async loader() {
      await wrap(sleep(80))
      const form = reatomRegisterForm(async (values) => {
        const session = await wrap(fakeBackend.register(values))
        sessionAtom.set(session)
        showToastAction({
          title: 'Workspace created',
          message: `Signed in as ${session.user.name}`,
          color: 'green',
        })
        dashboardRoute.go(undefined, true)
        return session
      })

      return {
        form,
        goLogin: () => loginRoute.go(),
      }
    },
    render(self) {
      const status = self.loader.status()

      if (status.isFirstPending) return <PageLoader label="Preparing registration..." />
      if (status.isFulfilled) {
        return (
          <div className="auth-shell">
            <RegisterPage model={status.data} />
          </div>
        )
      }
      if (status.isPending && status.isEverSettled && status.data) {
        return (
          <div className="auth-shell">
            <RegisterPage model={status.data} refreshing />
          </div>
        )
      }
      if (status.isRejected) {
        return (
          <PageError
            error={self.loader.error() ?? new Error('Failed to prepare registration')}
            onRetry={wrap(() => self.loader.retry())}
          />
        )
      }
      return <PageLoader label="Preparing registration..." />
    },
  },
  'routes.register',
)

export const privateRoute = rootRoute.reatomRoute(
  {
    layout: true,
    params() {
      if (loginRoute.match() || registerRoute.match()) return null

      if (!isAuthenticatedAtom()) {
        loginRoute.go(undefined, true)
        return null
      }

      return {}
    },
    render(self) {
      const outlet = self.outlet()
      return (
        <PrivateAppShell
          navItems={[
            {
              label: 'Dashboard',
              description: 'Portfolio overview',
              active: dashboardRoute.match(),
              go: () => dashboardRoute.go(),
            },
            {
              label: 'Projects',
              description: 'Search, forms, optimistic actions',
              active: projectsRoute.match(),
              go: () => projectsRoute.go(projectSearchParams()),
            },
            {
              label: 'Settings',
              description: 'Persistent preferences',
              active: settingsRoute.match(),
              go: () => settingsRoute.go(),
            },
          ]}
          onLogout={wrap(async () => {
            await wrap(logoutAction())
            loginRoute.go(undefined, true)
          })}
        >
          {outlet.length > 0 ? (
            outlet
          ) : (
            <NotFoundPage onGoHome={wrap(() => dashboardRoute.go())} />
          )}
        </PrivateAppShell>
      )
    },
  },
  'routes.private',
)

export const dashboardRoute = privateRoute.reatomRoute(
  {
    path: 'dashboard',
    async loader() {
      const { token } = requireSession()
      const summary = await wrap(fakeBackend.getDashboard(token))

      return {
        summary,
        openProject: (projectId: string) => projectDetailsRoute.go({ projectId }),
      }
    },
    render(self) {
      const status = self.loader.status()

      if (status.isFirstPending) return <PageLoader label="Loading dashboard..." />
      if (status.isFulfilled) return <DashboardPage model={status.data} />
      if (status.isPending && status.isEverSettled && status.data) {
        return <DashboardPage model={status.data} refreshing />
      }
      if (status.isRejected) {
        return (
          <PageError
            error={self.loader.error() ?? new Error('Failed to load dashboard')}
            onRetry={wrap(() => self.loader.retry())}
          />
        )
      }
      return <PageLoader label="Loading dashboard..." />
    },
  },
  'routes.dashboard',
)

export const projectsRoute = privateRoute.reatomRoute(
  {
    path: 'projects',
    search: projectSearchSchema,
    async loader(params) {
      const { token } = requireSession()
      const query: ProjectListQuery = {
        q: params.q,
        status: params.status,
        page: Number(params.page),
      }
      const result = await wrap(fakeBackend.listProjects(token, query))
      const filterForm = reatomProjectFilterForm(
        { q: query.q, status: query.status },
        (values) => projectsRoute.go(projectSearchParams({ ...values, page: 1 })),
      )

      return {
        result,
        filterForm,
        setPage: (page: number) =>
          projectsRoute.go(projectSearchParams({ ...query, page })),
        openProject: (projectId: string) => projectDetailsRoute.go({ projectId }),
        goNew: () => projectCreateRoute.go(),
      }
    },
    render(self) {
      const status = self.loader.status()

      if (status.isFirstPending) return <PageLoader label="Loading projects..." />
      if (status.isFulfilled) return <ProjectsPage model={status.data} />
      if (status.isPending && status.isEverSettled && status.data) {
        return <ProjectsPage model={status.data} refreshing />
      }
      if (status.isRejected) {
        return (
          <PageError
            error={self.loader.error() ?? new Error('Failed to load projects')}
            onRetry={wrap(() => self.loader.retry())}
          />
        )
      }
      return <PageLoader label="Loading projects..." />
    },
  },
  'routes.projects',
)

export const projectCreateRoute = projectsRoute.reatomRoute(
  {
    path: 'new',
    async loader() {
      const { token } = requireSession()
      await wrap(sleep(80))
      const form = reatomProjectCreateForm(async (values) => {
        const project = await wrap(
          fakeBackend.createProject(token, toProjectCreateInput(values)),
        )
        showToastAction({
          title: 'Project created',
          message: project.name,
          color: 'green',
        })
        projectDetailsRoute.go({ projectId: project.id }, true)
        return project
      })

      return {
        form,
        cancel: () => projectsRoute.go(projectSearchParams()),
      }
    },
    render(self) {
      const status = self.loader.status()

      if (status.isFirstPending) return <PageLoader label="Preparing project form..." />
      if (status.isFulfilled) return <ProjectCreatePage model={status.data} />
      if (status.isPending && status.isEverSettled && status.data) {
        return <ProjectCreatePage model={status.data} refreshing />
      }
      if (status.isRejected) {
        return (
          <PageError
            error={self.loader.error() ?? new Error('Failed to prepare project form')}
            onRetry={wrap(() => self.loader.retry())}
          />
        )
      }
      return <PageLoader label="Preparing project form..." />
    },
  },
  'routes.projects.new',
)

export const projectDetailsRoute = projectsRoute.reatomRoute(
  {
    path: ':projectId',
    params: z.object({ projectId: z.string().regex(/^p_/) }),
    async loader({ projectId }) {
      const { token } = requireSession()
      const project = await wrap(fakeBackend.getProject(token, projectId))
      const projectAtom = atom(project, `projects.detail#${projectId}.project`).extend(
        withRollback(),
      )

      const updateStatus = action(async (status: ProjectStatus) => {
        projectAtom.set((current) => ({
          ...current,
          status,
          progress: status === 'done' ? 100 : status === 'blocked' ? 38 : Math.max(current.progress, 55),
        }))

        const savedProject = await wrap(
          fakeBackend.updateProjectStatus(token, projectId, status),
        )
        projectAtom.set(savedProject)
        showToastAction({
          title: 'Project updated',
          message: `${savedProject.name} is now ${savedProject.status}`,
          color: 'green',
        })
        return savedProject
      }, `projects.detail#${projectId}.updateStatus`).extend(
        withAsync({ status: true }),
        withTransaction({ shouldRollback: (error) => error instanceof Error }),
      )

      return {
        projectAtom,
        updateStatus,
        backToProjects: () => projectsRoute.go(projectSearchParams()),
      }
    },
    render(self) {
      const status = self.loader.status()

      if (status.isFirstPending) return <PageLoader label="Loading project..." />
      if (status.isFulfilled) return <ProjectDetailsPage model={status.data} />
      if (status.isPending && status.isEverSettled && status.data) {
        return <ProjectDetailsPage model={status.data} refreshing />
      }
      if (status.isRejected) {
        return (
          <PageError
            error={self.loader.error() ?? new Error('Failed to load project')}
            onRetry={wrap(() => self.loader.retry())}
          />
        )
      }
      return <PageLoader label="Loading project..." />
    },
  },
  'routes.projects.detail',
)

export const settingsRoute = privateRoute.reatomRoute(
  {
    path: 'settings',
    async loader() {
      const { token, user } = requireSession()
      await wrap(sleep(80))
      const persisted = settingsSnapshotAtom()
      const form = reatomSettingsForm(
        {
          name: user.name,
          title: user.title,
          colorScheme: persisted.colorScheme,
          density: persisted.density,
          emailDigest: persisted.emailDigest,
          sidebarCollapsed: persisted.sidebarCollapsed,
        },
        async (values) => {
          const saved = await wrap(fakeBackend.saveSettings(token, values))
          colorSchemeAtom.set(saved.colorScheme)
          densityAtom.set(saved.density)
          saved.emailDigest ? emailDigestAtom.setTrue() : emailDigestAtom.setFalse()
          saved.sidebarCollapsed
            ? sidebarCollapsedAtom.setTrue()
            : sidebarCollapsedAtom.setFalse()

          const updatedUser = await wrap(
            fakeBackend.updateProfile(token, {
              name: saved.name,
              title: saved.title,
            }),
          )
          syncSessionUserAction(updatedUser)
          showToastAction({
            title: 'Settings saved',
            message: 'Preferences were persisted locally and sent to the fake backend.',
            color: 'green',
          })
          return saved
        },
      )

      return { form }
    },
    render(self) {
      const status = self.loader.status()

      if (status.isFirstPending) return <PageLoader label="Loading settings..." />
      if (status.isFulfilled) return <SettingsPage model={status.data} />
      if (status.isPending && status.isEverSettled && status.data) {
        return <SettingsPage model={status.data} refreshing />
      }
      if (status.isRejected) {
        return (
          <PageError
            error={self.loader.error() ?? new Error('Failed to load settings')}
            onRetry={wrap(() => self.loader.retry())}
          />
        )
      }
      return <PageLoader label="Loading settings..." />
    },
  },
  'routes.settings',
)

urlAtom.extend(
  withChangeHook(() => {
    if (!rootRoute.exact()) return
    if (isAuthenticatedAtom()) dashboardRoute.go(undefined, true)
    else loginRoute.go(undefined, true)
  }),
)

urlAtom.extend(
  withChangeHook((url, prevUrl) => {
    if (url.pathname === prevUrl?.pathname && url.search === prevUrl.search) {
      return
    }

    fakeBackend
      .trackPageView(url.pathname, currentUserAtom()?.id)
      .catch((error: unknown) => console.error(error))
  }),
)
