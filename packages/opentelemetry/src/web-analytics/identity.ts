import { computed, type Atom } from '@reatom/core'

export { mintIdentityId } from '../ids.ts'

export type Attribution = {
  source?: string
  medium?: string
  campaign?: string
  term?: string
  content?: string
  gclid?: string
  yclid?: string
  fbclid?: string
  msclkid?: string
  [param: string]: string | undefined
}

export const VISITOR_LIFE_MS = 400 * 24 * 60 * 60 * 1000
export const DEFAULT_SESSION_TIMEOUT_MS = 30 * 60 * 1000

export const DEFAULT_ATTRIBUTION_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'gclid',
  'yclid',
  'fbclid',
  'msclkid',
] as const

const EXTRA_CAMPAIGN_PARAMS = ['utm_term', 'utm_content'] as const

export const attributionFieldOf = (param: string): string =>
  param.startsWith('utm_') ? param.slice(4) : param

const pageAttributeKeyForField = (field: string): string =>
  field.endsWith('clid') ? `app.click_id.${field}` : `app.utm.${field}`

export const hasAttributionValues = (
  touch: Attribution | undefined,
): boolean => {
  if (!touch) return false
  for (const value of Object.values(touch)) {
    if (value) return true
  }
  return false
}

export type StoredVisitor = {
  id: string
  createdAt: number
  lastSeen: number
  firstTouch: Attribution
  lastTouch: Attribution
}

export type StoredSession = {
  /** Remote delivery decision persisted for the complete session lifetime. */
  sampled?: boolean
  id: string
  startedAt: number
  lastActivity: number
  previousId?: string
  campaign: string
  pageViews: number
  events: number
  engagedMs: number
}

export const visitorStorageKey = (storageKey: string) => `${storageKey}.visitor`
export const sessionStorageKey = (storageKey: string) => `${storageKey}.session`

export const webStorage = (kind: 'local' | 'session'): Storage | undefined => {
  if (typeof window === 'undefined') return
  try {
    const area =
      kind === 'session' ? window.sessionStorage : window.localStorage
    return typeof area?.getItem === 'function' ? area : undefined
  } catch {
    return
  }
}

export const readStorageJson = <Value>(
  storage: Storage | undefined,
  key: string,
): Value | undefined => {
  if (!storage) return
  try {
    const raw = storage.getItem(key)
    return raw ? (JSON.parse(raw) as Value) : undefined
  } catch {
    return
  }
}

export const writeStorageJson = (
  storage: Storage | undefined,
  key: string,
  value: unknown,
) => {
  try {
    storage?.setItem(key, JSON.stringify(value))
  } catch {
    // quota / private mode
  }
}

export const isStoredVisitor = (value: unknown): value is StoredVisitor =>
  !!value &&
  typeof value === 'object' &&
  typeof (value as StoredVisitor).id === 'string' &&
  typeof (value as StoredVisitor).createdAt === 'number'

export const isStoredSession = (value: unknown): value is StoredSession =>
  !!value &&
  typeof value === 'object' &&
  typeof (value as StoredSession).id === 'string' &&
  typeof (value as StoredSession).startedAt === 'number' &&
  typeof (value as StoredSession).lastActivity === 'number'

const takeCampaignParams = (
  params: readonly string[],
  read: (param: string) => string | null | undefined,
  into: Attribution = {},
): Attribution => {
  for (const param of params) {
    const value = read(param)
    if (value) into[attributionFieldOf(param)] = value
  }
  return into
}

export const readCampaign = (
  url: URL,
  params: readonly string[] = DEFAULT_ATTRIBUTION_PARAMS,
): Attribution => {
  const read = (param: string) => url.searchParams.get(param)
  return takeCampaignParams(
    params,
    read,
    takeCampaignParams(EXTRA_CAMPAIGN_PARAMS, read),
  )
}

const joinedFingerprint = (
  params: readonly string[],
  read: (param: string) => string | undefined,
): string => {
  const parts: string[] = []
  for (const param of params) {
    const value = read(param)
    if (value) parts.push(`${param}=${value}`)
  }
  return parts.join('&')
}

export const campaignFingerprint = (
  url: URL,
  params: readonly string[],
): string =>
  joinedFingerprint(params, (param) => url.searchParams.get(param) ?? undefined)

export const fingerprintFromAttribution = (
  touch: Attribution | undefined,
  params: readonly string[],
): string =>
  touch
    ? joinedFingerprint(params, (param) => touch[attributionFieldOf(param)])
    : ''

export const isSameOriginReferrer = (
  referrer: string,
  origin: string,
): boolean => {
  if (!referrer || !origin) return false
  try {
    return new URL(referrer).origin === origin
  } catch {
    return false
  }
}

const localDateKey = (timeMs: number): string => {
  const date = new Date(timeMs)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export const shouldExpireVisitor = (createdAt: number, now: number): boolean =>
  now - createdAt > VISITOR_LIFE_MS

export const shouldRotateIdle = (
  lastActivity: number,
  now: number,
  sessionTimeout: number,
): boolean => now - lastActivity > sessionTimeout

export const shouldRotateMidnight = (
  startedAt: number,
  now: number,
  rotateAtMidnight: boolean,
): boolean => rotateAtMidnight && localDateKey(startedAt) !== localDateKey(now)

export const shouldRotateCampaign = (
  inbound: boolean,
  previousFingerprint: string,
  nextFingerprint: string,
): boolean =>
  inbound && !!nextFingerprint && nextFingerprint !== previousFingerprint

export const lastTouchPageAttributes = (
  touch: Attribution | undefined,
): Record<string, string> => {
  if (!touch) return {}
  const attributes: Record<string, string> = {}
  for (const [field, value] of Object.entries(touch)) {
    if (value) attributes[pageAttributeKeyForField(field)] = value
  }
  return attributes
}

export const attributionPairAttributes = (
  first: Attribution | undefined,
  last: Attribution | undefined,
): Record<string, string> => {
  const attributes: Record<string, string> = {}
  const write = (touch: Attribution | undefined, prefix: string) => {
    if (!touch) return
    for (const [field, value] of Object.entries(touch)) {
      if (value) attributes[`${prefix}.${field}`] = value
    }
  }
  write(first, 'app.attribution.first')
  write(last, 'app.attribution.last')
  return attributes
}

export const hasWindow = () => typeof window !== 'undefined'

export const pruneRateWindow = (sentAt: number[], now: number) => {
  const oldest = now - 60_000
  while (sentAt.length && sentAt[0]! < oldest) sentAt.shift()
}

export const deletePrefixedKeys = <Value>(
  windows: Map<string, Value>,
  prefix: string,
) => {
  for (const key of windows.keys()) {
    if (key.startsWith(prefix)) windows.delete(key)
  }
}

const PAGE_VIEWS_KEY = Symbol.for('reatom.opentelemetry.analytics.pageViews')

type RecordedPageViews = Set<string>
type PageViewsHolder = typeof globalThis & {
  [PAGE_VIEWS_KEY]?: RecordedPageViews
}

const recordedPageViewsThisLoad = (): RecordedPageViews => {
  const holder = globalThis as PageViewsHolder
  let recorded = holder[PAGE_VIEWS_KEY]
  if (!recorded) {
    recorded = new Set()
    holder[PAGE_VIEWS_KEY] = recorded
  }
  return recorded
}

const recordedPageViewKey = (instanceName: string, path: string) =>
  `${instanceName}\0${path}`

export const hasRecordedPageView = (instanceName: string, path: string) =>
  recordedPageViewsThisLoad().has(recordedPageViewKey(instanceName, path))

export const rememberRecordedPageView = (
  instanceName: string,
  path: string,
) => {
  recordedPageViewsThisLoad().add(recordedPageViewKey(instanceName, path))
}

export type ConsentAllowedReader = {
  (): boolean
  subscribe: (listener: (value: boolean) => void) => () => void
}

export type ConsentSource = {
  allowed: () => boolean
  atom?: ConsentAllowedReader
  stamp: 'granted' | 'analytics'
}

const isConsentAtom = (value: unknown): value is Atom<boolean> =>
  typeof value === 'function' &&
  typeof (value as Atom<boolean>).subscribe === 'function'

const analyticsConsentField = (consent: object): unknown => {
  const record = consent as {
    fields?: { analytics?: unknown }
    analytics?: unknown
  }
  const fields = record.fields
  if (fields != null && typeof fields === 'object' && 'analytics' in fields) {
    return fields.analytics
  }
  return record.analytics
}

const snapshotAllowsAnalytics = (
  snapshot:
    | {
        submitted?: boolean
        categories?: { analytics?: boolean }
      }
    | null
    | undefined,
): boolean =>
  snapshot?.submitted === true && snapshot.categories?.analytics === true

const liveConsent = (
  read: () => boolean,
  stamp: ConsentSource['stamp'],
  atom?: ConsentAllowedReader,
): ConsentSource => ({
  allowed: () => read() === true,
  atom,
  stamp,
})

export const resolveConsentSource = (
  consent: unknown,
  allowedAtomName: string,
): ConsentSource => {
  if (consent === true) return { allowed: () => true, stamp: 'granted' }
  if (consent === false || consent == null) {
    return { allowed: () => false, stamp: 'granted' }
  }
  const snapshot = (consent as { snapshot?: unknown }).snapshot
  if (isConsentAtom(snapshot)) {
    const snapshotAtom = snapshot as unknown as Atom<
      | {
          submitted?: boolean
          categories?: { analytics?: boolean }
        }
      | null
      | undefined
    >
    const allowedAtom = computed(
      () => snapshotAllowsAnalytics(snapshotAtom()),
      allowedAtomName,
    )
    return liveConsent(() => allowedAtom() === true, 'analytics', allowedAtom)
  }
  const analyticsField = analyticsConsentField(consent as object)
  if (isConsentAtom(analyticsField)) {
    return liveConsent(
      () => analyticsField() === true,
      'analytics',
      analyticsField,
    )
  }
  if (typeof analyticsField === 'function') {
    return liveConsent(
      () => (analyticsField as () => boolean)() === true,
      'analytics',
    )
  }
  if (isConsentAtom(consent)) {
    return liveConsent(() => consent() === true, 'granted', consent)
  }
  if (typeof consent === 'function') {
    return liveConsent(() => (consent as () => boolean)() === true, 'granted')
  }
  return { allowed: () => false, stamp: 'granted' }
}

export const readDocumentHasFocus = (): boolean =>
  typeof document !== 'undefined' &&
  typeof document.hasFocus === 'function' &&
  document.hasFocus()
