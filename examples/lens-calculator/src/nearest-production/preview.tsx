import '../setup'

import { mount } from '@reatom/jsx'

import { GlobalStyles } from '../components/GlobalStyles'
import { ApertureField, FocalField } from '../components/controls/fields'
import { Section, Segmented } from '../components/controls/widgets'
import { body, format } from '../model'
import {
  type Body,
  bodies,
  bodySpecs,
  type Format,
  formats,
  formatSpecs,
} from '../optics'
import { panel } from '../styles'
import { ProductionPanel } from './ui'

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
        Isolated preview · same catalog the estimator loads on Find nearest
      </p>
      <h1
        css={`
          margin: 0;
          font-size: 1.5rem;
          font-weight: 500;
        `}
      >
        Nearest production lens
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
        <Section title="Optics">
          <FocalField />
          <ApertureField />
        </Section>
        <Section title="System">
          <Segmented<Format>
            name="Format"
            value={format}
            options={formats}
            render={(option) => formatSpecs[option].label}
          />
          <Segmented<Body>
            name="Body"
            value={body}
            options={bodies}
            render={(option) => bodySpecs[option].label}
          />
        </Section>
      </aside>
      <ProductionPanel />
    </main>
  </div>
)

mount(document.getElementById('app')!, <Preview />)
