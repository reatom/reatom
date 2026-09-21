import { describe, expect, test } from 'vitest'

import { vocab as en } from './en'
import {
  detectLang,
  matchLang,
  parseLangPref,
  resolveLang,
  writeLangPref,
} from './lang'
import { vocab as ru } from './ru'

const vocabPaths = (value: unknown, prefix = ''): string[] => {
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) =>
      vocabPaths(child, prefix ? `${prefix}.${key}` : key),
    )
  }
  return [prefix]
}

describe('matchLang', () => {
  test('matches primary subtags from BCP 47 tags', () => {
    expect(matchLang('ru-RU')).toBe('ru')
    expect(matchLang('ru_UA')).toBe('ru')
    expect(matchLang('en-GB')).toBe('en')
    expect(matchLang('EN')).toBe('en')
  })

  test('ignores languages that are not bundled', () => {
    expect(matchLang('de-DE')).toBeUndefined()
    expect(matchLang('zh-Hans-CN')).toBeUndefined()
    expect(matchLang('')).toBeUndefined()
    expect(matchLang('   ')).toBeUndefined()
  })
})

describe('detectLang', () => {
  test('uses the first bundled language in the agent list', () => {
    expect(detectLang(['de-DE', 'fr', 'ru-RU', 'en'])).toBe('ru')
    expect(detectLang(['en-US', 'ru'])).toBe('en')
    expect(detectLang([])).toBe('en')
  })
})

describe('lang preference', () => {
  test('treats missing or unknown storage as auto', () => {
    expect(parseLangPref(null)).toBe('auto')
    expect(parseLangPref('de')).toBe('auto')
    expect(parseLangPref('ru')).toBe('ru')
  })

  test('auto follows the browser language list', () => {
    expect(resolveLang('auto', ['sv-SE', 'ru'])).toBe('ru')
    expect(resolveLang('en', ['ru-RU'])).toBe('en')
  })

  test('persists explicit choice and clears auto', () => {
    const store = new Map<string, string>()
    const storage = {
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
      removeItem: (key: string) => {
        store.delete(key)
      },
    }

    writeLangPref('ru', storage)
    expect(store.get('prime-lang')).toBe('ru')
    writeLangPref('auto', storage)
    expect(store.has('prime-lang')).toBe(false)
  })
})

test('russian vocab covers the english keys', () => {
  expect(vocabPaths(ru).sort()).toEqual(vocabPaths(en).sort())
})
