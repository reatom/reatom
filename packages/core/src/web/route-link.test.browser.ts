import { subscribe, test } from "test"
import { beforeEach, describe, expect } from "vitest"

import { wrap } from "../methods"
import { sleep } from "../utils"
import { reatomRoute } from "./route"
import { reatomRouteLink } from "./route-link"

beforeEach(() => {
  if (window.location.pathname !== '/') {
    window.history.replaceState({}, '', '/')
  }
})

test('route link active state', () => {
  const route = reatomRoute('profiles/:profileId/posts/:postId?')
  
  const routeLink = reatomRouteLink({ 
    route, 
    elementRef: document.createElement('a'),
    params: { profileId: '123', postId: '456' },
    activeOptions: { exact: true }
  })

  route.go({ profileId: '123', postId: '456' })
  expect(routeLink.active()).toBe(true)

  route.go({ profileId: '123' })
  expect(routeLink.active()).toBe(false)

  routeLink.activeOptions.merge({ exact: false })
  expect(routeLink.active()).toBe(true)
})

describe('route link preloading', () => {
  test('on render', async () => {
    const route = reatomRoute('users/:id')

    const routeLink = reatomRouteLink({ 
      route, 
      preload: 'render',
      disabled: true,
      elementRef: document.createElement('a'),
      params: { id: '123' },
      activeOptions: { exact: true }
    })

    const track = subscribe(routeLink.route.loader.data)

    expect(track).toBeCalledWith(undefined)

    const preload = routeLink.preload()
    expect(preload.type === 'render').toBe(true)
    if(preload.type !== 'render') return

    wrap(preload.render())
    await wrap(sleep())

    expect(track).toBeCalledTimes(1)

    routeLink.disabled.setTrue()
    await wrap(sleep())

    expect(track).toBeCalledTimes(2)
  })
})