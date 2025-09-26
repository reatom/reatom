import { beforeEach, expect, test } from "vitest"

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
