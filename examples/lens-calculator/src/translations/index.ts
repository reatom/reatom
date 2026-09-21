import { LANG } from './lang'

export {
  applyDocumentLang,
  changeLang,
  LANG,
  LANG_PREF,
  LANG_PREFS,
} from './lang'
export { I18N_ARTICLE_URL } from './samples'

const vocabModule = {
  en: () => import('./en'),
  ru: () => import('./ru'),
} as const

export const { vocab: t } = await vocabModule[LANG]()
