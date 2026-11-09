import { beforeEach, expect, test } from 'test'

import { wrap } from '../methods'
import { sleep } from '../utils'
import { urlAtom } from './url'

beforeEach(() => {
  urlAtom.routes = {}
  document.body.innerHTML = ''
  if (window.location.href !== 'http://localhost/') {
    window.history.replaceState({}, '', '/')
  }
})

test.skip('urlAtom synchronizes history immediately', () => {
  urlAtom.go('/history-sync')

  expect(urlAtom().pathname).toBe('/history-sync')
  expect(window.location.pathname).toBe('/history-sync')
})

test('catchLinks dispatches hashchange for same-page anchors', async () => {
  const hashChanges: Array<string> = []
  const trackHashChange = () => hashChanges.push(window.location.hash)
  window.addEventListener('hashchange', trackHashChange)

  try {
    document.body.innerHTML = '<a id="hash-link" href="#section">section</a>'
    urlAtom.catchLinks.set(true)
    urlAtom.init()

    const link = document.getElementById('hash-link')
    if (!(link instanceof HTMLAnchorElement)) {
      throw new Error('Expected hash link element')
    }

    link.click()
    await wrap(sleep())

    expect(window.location.hash).toBe('#section')
    expect(hashChanges).toEqual(['#section'])
  } finally {
    urlAtom.init.abort()
    window.removeEventListener('hashchange', trackHashChange)
    document.body.innerHTML = ''
  }
})

test('catchLinks dispatches hashchange only when a link changes the hash', async () => {
  window.history.replaceState({}, '', '/page#one')
  const hashChanges: Array<string> = []
  const trackHashChange = () => hashChanges.push(window.location.hash)
  window.addEventListener('hashchange', trackHashChange)

  try {
    document.body.innerHTML = '<a id="hash-link" href="#two">two</a>'
    urlAtom.catchLinks.set(true)
    urlAtom.init()

    const link = document.getElementById('hash-link')
    if (!(link instanceof HTMLAnchorElement)) {
      throw new Error('Expected hash link element')
    }

    link.click()
    await wrap(sleep())
    expect(hashChanges).toEqual(['#two'])

    link.click()
    await wrap(sleep())
    expect(window.location.hash).toBe('#two')
    expect(hashChanges).toEqual(['#two'])
  } finally {
    urlAtom.init.abort()
    window.removeEventListener('hashchange', trackHashChange)
    document.body.innerHTML = ''
  }
})

test('catchLinks writes link navigations through sync', async () => {
  const writes: Array<[href: string, replace: boolean | undefined]> = []
  urlAtom.sync.set(() => (url: URL, replace?: boolean) => {
    writes.push([url.href, replace])
  })

  try {
    document.body.innerHTML = '<a id="link" href="/linked">linked</a>'
    urlAtom.catchLinks.set(true)
    urlAtom.init()

    const link = document.getElementById('link')
    if (!(link instanceof HTMLAnchorElement)) {
      throw new Error('Expected link element')
    }

    link.click()
    link.click()
    await wrap(sleep())

    expect(urlAtom().pathname).toBe('/linked')
    const { href } = new URL('/linked', window.location.href)
    expect(writes).toEqual([
      [href, false],
      [href, false],
    ])
    expect(window.location.pathname).toBe('/')
  } finally {
    urlAtom.init.abort()
    document.body.innerHTML = ''
  }
})

test('catchLinks ignores clicks the app already handled', async () => {
  try {
    document.body.innerHTML = '<a id="link" href="/handled">handled</a>'
    urlAtom.catchLinks.set(true)
    urlAtom.init()

    const link = document.getElementById('link')
    if (!(link instanceof HTMLAnchorElement)) {
      throw new Error('Expected link element')
    }
    link.addEventListener('click', (event) => event.preventDefault())

    link.click()
    await wrap(sleep())

    expect(urlAtom().pathname).toBe('/')
    expect(window.location.pathname).toBe('/')
  } finally {
    urlAtom.init.abort()
    document.body.innerHTML = ''
  }
})
