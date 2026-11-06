import { MantineProvider } from '@mantine/core'
import { context, notify, top, wrap } from '@reatom/core'
import { reatomGDPR } from '@reatom/opentelemetry'
import { reatomContext } from '@reatom/react'
import ReactDOM from 'react-dom/client'
import { afterEach, expect, test } from 'vitest'

import '@mantine/core/styles.css'

import { ConsentBanner } from './ConsentBanner'

const tick = () => new Promise((resolve) => setTimeout(resolve, 80))

const queryTestId = (id: string) =>
  document.querySelector(`[data-testid="${id}"]`)

const bannerCopy = () => queryTestId('consent-banner')?.textContent ?? ''

const clickAnalyticsCheckbox = () => {
  const control = queryTestId('consent-analytics')
  const input =
    control instanceof HTMLInputElement
      ? control
      : control?.querySelector('input')
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('Analytics checkbox missing')
  }
  input.click()
}

const clickNamed = (id: string) => {
  const button = queryTestId(id)
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`${id} button missing`)
  }
  button.click()
}

afterEach(() => {
  document.getElementById('consent-root')?.remove()
})

const mountBanner = async (model: ReturnType<typeof reatomGDPR>) => {
  const rootNode = document.createElement('div')
  rootNode.id = 'consent-root'
  document.body.append(rootNode)
  const root = ReactDOM.createRoot(rootNode)
  root.render(
    <reatomContext.Provider value={top()}>
      <MantineProvider>
        <ConsentBanner model={model} />
      </MantineProvider>
    </reatomContext.Provider>,
  )
  await wrap(tick())
  return root
}

test('F-10: Save with analytics off keeps the banner and shows Analytics is off', async () => {
  await context.start(async () => {
    const model = reatomGDPR({
      name: `banner-off-${Math.random().toString(16).slice(2)}`,
      persist: false,
    })
    const readGranted = wrap(
      () => model.snapshot()?.categories.analytics === true,
    )
    const root = await mountBanner(model)

    expect(queryTestId('consent-banner')).toBeInstanceOf(HTMLElement)
    expect(queryTestId('consent-save')).toBeInstanceOf(HTMLButtonElement)
    expect(queryTestId('consent-withdraw')).toBeNull()

    clickNamed('consent-save')
    notify()
    await wrap(tick())
    await wrap(tick())

    expect(queryTestId('consent-banner')).toBeInstanceOf(HTMLElement)
    expect(bannerCopy()).toMatch(/Analytics is off/)
    expect(queryTestId('consent-save')).toBeInstanceOf(HTMLButtonElement)
    expect(queryTestId('consent-withdraw')).toBeNull()
    expect(readGranted()).toBe(false)

    root.unmount()
  })
})

test('F-10: checkbox and Save grant; the card still shows after Save', async () => {
  await context.start(async () => {
    const model = reatomGDPR({
      name: `banner-grant-${Math.random().toString(16).slice(2)}`,
      persist: false,
    })
    const readGranted = wrap(
      () => model.snapshot()?.categories.analytics === true,
    )
    const root = await mountBanner(model)

    expect(queryTestId('consent-banner')).toBeInstanceOf(HTMLElement)
    expect(queryTestId('consent-save')).toBeInstanceOf(HTMLButtonElement)
    expect(queryTestId('consent-withdraw')).toBeNull()
    expect(readGranted()).toBe(false)

    clickAnalyticsCheckbox()
    notify()
    await wrap(tick())
    clickNamed('consent-save')
    notify()
    await wrap(tick())
    await wrap(tick())

    expect(queryTestId('consent-banner')).toBeInstanceOf(HTMLElement)
    expect(bannerCopy()).toMatch(/Analytics is on/)
    expect(bannerCopy()).toMatch(/Withdraw analytics/)
    const withdraw = queryTestId('consent-withdraw')
    expect(withdraw).toBeInstanceOf(HTMLButtonElement)
    expect(readGranted()).toBe(true)

    if (!(withdraw instanceof HTMLButtonElement)) {
      throw new Error('Withdraw analytics button missing after Save')
    }
    withdraw.click()
    notify()
    await wrap(tick())
    await wrap(tick())

    expect(queryTestId('consent-banner')).toBeInstanceOf(HTMLElement)
    expect(bannerCopy()).toMatch(/Analytics is off/)
    expect(readGranted()).toBe(false)
    expect(queryTestId('consent-withdraw')).toBeNull()
    expect(queryTestId('consent-save')).toBeInstanceOf(HTMLButtonElement)

    root.unmount()
  })
})
