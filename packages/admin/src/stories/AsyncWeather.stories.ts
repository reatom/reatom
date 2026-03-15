import { sleep, wrap } from '@reatom/core'
import type { Meta, StoryObj } from '@storybook/html'
import { expect } from 'storybook/test'

import { createWeatherApp } from '../fixtures/weatherApp'
import {
  clickLogItem,
  currentDevtools,
  getLogItemsByName,
  parseFrameDetail,
  parseLogItem,
  SETTLE_MS,
  setup,
} from './helpers'

let weatherApp: ReturnType<typeof createWeatherApp>

const meta: Meta = {
  title: 'Admin/Async Weather',
}

export default meta

export const AsyncLifecycleInDevtools: StoryObj = {
  render: () => {
    setup()
    weatherApp = createWeatherApp()
    weatherApp.weather.subscribe(() => {})
    return document.createElement('div')
  },
  play: async () => {
    const shadowRoot = document.getElementById(
      currentDevtools!.containerId,
    )!.shadowRoot!
    const { setCity } = weatherApp

    await wrap(sleep(SETTLE_MS))

    setCity('Paris')
    await wrap(sleep(SETTLE_MS * 3))
    const cityParis = getLogItemsByName(shadowRoot, 'weather.city').find((el) =>
      parseLogItem(el).content.includes('Paris'),
    )
    const dataParis = getLogItemsByName(shadowRoot, 'weather.data').find(
      (el) =>
        parseLogItem(el).content.includes('Paris') ||
        parseLogItem(el).content.includes('Partly cloudy'),
    )
    await expect(cityParis).toBeDefined()
    const dataItems = getLogItemsByName(shadowRoot, 'weather.data')
    const dataToClick = dataParis ?? dataItems[0]
    if (dataToClick) {
      if (dataParis && cityParis) {
        const allItems = Array.from(
          shadowRoot.querySelectorAll('[data-reatom-name="LogItem"]'),
        )
        await expect(allItems.indexOf(dataParis)).toBeGreaterThan(
          allItems.indexOf(cityParis),
        )
      }
      clickLogItem(dataToClick)
      await wrap(sleep(SETTLE_MS))
    }
    const parsed = parseFrameDetail(shadowRoot)
    if (parsed) {
      await expect(parsed.kind).toBe('atom')
      await expect(JSON.stringify(parsed.json.state)).toContain('Paris')
      await expect(parsed.json.params).toBeUndefined()
    }

    const cities = ['Tokyo', 'Berlin', 'Sydney']
    for (const city of cities) {
      setCity(city)
      await wrap(sleep(SETTLE_MS * 2))
    }

    const cityItems = getLogItemsByName(shadowRoot, 'weather.city')
    await expect(cityItems.length).toBeGreaterThanOrEqual(3)
    const cityNamesInContent = cityItems.map((el) => {
      const match = parseLogItem(el).content.match(/"([^"]+)"/)
      return match ? match[1] : ''
    })
    const hasAllCities = cities.every((c) => cityNamesInContent.includes(c))
    await expect(hasAllCities).toBe(true)
  },
}
