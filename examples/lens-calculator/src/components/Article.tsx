import { label, panel } from '../styles'
import { prose } from './article/blocks'
import { Notes } from './article/Notes'

export const Article = () => (
  <article
    css={`
      ${panel}
      display: grid;
      gap: 1.75rem;
      padding: clamp(1.25rem, 2.5vmin, 2rem);
      animation: prime-rise 500ms 280ms ease-out backwards;
    `}
  >
    <header
      css={`
        display: grid;
        gap: 0.55rem;
        max-width: 68ch;
      `}
    >
      <p css={label}>Notes on the envelope</p>
      <h2
        css={`
          margin: 0;
          font-size: clamp(1.35rem, 2.4vw, 1.85rem);
          font-weight: 500;
          letter-spacing: 0.01em;
        `}
      >
        Why a 50 / 1.4 is already large, and a 14 / 1.8 is even larger
      </h2>
      <p css={prose}>
        This page is a first-order fit, not a ray-trace. Entrance pupil, field
        angle and mount geometry set the envelope; element count follows speed,
        field, correction tier and iris asymmetry; mass is glass volume plus a
        barrel shell, drive and mount. Expect ±25 % against production lenses.
        The drawing is a paraxial sketch.
      </p>
    </header>

    <div
      css={`
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(22rem, 1fr));
        gap: 1.75rem 2.25rem;
      `}
    >
      <Notes />
    </div>

    <footer
      css={`
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: baseline;
        gap: 0.5rem 2rem;
      `}
    >
      <p
        css={`
          ${label}
          margin: 0;
          font-size: 0.5625rem;
          color: var(--ink-faint);
        `}
      >
        Calibrated against ~30 published primes · catalog of 2,901 for nearest
        match · first-order only
      </p>
      <a
        href="https://v1001.reatom.dev/"
        target="_blank"
        rel="noreferrer"
        css={`
          ${label}
          font-size: 0.5625rem;
          text-decoration: none;
          color: var(--ink-faint);
          transition: color 160ms ease;

          &:hover {
            color: var(--ink);
          }
        `}
      >
        @reatom/jsx · withSearchParams
      </a>
    </footer>
  </article>
)
