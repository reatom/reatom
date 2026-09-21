import { LANG } from './lang'

export {
  applyDocumentLang,
  changeLang,
  LANG,
  LANG_PREF,
  LANG_PREFS,
} from './lang'

const vocabModule = {
  en: () => import('./en'),
  ru: () => import('./ru'),
} as const

export const { vocab: t } = await vocabModule[LANG]()
