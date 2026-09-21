import '../setup'

import { mount } from '@reatom/jsx'

import { GlobalStyles } from '../components/GlobalStyles'
import { ApertureField, FocalField } from '../components/controls/fields'
import { Section, Segmented } from '../components/controls/widgets'
import { body, format } from '../model'
import { type Body, bodies, type Format, formats } from '../optics'
import { panel } from '../styles'
import { applyDocumentLang, t } from '../translations'
import { ProductionPanel } from './ui'

applyDocumentLang()

const Preview = () => (
  <div
    css={`
      min-height: 100dvh;
      display: grid;
      gap: 1.25rem;
      padding: clamp(1rem, 2.5vmin, 2rem) clamp(1rem, 3vmin, 2.5rem);
    `}
  >
    <GlobalStyles />
    <header
      css={`
        display: grid;
        gap: 0.35rem;
      `}
    >
      <p
        css={`
          margin: 0;
          font-size: 0.6875rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--ink-faint);
        `}
      >
        {t.preview.kicker}
      </p>
      <h1
        css={`
          margin: 0;
          font-size: 1.5rem;
          font-weight: 500;
        `}
      >
        {t.preview.title}
      </h1>
    </header>
    <main
      css={`
        display: grid;
        grid-template-columns: minmax(320px, 22rem) minmax(0, 1fr);
        gap: 1.25rem;
        align-items: start;

        @media (max-width: 900px) {
          grid-template-columns: minmax(0, 1fr);
        }
      `}
    >
      <aside
        css={`
          ${panel}
          display: grid;
          gap: 1.25rem;
          padding: 1.25rem;
        `}
      >
        <Section title={t.controls.optics}>
          <FocalField />
          <ApertureField />
        </Section>
        <Section title={t.controls.system}>
          <Segmented<Format>
            name={t.controls.format}
            value={format}
            options={formats}
            render={(option) => t.format[option]}
          />
          <Segmented<Body>
            name={t.controls.body}
            value={body}
            options={bodies}
            render={(option) => t.body[option]}
          />
        </Section>
      </aside>
      <ProductionPanel />
    </main>
  </div>
)

mount(document.getElementById('app')!, <Preview />)
