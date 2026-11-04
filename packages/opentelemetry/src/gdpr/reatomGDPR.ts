import {
  atom,
  reatomForm,
  withLocalStorage,
  type Atom,
  type FormAtom,
  type Ext,
} from '@reatom/core'

import type { BrowserTelemetry } from '../captureEngine.ts'
import { assertFeature, preflightConsent, bindConsent } from '../feature.ts'
import { browserCaptureOf } from '../browserCapture.ts'
import { internalName } from '../internalName.ts'

export const DEFAULT_GDPR_CATEGORIES = {
  diagnostics: false,
  analytics: false,
  marketing: false,
} as const

export type GdprCategories = {
  diagnostics: boolean
  analytics: boolean
  marketing: boolean
}

export type GdprFormState<
  Categories extends Record<string, boolean> = GdprCategories,
> = {
  [Key in keyof Categories]: boolean
}

export type GdprConsentSnapshot<
  Categories extends Record<string, boolean> = GdprCategories,
> = {
  submitted: true
  categories: GdprFormState<Categories>
}

const persistKeyOf = (name: string, persist: boolean | string): string =>
  typeof persist === 'string' ? persist : `reatom.gdpr.${name}`

const booleanRecord = (value: unknown): Record<string, boolean> | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return
  const categories: Record<string, boolean> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== 'boolean') return
    categories[key] = entry
  }
  return categories
}

const readStoredConsent = (
  key: string,
): { submitted: true; categories: Record<string, boolean> } | undefined => {
  try {
    const record = withLocalStorage.storageAtom().get({ key })
    if (!record || record instanceof Promise) return
    const data = record.data
    if (!data || typeof data !== 'object' || Array.isArray(data)) return
    if (!('submitted' in data) || data.submitted !== true) return
    const categories = booleanRecord(
      'categories' in data ? data.categories : undefined,
    )
    if (!categories) return
    return { submitted: true, categories }
  } catch {
    return
  }
}

export interface ReatomGDPROptions<
  Categories extends Record<string, boolean> = GdprCategories,
> {
  name?: string
  categories?: Categories
  persist?: boolean | string
}

export type ReatomGDPR<
  Categories extends Record<string, boolean> = GdprCategories,
> = FormAtom<GdprFormState<Categories>, undefined, void, []> & {
  /**
   * Last submitted categories. Live `fields.*` are a draft until `submit`.
   * After submit, `snapshot().categories` has a boolean for every category.
   * Analytics must read this atom, not the checkboxes. Persist restores it.
   */
  snapshot: Atom<GdprConsentSnapshot<Categories> | null>
}

/** Consent fields are drafts; only submit updates the persisted snapshot. */
export const reatomGDPR = <
  Categories extends Record<string, boolean> = GdprCategories,
>(
  options: ReatomGDPROptions<Categories> = {},
): ReatomGDPR<Categories> => {
  const name = options.name ?? 'consent'
  const persist = options.persist ?? true
  const persistKey = persist === false ? undefined : persistKeyOf(name, persist)
  const stored = persistKey ? readStoredConsent(persistKey) : undefined
  const schema: Record<string, boolean> = {
    ...(options.categories ?? DEFAULT_GDPR_CATEGORIES),
  }
  const stateFrom = (
    restored: Record<string, boolean> | undefined,
  ): GdprFormState<Categories> => {
    const state: Record<string, boolean> = { ...schema }
    if (restored) {
      for (const key of Object.keys(state)) {
        const value = restored[key]
        if (typeof value === 'boolean') state[key] = value
      }
    }
    return state as GdprFormState<Categories>
  }
  const initial = stateFrom(stored?.categories)

  const snapshot = atom<GdprConsentSnapshot<Categories> | null>(
    stored ? { submitted: true, categories: initial } : null,
    `${name}.snapshot`,
  )
  if (persistKey) snapshot.extend(withLocalStorage(persistKey))

  const form = reatomForm(initial, {
    name,
    onSubmit: (categories) => {
      const submitted = categories as GdprFormState<Categories>
      snapshot.set({ submitted: true, categories: submitted })
    },
  })

  const consentForm: ReatomGDPR<Categories> = Object.assign(form, { snapshot })
  return consentForm
}

/** Attach a submitted consent policy before installing collectors or capturing. */
export const withGDPR =
  <Categories extends Record<string, boolean> = GdprCategories>(
    options: ReatomGDPROptions<Categories> | ReatomGDPR<Categories> = {},
  ): Ext<BrowserTelemetry, { gdpr: ReatomGDPR<Categories> }> =>
  (otel) => {
    assertFeature(otel, 'gdpr')
    preflightConsent(otel)
    const shared = typeof options === 'function'
    const offered = shared
      ? Object.keys(options.fields)
      : Object.keys(options.categories ?? DEFAULT_GDPR_CATEGORIES)
    const denied = Object.fromEntries(offered.map((key) => [key, false]))
    otel.set((state) => ({ ...state, consent: denied }))
    const created = shared
      ? options
      : reatomGDPR({
          ...options,
          name: internalName(otel.instanceName, options.name ?? 'gdpr'),
          persist:
            options.persist === false
              ? false
              : typeof options.persist === 'string'
                ? options.persist
                : persistKeyOf(options.name ?? 'consent', true),
        })
    const gdpr = created
    const unbind = bindConsent(
      otel,
      () => gdpr.snapshot()?.categories ?? denied,
      (notify) => gdpr.snapshot.subscribe(() => notify()),
    )
    browserCaptureOf(otel)?.attach(unbind, 'gdpr')
    return { gdpr }
  }
