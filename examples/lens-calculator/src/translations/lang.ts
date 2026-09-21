export const LANGS = {
  en: 'en',
  ru: 'ru',
} as const

export type Lang = keyof typeof LANGS

export const LANG_PREFS = ['auto', 'en', 'ru'] as const
export type LangPref = (typeof LANG_PREFS)[number]

export const LANG_STORAGE_KEY = 'prime-lang'

const isLang = (value: string): value is Lang => value in LANGS

const isLangPref = (value: string): value is LangPref =>
  value === 'auto' || isLang(value)

/**
 * Maps a BCP 47 tag such as `ru-RU` or `en_GB` onto a bundled language. Uses
 * `Intl.Locale` when the tag is well-formed, then the primary subtag.
 */
export const matchLang = (tag: string): Lang | undefined => {
  const normalized = tag.trim().replaceAll('_', '-')
  if (normalized.length === 0) return undefined

  try {
    const language = new Intl.Locale(normalized).language.toLowerCase()
    if (isLang(language)) return language
  } catch {
    const primary = normalized.split('-')[0]?.toLowerCase()
    if (primary && isLang(primary)) return primary
  }

  return undefined
}

/**
 * Picks the first bundled language in a browser-style preference list
 * (`navigator.languages`). Falls back to English when none match.
 */
export const detectLang = (languages: readonly string[]): Lang => {
  for (const tag of languages) {
    const match = matchLang(tag)
    if (match) return match
  }
  return 'en'
}

export const parseLangPref = (stored: string | null | undefined): LangPref =>
  stored && isLang(stored) ? stored : 'auto'

export const resolveLang = (
  pref: LangPref,
  languages: readonly string[],
): Lang => (pref === 'auto' ? detectLang(languages) : pref)

export const readStoredLangPref = (
  storage: Pick<Storage, 'getItem'> | undefined,
): string | null => {
  if (!storage) return null
  try {
    return storage.getItem(LANG_STORAGE_KEY)
  } catch {
    return null
  }
}

export const writeLangPref = (
  pref: LangPref,
  storage: Pick<Storage, 'setItem' | 'removeItem'> | undefined,
) => {
  if (!storage) return
  try {
    if (pref === 'auto') storage.removeItem(LANG_STORAGE_KEY)
    else storage.setItem(LANG_STORAGE_KEY, pref)
  } catch {
    return
  }
}

export const readBrowserLanguages = (
  nav:
    | Pick<Navigator, 'language' | 'languages'>
    | undefined = globalThis.navigator,
): readonly string[] => {
  if (!nav) return []
  if (nav.languages?.length) return [...nav.languages]
  if (nav.language) return [nav.language]
  return []
}

const localStorageOrUndefined = (): Storage | undefined => {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

export const LANG_PREF = parseLangPref(
  readStoredLangPref(localStorageOrUndefined()),
)

export const LANG = resolveLang(LANG_PREF, readBrowserLanguages())

export const applyDocumentLang = (lang: Lang = LANG) => {
  document.documentElement.lang = lang
}

export const changeLang = (next: string) => {
  if (!isLangPref(next) || next === LANG_PREF) return
  writeLangPref(next, localStorageOrUndefined())
  location.reload()
}
