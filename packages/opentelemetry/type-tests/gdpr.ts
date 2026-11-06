/** Consent form fields are drafts; only the submitted snapshot is permission. */
import { atom } from '@reatom/core'
import {
  reatomGDPR,
  withGDPR,
  type ReatomGDPR,
  reatomOpentelemetry,
  withWebAnalytics,
} from '../src/index.ts'

const createOtel = () =>
  reatomOpentelemetry({ name: 'shop', serviceName: 'shop-web' })

export function defaultedAndSharedConsent() {
  const defaulted = createOtel().extend(withGDPR(), withWebAnalytics())
  const form: ReatomGDPR = defaulted.gdpr
  form.fields.analytics.change(true)
  form.fields.diagnostics.change(false)
  form.fields.marketing.change(false)
  const draft: boolean = form.fields.analytics.value()
  const submitted = form.snapshot()
  if (submitted) {
    const marker: true = submitted.submitted
    const analytics: boolean = submitted.categories.analytics
    void marker
    void analytics
  }
  const shared = reatomGDPR()
  const first = createOtel().extend(withGDPR(shared))
  const second = createOtel().extend(withGDPR(shared))
  const firstForm: typeof shared = first.gdpr
  const secondForm: typeof shared = second.gdpr
  void draft
  void firstForm
  void secondForm
  // @ts-expect-error Standalone consent has no instance-writing options.
  reatomGDPR({ otel: first })
  // @ts-expect-error Standalone consent is not bound to a single SDK instance.
  reatomGDPR({ instance: first })
  // @ts-expect-error Legacy instance lists are not consent form options.
  reatomGDPR({ instances: [first, second] })
}

export function exactCustomConsentCategories() {
  const custom = reatomGDPR({
    name: 'custom',
    categories: { experiments: false },
  })
  custom.fields.experiments.change(true)
  // @ts-expect-error Supplied categories are the exact schema, not merged defaults.
  custom.fields.analytics
  // @ts-expect-error A custom schema does not offer diagnostic consent implicitly.
  custom.fields.diagnostics
  const withCustom = createOtel().extend(withGDPR(custom))
  withCustom.gdpr.fields.experiments.change(false)
  const withOptions = createOtel().extend(
    withGDPR({ categories: { analytics: false } }),
  )
  withOptions.gdpr.fields.analytics.change(true)
  // @ts-expect-error Analytics-only consent leaves diagnostics unoffered.
  withOptions.gdpr.fields.diagnostics
  const saved = withCustom.gdpr.snapshot()
  if (saved) {
    const allowed: boolean = saved.categories.experiments
    // @ts-expect-error Submitted categories retain the exact custom schema.
    saved.categories.marketing
    void allowed
  }
}

export function analyticsConsentSources() {
  const consent = reatomGDPR()
  const flag = atom(false, 'consent.flag')
  createOtel().extend(withWebAnalytics({ consent: flag }))
  createOtel().extend(withWebAnalytics({ consent: { analytics: flag } }))
  createOtel().extend(withWebAnalytics({ consent }))
  createOtel().extend(
    withWebAnalytics({
      consent: {
        fields: { analytics: consent.fields.analytics },
        snapshot: consent.snapshot,
      },
    }),
  )
  withWebAnalytics({
    // @ts-expect-error Draft checkbox fields without a submitted snapshot are not a consent form source.
    consent: { fields: { analytics: consent.fields.analytics } },
  })
  // @ts-expect-error Boolean consent drafts require a boolean value.
  consent.fields.analytics.change('yes')
}
