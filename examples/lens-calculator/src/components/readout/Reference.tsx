import { nearestReference, nearestSearchOpen } from '../../model'
import { label, mono } from '../../styles'
import { chip } from '../controls/widgets'

export const Reference = () => (
  <div
    css={`
      display: grid;
      gap: 0.75rem;
    `}
  >
    <p
      attr:hidden={() =>
        nearestSearchOpen.module.data() !== null || nearestReference() === null
      }
      css={`
        margin: 0;
        padding: 0.75rem 0.85rem;
        border: 1px dashed var(--hairline);
        font-size: 0.75rem;
        line-height: 1.5;
        color: var(--ink-faint);

        &[hidden] {
          display: none;
        }
      `}
    >
      <span
        css={`
          ${label}
          margin-right: 0.5rem;
          font-size: 0.5625rem;
          color: var(--ink-faint);
        `}
      >
        Nearest production lens
      </span>
      <span
        css={`
          color: var(--ink-dim);
        `}
      >
        {() => nearestReference()?.name ?? ''}
      </span>
      <span
        css={`
          ${mono}
          display: block;
          color: var(--ink-dim);
        `}
      >
        {() => {
          const lens = nearestReference()
          if (lens === null) return ''
          const filter = lens.filter === null ? 'drop-in' : `M${lens.filter}`
          return `Ø ${lens.diameter} × ${lens.length} mm · ${lens.weight} g · ${lens.elements} el · ${filter}`
        }}
      </span>
    </p>

    {() => {
      const catalog = nearestSearchOpen.module
      const loaded = catalog.data()
      if (loaded !== null)
        return (
          <>
            <loaded.ProductionFilters />
            <loaded.ProductionReference />
          </>
        )
      const error = catalog.error()
      return (
        <div
          css={`
            display: grid;
            gap: 0.5rem;
            justify-items: start;
          `}
        >
          <button
            type="button"
            prop:disabled={() =>
              nearestSearchOpen() && !catalog.ready() && error === undefined
            }
            on:click={() => {
              nearestSearchOpen.setTrue()
              if (error) catalog.retry()
            }}
            css={`
              ${chip}
              color: var(--accent);
              border-color: var(--accent-soft);

              &:hover:not(:disabled) {
                color: var(--accent);
                border-color: var(--accent);
              }
            `}
          >
            {() =>
              nearestSearchOpen() && !catalog.ready() && error === undefined
                ? 'Loading catalog…'
                : error
                  ? 'Retry catalog'
                  : 'Find nearest'
            }
          </button>
          {error ? (
            <span
              css={`
                font-size: 0.75rem;
                color: var(--warn);
              `}
            >
              {error.message}
            </span>
          ) : null}
        </div>
      )
    }}
  </div>
)
