import { beforeEach, expect, test } from 'test'

import { computed, context } from '../core'
import { abortVar, effect, wrap } from '../methods'
import { withAbort } from '../mixins'
import { sleep } from '../utils'
import { reatomRoute, type RouteChild } from './route'
import { urlAtom } from './url'

beforeEach(() => {
  urlAtom.routes = {}
  if (window.location.pathname !== '/') {
    window.history.replaceState({}, '', '/')
  }
})

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
        abortVar.get()!.signal.addEventListener('abort', () => {
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
    'b effect started',
    'a effect aborted',
  ])
  await wrap(sleep())

  expect(logs).toEqual([
    'a effect started',
    'b effect started',
    'a effect aborted',
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
    'b effect started',
    'a effect aborted',
    'b effect finished with ok',
    'componentLikeEffect no abort',
  ])
})

test('components', async () => {
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

  const layoutRoute = reatomRoute({
    child(children) {
      return html`<div>
        <header></header>
        <main>${children().map((child) => child)}</main>
        <footer></footer>
      </div>`
    },
  })

  const aboutRoute = layoutRoute.reatomRoute({
    path: 'about',
    child() {
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
    child(): RouteChild {
      return html`<article>
        ${userPageRoute.loader.ready() || 'Loading...'}
        ${userPageRoute.loader.data()}
      </article>`
    },
  })

  // root.ts
  const App = computed(() => {
    return html`${layoutRoute.child()}`
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
      <main><article>Loading...</article></main>
      <footer></footer>
    </div>`,
  )
  await wrap(sleep())
  expect(App()).toBe(
    html`<div>
      <header></header>
      <main><article>Test</article></main>
      <footer></footer>
    </div>`,
  )
})
