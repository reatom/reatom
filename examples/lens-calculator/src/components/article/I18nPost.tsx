import { atom } from '@reatom/core'

import { label, panel } from '../../styles'
import { I18N_ARTICLE_URL, t } from '../../translations'
import {
  sampleCookie,
  sampleEn,
  sampleIndex,
  sampleLang,
  sampleNamespace,
  samplePlurals,
  sampleUsage,
} from '../../translations/samples'
import { chip } from '../controls/widgets'
import { Code, prose, Quote, Section } from './blocks'

const demoCount = atom(21, 'i18nDemo.count')

const bullets = (items: string[]) => (
  <ul
    css={`
      margin: 0;
      padding-left: 1.15rem;
      display: grid;
      gap: 0.4rem;
      font-size: 0.875rem;
      line-height: 1.55;
      color: var(--ink-dim);
    `}
  >
    {items.map((item) => (
      <li>{item}</li>
    ))}
  </ul>
)

export const I18nPost = () => (
  <article
    css={`
      ${panel}
      display: grid;
      gap: 1.75rem;
      padding: clamp(1.25rem, 2.5vmin, 2rem);
      animation: prime-rise 500ms 320ms ease-out backwards;
    `}
  >
    <header
      css={`
        display: grid;
        gap: 0.55rem;
        max-width: 68ch;
      `}
    >
      <p css={label}>{t.i18nPost.kicker}</p>
      <h2
        css={`
          margin: 0;
          font-size: clamp(1.35rem, 2.4vw, 1.85rem);
          font-weight: 500;
          letter-spacing: 0.01em;
        `}
      >
        {t.i18nPost.title}
      </h2>
      <p css={prose}>{t.i18nPost.implNote}</p>
      <a
        href={I18N_ARTICLE_URL}
        target="_blank"
        rel="noreferrer"
        css={`
          ${label}
          font-size: 0.625rem;
          color: var(--accent);
          text-decoration: none;

          &:hover {
            text-decoration: underline;
          }
        `}
      >
        {t.i18nPost.source}
      </a>
    </header>

    <div
      css={`
        display: grid;
        gap: 1.75rem;
        max-width: 72ch;
      `}
    >
      <Section index="01" title={t.i18nPost.crisis.title}>
        <p css={prose}>{t.i18nPost.crisis.lead}</p>
        <p
          css={`
            ${label}
            margin: 0;
            font-size: 0.5625rem;
            color: var(--ink-faint);
          `}
        >
          {t.i18nPost.crisis.bench}
        </p>
        {bullets([
          t.i18nPost.crisis.ts,
          t.i18nPost.crisis.ide,
          t.i18nPost.crisis.bundle,
          t.i18nPost.crisis.runtime,
        ])}
        <p css={prose}>{t.i18nPost.crisis.social}</p>
        <Quote cite={t.i18nPost.crisis.quote1By}>
          {t.i18nPost.crisis.quote1}
        </Quote>
        <Quote cite={t.i18nPost.crisis.quote2By}>
          {t.i18nPost.crisis.quote2}
        </Quote>
        <p css={prose}>{t.i18nPost.crisis.closer}</p>
      </Section>

      <Section index="02" title={t.i18nPost.native.title}>
        <p css={prose}>{t.i18nPost.native.lead}</p>
        {bullets([
          t.i18nPost.native.number,
          t.i18nPost.native.date,
          t.i18nPost.native.plural,
          t.i18nPost.native.relative,
        ])}
        <p css={prose}>{t.i18nPost.native.closer}</p>
      </Section>

      <Section index="03" title={t.i18nPost.solution.title}>
        <p css={prose}>{t.i18nPost.solution.lead}</p>
        <Code caption={t.i18nPost.solution.lang}>{sampleLang}</Code>
        <Code caption={t.i18nPost.solution.loading}>{sampleIndex}</Code>
        <Code caption={t.i18nPost.solution.typed}>{sampleEn}</Code>
        <Code caption={t.i18nPost.solution.cookie}>{sampleCookie}</Code>
        <Code caption={t.i18nPost.solution.usage}>{sampleUsage}</Code>
      </Section>

      <Section index="04" title={t.i18nPost.benefits.title}>
        {bullets([
          t.i18nPost.benefits.types,
          t.i18nPost.benefits.runtime,
          t.i18nPost.benefits.split,
          t.i18nPost.benefits.safety,
          t.i18nPost.benefits.native,
          t.i18nPost.benefits.api,
          t.i18nPost.benefits.ssr,
          t.i18nPost.benefits.agnostic,
        ])}
      </Section>

      <Section index="05" title={t.i18nPost.namespace.title}>
        <p css={prose}>{t.i18nPost.namespace.lead}</p>
        <Code caption={t.i18nPost.namespace.title}>{sampleNamespace}</Code>
      </Section>

      <Section index="06" title={t.i18nPost.plurals.title}>
        <p css={prose}>{t.i18nPost.plurals.lead}</p>
        <Code caption={t.i18nPost.plurals.title}>{samplePlurals}</Code>
        <p css={prose}>{t.i18nPost.plurals.usage}</p>
        <p css={prose}>{t.i18nPost.plurals.closer}</p>
      </Section>

      <Section index="07" title={t.i18nPost.ssr.title}>
        <p css={prose}>{t.i18nPost.ssr.p1}</p>
        <p css={prose}>{t.i18nPost.ssr.p2}</p>
        <p css={prose}>{t.i18nPost.ssr.p3}</p>
      </Section>

      <Section index="08" title={t.i18nPost.tradeoff.title}>
        <p css={prose}>{t.i18nPost.tradeoff.p1}</p>
        <p css={prose}>{t.i18nPost.tradeoff.p2}</p>
        {bullets([
          t.i18nPost.tradeoff.gen,
          t.i18nPost.tradeoff.git,
          t.i18nPost.tradeoff.hybrid,
        ])}
        <p css={prose}>{t.i18nPost.tradeoff.closer}</p>
        <p css={prose}>{t.i18nPost.tradeoff.question}</p>
      </Section>

      <Section index="09" title={t.i18nPost.demo.title}>
        <p css={prose}>{t.i18nPost.demo.lead}</p>
        <p
          css={`
            margin: 0;
            font-size: 1.05rem;
            color: var(--ink);
          `}
        >
          {t.demo.hi}
        </p>
        <p css={prose}>{() => t.demo.temperature(demoCount())}</p>
        <button
          type="button"
          on:click={() => demoCount.set((count) => count + 1)}
          css={chip}
        >
          {t.i18nPost.demo.bump}
        </button>
      </Section>
    </div>
  </article>
)
