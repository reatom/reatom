import { designation, estimate } from '../model'
import { label, mono } from '../styles'
import { changeLang, LANG_PREF, LANG_PREFS, t } from '../translations'

const Wordmark = () => (
  <div
    css={`
      display: flex;
      align-items: baseline;
      gap: 0.85rem;
    `}
  >
    <span
      css={`
        font-family: var(--font-ui);
        font-size: 1.5rem;
        font-weight: 600;
        letter-spacing: 0.32em;
        text-transform: uppercase;
        color: var(--ink);
      `}
    >
      {t.header.wordmark}
    </span>
    <span
      css={`
        ${label}
        font-size: 0.625rem;
        letter-spacing: 0.26em;
        color: var(--ink-faint);
      `}
    >
      {t.header.tagline}
    </span>
  </div>
)

const Designation = () => (
  <div
    css={`
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.4rem 1.25rem;
    `}
  >
    <span
      css={`
        ${mono}
        font-size: 1.25rem;
        font-weight: 300;
        color: var(--accent);
      `}
    >
      {designation}
    </span>
    <span
      css={`
        ${label}
        font-size: 0.625rem;
      `}
    >
      {() => `${t.format[estimate().spec.format]} · ${estimate().mount.label}`}
    </span>
    <span
      css={`
        ${label}
        font-size: 0.625rem;
        color: var(--ink-faint);
      `}
    >
      {t.header.estimateHint}
    </span>
  </div>
)

const LangSwitch = () => (
  <label
    css={`
      display: grid;
      gap: 0.25rem;
      justify-items: end;
    `}
  >
    <span
      css={`
        ${label}
        font-size: 0.5625rem;
      `}
    >
      {t.lang.label}
    </span>
    <select
      aria-label={t.lang.label}
      prop:value={LANG_PREF}
      on:change={(event) => changeLang(event.currentTarget.value)}
      css={`
        appearance: none;
        padding: 0.35rem 0.65rem;
        border: 1px solid var(--hairline);
        border-radius: 1px;
        background: var(--paper-deep);
        color: var(--ink);
        font-family: var(--font-ui);
        font-size: 0.75rem;
        letter-spacing: 0.04em;
        cursor: pointer;

        &:focus-visible {
          outline: 1px solid var(--accent);
          outline-offset: 1px;
        }
      `}
    >
      {LANG_PREFS.map((pref) => (
        <option value={pref}>{t.lang[pref]}</option>
      ))}
    </select>
  </label>
)

export const Header = () => (
  <header
    css={`
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.75rem 2rem;
      padding: 0 0.25rem;
      animation: prime-rise 500ms ease-out backwards;
    `}
  >
    <Wordmark />
    <div
      css={`
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0.75rem 1.5rem;
      `}
    >
      <Designation />
      <LangSwitch />
    </div>
  </header>
)
