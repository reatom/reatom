import { label, panel } from '../styles'
import { t } from '../translations'
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
      <p css={label}>{t.envelope.kicker}</p>
      <h2
        css={`
          margin: 0;
          font-size: clamp(1.35rem, 2.4vw, 1.85rem);
          font-weight: 500;
          letter-spacing: 0.01em;
        `}
      >
        {t.envelope.title}
      </h2>
      <p css={prose}>{t.envelope.lead}</p>
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
        {t.envelope.footer}
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
        {t.envelope.reatom}
      </a>
    </footer>
  </article>
)
