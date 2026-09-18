import { beforeEach, expect, test } from 'test'

import { computed } from '../core'
import { withRollback, wrap } from '../methods'
import { urlAtom } from '../web/url'
import { reatomRoute } from './route'

beforeEach(() => {
  urlAtom.routes = {}
  if (window.location.pathname !== '/') {
    window.history.replaceState({}, '', '/')
  }
})

test('child loader should start in parallel and resolve after parent loader', async () => {
  const events: Array<string> = []
  let childLoaderResolved = false
  let resolveParent = () => {}
  const parentReady = new Promise<void>((resolve) => {
    resolveParent = resolve
  })

  const parentRoute = reatomRoute({
    path: 'parent',
    async loader() {
      events.push('parent:start')
      await wrap(parentReady)
      events.push('parent:end')
      return 'parent'
    },
  })
  const childRoute = parentRoute.reatomRoute({
    path: 'child',
    async loader() {
      events.push('child:start')
      return 'child'
    },
  })

  childRoute.go()
  const loading = childRoute.loader()
  loading.then(() => {
    childLoaderResolved = true
    events.push('child:public-end')
  })
  await wrap(Promise.resolve())

  expect(events).toEqual(['child:start', 'parent:start'])
  expect(childLoaderResolved).toBe(false)

  resolveParent()
  await wrap(loading)

  expect(events).toEqual([
    'child:start',
    'parent:start',
    'parent:end',
    'child:public-end',
  ])
})

test('outlet render reactively updates when nested loader settles', async () => {
  const name = 'outletRenderReactivity'

  const rootRoute = reatomRoute(
    {
      layout: true,
      render(self) {
        return self.outlet().join('')
      },
    },
    `${name}.rootRoute`,
  )

  const authenticatedRoute = rootRoute.reatomRoute(
    {
      params: () => ({ authenticated: true }),
      layout: true,
      render(self) {
        return self.outlet().join('')
      },
    },
    `${name}.authenticatedRoute`,
  )

  const profileRoute = authenticatedRoute.reatomRoute(
    {
      path: 'profile',
      async loader() {
        return { form: 'profile-form' }
      },
      render(self) {
        const status = self.loader.status()
        if (status.data) return status.data.form
        return 'loading'
      },
    },
    `${name}.profileRoute`,
  )

  const App = computed(() => rootRoute.render(), `${name}.App`)
  const appStates: string[] = []
  App.subscribe(() => appStates.push(String(App())))

  profileRoute.go()
  expect(App()).toBe('loading')

  await wrap(profileRoute.loader())

  expect(profileRoute.loader.ready()).toBe(true)
  expect(profileRoute.loader.data()).toEqual({ form: 'profile-form' })
  expect(profileRoute.loader.status().data).toEqual({ form: 'profile-form' })
  expect(App()).toBe('profile-form')
  expect(appStates.at(-1)).toBe('profile-form')
})

test('manual loader.ready pages reactively leave loading state', async () => {
  const name = 'manualReadyReactivity'

  const homeRoute = reatomRoute(
    {
      path: '',
      async loader() {
        return { page: 'home' }
      },
    },
    `${name}.homeRoute`,
  )

  const loginRoute = reatomRoute(
    {
      path: 'login',
      async loader() {
        return { page: 'login' }
      },
    },
    `${name}.loginRoute`,
  )

  const HomePage = computed(() => {
    if (!homeRoute.exact()) return null
    if (!homeRoute.loader.ready()) return 'home-loading'
    return homeRoute.loader.data()?.page ?? 'home-empty'
  }, `${name}.HomePage`)

  const LoginPage = computed(() => {
    if (!loginRoute.exact()) return null
    if (!loginRoute.loader.ready()) return 'login-loading'
    return loginRoute.loader.data()?.page ?? 'login-empty'
  }, `${name}.LoginPage`)

  const App = computed(() => {
    const home = HomePage()
    const login = LoginPage()
    return [home, login].filter(Boolean).join('|') || 'blank'
  }, `${name}.App`)

  const appStates: string[] = []
  App.subscribe(() => appStates.push(String(App())))

  homeRoute.go()
  expect(App()).toBe('home-loading')

  await wrap(homeRoute.loader())

  expect(homeRoute.loader.ready()).toBe(true)
  expect(App()).toBe('home')
  expect(appStates.at(-1)).toBe('home')

  loginRoute.go()
  expect(App()).toBe('login-loading')

  await wrap(loginRoute.loader())

  expect(loginRoute.loader.ready()).toBe(true)
  expect(App()).toBe('login')
  expect(appStates.at(-1)).toBe('login')
})

test('loader status.data stays in sync with loader.data for route render', async () => {
  const name = 'statusDataSync'

  const rootRoute = reatomRoute(
    {
      layout: true,
      render(self) {
        return self.outlet().join('')
      },
    },
    `${name}.rootRoute`,
  )

  const authenticatedRoute = rootRoute.reatomRoute(
    {
      params: () => ({ authenticated: true }),
      layout: true,
      render(self) {
        return self.outlet().join('')
      },
    },
    `${name}.authenticatedRoute`,
  )

  const profileRoute = authenticatedRoute.reatomRoute(
    {
      path: 'profile',
      async loader() {
        return { form: 'profile-form' }
      },
      render(self) {
        const status = self.loader.status()
        if (status.data) return status.data.form
        return 'loading'
      },
    },
    `${name}.profileRoute`,
  )

  profileRoute.go()
  await wrap(profileRoute.loader())

  expect(profileRoute.loader.data()).toEqual({ form: 'profile-form' })
  expect(profileRoute.loader.status().data).toEqual({ form: 'profile-form' })
  expect(profileRoute.render()).toBe('profile-form')
  expect(rootRoute.render()).toBe('profile-form')
})

test('render reads settled loader state after late subscription', async () => {
  const name = 'lateSubscription'

  const rootRoute = reatomRoute(
    {
      layout: true,
      render(self) {
        return self.outlet().join('')
      },
    },
    `${name}.rootRoute`,
  )

  const authenticatedRoute = rootRoute.reatomRoute(
    {
      params: () => ({ authenticated: true }),
      layout: true,
      render(self) {
        return self.outlet().join('')
      },
    },
    `${name}.authenticatedRoute`,
  )

  const profileRoute = authenticatedRoute.reatomRoute(
    {
      path: 'profile',
      async loader() {
        return { form: 'profile-form' }
      },
      render(self) {
        const status = self.loader.status()
        if (status.data) return status.data.form
        return 'loading'
      },
    },
    `${name}.profileRoute`,
  )

  const App = computed(() => rootRoute.render(), `${name}.App`)

  profileRoute.go()
  await wrap(profileRoute.loader())

  expect(profileRoute.loader.data()).toEqual({ form: 'profile-form' })
  expect(App()).toBe('profile-form')
})

test('loader retry with rollback data and child params redirect does not recurse', async () => {
  const name = 'rollbackRetryRedirect'
  let loaderCalls = 0

  const projectRoute = reatomRoute(
    {
      path: 'projects/:projectId',
      async loader({ projectId }) {
        loaderCalls++
        return { projectId, redirectTo: 'summary' }
      },
    },
    `${name}.projectRoute`,
  )
  projectRoute.loader.data.extend(withRollback())

  const summaryRoute = projectRoute.reatomRoute(
    {
      path: 'summary',
      render: () => 'summary',
    },
    `${name}.summaryRoute`,
  )

  const detailsRoute = projectRoute.reatomRoute(
    {
      path: 'details',
      params(params: { projectId: string }) {
        const project = projectRoute.loader.data()
        if (project?.redirectTo === 'summary') {
          summaryRoute.go({ projectId: params.projectId })
          return null
        }
        return params
      },
      render: () => 'details',
    },
    `${name}.detailsRoute`,
  )

  const unsubscribeData = projectRoute.loader.data.subscribe()
  const unsubscribeDetails = detailsRoute.subscribe()

  try {
    detailsRoute.go({ projectId: 'p1' })
    await wrap(projectRoute.loader())

    expect(urlAtom().pathname).toBe('/projects/p1/summary')
    expect(loaderCalls).toBe(1)

    await wrap(projectRoute.loader.retry())

    expect(urlAtom().pathname).toBe('/projects/p1/summary')
    expect(loaderCalls).toBe(2)
  } finally {
    unsubscribeDetails()
    unsubscribeData()
  }
})
