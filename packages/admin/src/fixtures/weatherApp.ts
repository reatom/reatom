import { atom, computed, wrap } from '@reatom/core'
import { withAsyncData } from '@reatom/core'

export interface WeatherData {
  city: string
  temp: number
  condition: string
}

function getStableTemperature(city: string): number {
  let total = 0
  for (const character of city) {
    total += character.charCodeAt(0)
  }
  return 18 + (total % 10)
}

function mockFetch(city: string): Promise<WeatherData> {
  return Promise.resolve({
    city,
    temp: getStableTemperature(city),
    condition: 'Partly cloudy',
  })
}

export function createWeatherApp() {
  const city = atom('London', 'weather.city')
  const weather = computed(async () => {
    const c = city()
    return await wrap(mockFetch(c))
  }, 'weather.data').extend(withAsyncData())

  const setCity = (newCity: string) => city.set(() => newCity)

  return {
    city,
    weather,
    setCity,
  }
}
