import { beforeEach, expect, test } from 'test'

import { withAsyncData } from '../async'
import { atom, computed, context, isConnected } from '../core'
import { withAbort } from '../extensions'
import { abortVar, effect, wrap } from '../methods'
import { sleep } from '../utils'
import { urlAtom } from '../web/url'
import { reatomRoute, type RouteChild } from './route'

beforeEach(() => {
  urlAtom.routes = {}
  if (window.location.pathname !== '/') {
    window.history.replaceState({}, '', '/')
  }
})

const html = (strings: TemplateStringsArray, ...values: any[]) => {
  return (
    strings
      .reduce((acc, string, i) => {
        let value = values[i]
        value =
          typeof value === 'number'
            ? value.toString()
            : value === true
              ? ''
              : value || ''
        return acc + string + value
      }, '')
      // normalize
      .replace(/\s+/g, '')
  )
}

const api = {
  me: () => Promise.resolve('Test'),
}

// Relative to cross-component navigation
test('abort propagation', async () => {
  const name = 'abortPropagation'

  const aRoute = reatomRoute('a', `${name}.aRoute`)
  aRoute.go()

  const bRoute = reatomRoute('b', `${name}.bRoute`)

  let logs: any[] = []

  const componentLikeEffect = computed(() => {
    if (aRoute()) {
      effect(async () => {
        abortVar.first()!.signal.addEventListener('abort', () => {
          logs.push('a effect aborted')
        })
        logs.push('a effect started')
        await wrap(sleep())
        bRoute.go()
      })
    }
    if (bRoute()) {
      effect(async () => {
        logs.push('b effect started')
        let result = await wrap(
          sleep()
            .then(() => 'ok')
            .catch((error) => error),
        )
        logs.push(`b effect finished with ${result}`)
      })
    }
  }, `${name}.componentLikeEffect`).extend(withAbort())

  expect(logs).toEqual([])

  componentLikeEffect.subscribe()

  expect(logs).toEqual(['a effect started'])

  await wrap(sleep())

  expect(logs).toEqual([
    'a effect started',
    'a effect aborted',
    'b effect started',
  ])
  await wrap(sleep())

  expect(logs).toEqual([
    'a effect started',
    'a effect aborted',
    'b effect started',
    'b effect finished with ok',
  ])

  context()
    .root.store.get(componentLikeEffect)
    ?.run(() => {
      abortVar.throwIfAborted()
      logs.push('componentLikeEffect no abort')
    })
  expect(logs).toEqual([
    'a effect started',
    'a effect aborted',
    'b effect started',
    'b effect finished with ok',
    'componentLikeEffect no abort',
  ])
})

test('app routing', async () => {
  const layoutRoute = reatomRoute({
    render({ outlet }) {
      return html`<div>
        <header></header>
        <main>${outlet().map((child) => child)}</main>
        <footer></footer>
      </div>`
    },
  })

  const aboutRoute = layoutRoute.reatomRoute({
    path: 'about',
    render() {
      // const About = lazy(() => import('./About'))
      const About = () => 'About'
      return html`<article>${About()}</article>`
    },
  })

  const userPageRoute = layoutRoute.reatomRoute({
    path: 'me',
    async loader() {
      return api.me()
    },
    render(self) {
      return html`<article>
        ${self.loader.ready() || 'Loading...'}
        <br />
        ${self.loader.data()}
      </article>`
    },
  })

  // root.ts
  const App = computed(() => {
    return html`${layoutRoute.render()}`
  })

  expect(App()).toBe(
    html`<div>
      <header></header>
      <main></main>
      <footer></footer>
    </div>`,
  )

  aboutRoute.go()
  expect(App()).toBe(
    html`<div>
      <header></header>
      <main><article>About</article></main>
      <footer></footer>
    </div>`,
  )

  userPageRoute.go()
  expect(App()).toBe(
    html`<div>
      <header></header>
      <main>
        <article>Loading...<br /></article>
      </main>
      <footer></footer>
    </div>`,
  )

  await wrap(sleep())
  expect(App()).toBe(
    html`<div>
      <header></header>
      <main>
        <article><br />Test</article>
      </main>
      <footer></footer>
    </div>`,
  )
})

test('app protected routing', async () => {
  const name = 'appProtectedRouting'

  const testAuth = atom(false, `${name}.testAuth`)

  const user = computed(
    async () =>
      testAuth()
        ? {
            name: 'root',
            rights: ['admin'],
          }
        : null,
    `${name}.user`,
  ).extend(withAsyncData())

  const layoutRoute = reatomRoute(
    {
      render({ outlet }) {
        return html`<div>
          <header></header>
          <main>${outlet()}</main>
          <footer></footer>
        </div>`
      },
    },
    `${name}.layoutRoute`,
  )

  const loginRoute = layoutRoute.reatomRoute(
    {
      path: 'login',
      render() {
        return html`<form>Login</form>`
      },
    },
    `${name}.loginRoute`,
  )

  const protectedRoute = layoutRoute.reatomRoute(
    {
      params() {
        const userData = user.data()

        if (!userData) {
          if (user.ready() && !loginRoute.match()) {
            loginRoute.go()
          }
          return null
        }

        if (loginRoute.match()) {
          meRoute.go()
        }

        return userData
      },

      render({ outlet }) {
        return outlet()
      },
    },
    `${name}.protectedRoute`,
  )

  const meRoute = protectedRoute.reatomRoute(
    {
      path: 'me',
      params: (params) => params,
      render(self): RouteChild {
        return html`<article>Hello, ${self().name}!</article>`
      },
    },
    `${name}.meRoute`,
  )

  // root.ts
  const App = computed(() => {
    return html`${layoutRoute.render()}`
  }, `${name}.App`)
  App.subscribe()

  expect(isConnected(user)).toBe(true)
  expect(isConnected(loginRoute)).toBe(true)

  expect(App()).toBe(
    html`<div>
      <header></header>
      <main></main>
      <footer></footer>
    </div>`,
  )

  await wrap(sleep())

  expect(loginRoute.match()).toBe(true)
  expect(loginRoute.render()).toBe(html`<form>Login</form>`)
  await wrap(sleep())
  expect(App()).toBe(
    html`<div>
      <header></header>
      <main><form>Login</form></main>
      <footer></footer>
    </div>`,
  )

  expect(isConnected(testAuth)).toBe(true)
  testAuth.set(true)
  await wrap(sleep())

  expect(App()).toBe(
    html`<div>
      <header></header>
      <main><article>Hello, root!</article></main>
      <footer></footer>
    </div>`,
  )
})

test('modal gate', async () => {
  const myPage = reatomRoute('my-page')
  const modalGate = myPage.reatomRoute({
    params({ message }: { message?: string }) {
      return message ? { message } : null
    },
    render(self): RouteChild {
      return html`<dialog open>${self().message}</dialog>`
    },
  })

  expect(modalGate.path()).toBe('/my-page')
  expect(modalGate()).toBe(null)
  expect(modalGate.render()).toBe(null)

  modalGate.go({ message: 'Cool story' })
  expect(modalGate()).toEqual({ message: 'Cool story' })
  expect(urlAtom().pathname).toBe('/my-page')
  expect(modalGate.render()).toBe(html`<dialog open>Cool story</dialog>`)

  urlAtom.go('/my-page?something=true')
  expect(modalGate()).toEqual({ message: 'Cool story' })

  urlAtom.go('/')
  expect(modalGate()).toBe(null)

  myPage.go()
  expect(modalGate()).toBe(null)

  urlAtom.go('/')
  modalGate.go({ message: 'Yeah' })
  expect(modalGate()).toEqual({ message: 'Yeah' })
  expect(urlAtom().pathname).toBe('/my-page')
  expect(modalGate.render()).toBe(html`<dialog open>Yeah</dialog>`)

  modalGate.go()
  expect(modalGate()).toBe(null)
  expect(urlAtom().pathname).toBe('/my-page')
})
