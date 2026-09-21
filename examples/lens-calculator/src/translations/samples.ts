export const I18N_ARTICLE_URL =
  'https://dev.to/artalar/building-a-lightning-fast-i18n-alternative-why-i-ditched-i18next-for-native-javascript-2o06'

export const sampleLang = `// translations/lang.ts
const LANGS = { en: "en", ru: "ru" } as const
export type LANGS = keyof typeof LANGS

const userLang = cookie.get("lang") ?? window.navigator.language
export const LANG = userLang in LANGS ? (userLang as LANGS) : "en"

export const changeLang = (lang: string) => {
  cookie.set("lang", lang)
  window.location.reload()
}

export const degree = new Intl.NumberFormat(LANG, {
  style: "unit",
  unit: "degree",
  unitDisplay: "long",
})`

export const sampleIndex = `// translations/index.ts
import { LANG } from "./lang"

export * from "./lang"

const vocabModule = {
  en: () => import("./en"),
  ru: () => import("./ru"),
} as const

export const { vocab: t } = await vocabModule[LANG]()`

export const sampleEn = `// translations/en.ts
import { degree } from "./lang"

export const vocab = {
  hi: "Hello",
  temperature: (n: number) => \`Temperature is \${degree.format(n)}\`,
}

export type Vocab = typeof vocab`

export const sampleCookie = `// cookie.ts
const getCookieRec = () =>
  Object.fromEntries(document.cookie.split("; ").map((rec) => rec.split("=")))

export const cookie = {
  get(name: string): string | undefined {
    return getCookieRec()[name]
  },
  set(name: string, value: string) {
    document.cookie = \`\${name}=\${value}\`
  },
}`

export const sampleUsage = `// App.tsx
import { LANG, changeLang, t } from "./translations"

export function App() {
  return (
    <main>
      <p>{t.hi}</p>
      <p>{t.temperature(count)}</p>
      <select value={LANG} onChange={(e) => changeLang(e.target.value)}>
        {["ru", "en"].map((lang) => (
          <option key={lang} value={lang}>{lang}</option>
        ))}
      </select>
    </main>
  )
}`

export const sampleNamespace = `const vocabModule = {
  en: () => import("./en"),
  ru: () => import("./ru"),
} as const

const authModule = {
  en: () => import("./auth/en"),
  ru: () => import("./auth/ru"),
} as const`

export const samplePlurals = `const pluralRules = new Intl.PluralRules("en-US")

const createPlural =
  (forms: Record<Intl.LDMLPluralRule, string>) =>
  (count: number) => {
    const rule = pluralRules.select(count)
    return forms[rule].replace("{count}", count.toString())
  }

export const vocab = {
  items: createPlural({
    zero: "No items",
    one: "1 item",
    two: "{count} items",
    few: "{count} items",
    many: "{count} items",
    other: "{count} items",
  }),
}`
