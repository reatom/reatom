import { estimate } from '../../model'
import type { MassBreakdown } from '../../optics'
import { label, mono } from '../../styles'
import { t } from '../../translations'

export const massParts: ReadonlyArray<{
  key: Exclude<keyof MassBreakdown, 'total'>
  name: string
  color: string
}> = [
  { key: 'glass', name: t.readout.glass, color: 'var(--glass)' },
  {
    key: 'barrel',
    name: t.readout.barrelMass,
    color: 'rgba(228, 236, 243, 0.55)',
  },
  { key: 'focus', name: t.readout.focus, color: 'var(--accent)' },
  {
    key: 'stabilizer',
    name: t.readout.stabilizer,
    color: 'rgba(255, 179, 71, 0.45)',
  },
  { key: 'aperture', name: t.readout.iris, color: 'rgba(124, 199, 242, 0.45)' },
  { key: 'mount', name: t.readout.mount, color: 'rgba(228, 236, 243, 0.28)' },
]

export const MassBar = () => (
  <div
    css={`
      display: grid;
      gap: 0.6rem;
    `}
  >
    <span css={label}>{t.readout.massBudget}</span>
    <div
      css={`
        display: flex;
        height: 0.5rem;
        border: 1px solid var(--hairline);
        background: var(--paper-deep);
        overflow: hidden;
      `}
    >
      {massParts.map((part) => (
        <span
          style:background={part.color}
          style:width={() => {
            const { mass } = estimate()
            return `${(mass[part.key] / mass.total) * 100}%`
          }}
          css={`
            display: block;
            height: 100%;
            transition: width 240ms ease;
          `}
        />
      ))}
    </div>
    <ul
      css={`
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem 1rem;
        margin: 0;
        padding: 0;
        list-style: none;
      `}
    >
      {massParts.map((part) => (
        <li
          attr:hidden={() => estimate().mass[part.key] < 0.5}
          css={`
            display: flex;
            align-items: center;
            gap: 0.4rem;
            font-size: 0.75rem;
            color: var(--ink-faint);

            &[hidden] {
              display: none;
            }

            &::before {
              content: '';
              width: 0.5rem;
              height: 0.5rem;
              background: var(--swatch);
            }
          `}
          css:swatch={part.color}
        >
          {part.name}
          <span
            css={`
              ${mono}
              color: var(--ink-dim);
            `}
          >
            {() => `${Math.round(estimate().mass[part.key])} g`}
          </span>
        </li>
      ))}
    </ul>
  </div>
)
