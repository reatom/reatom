import type { Admin } from '../../index'
import type { FilterConfig } from '../../types'
import { formatModeLabel } from '../format'
import {
  badge,
  buttonBase,
  buttonGhost,
  card,
  colors,
  flex,
  flexWrap,
  gap,
  p,
  panelTitle,
} from '../styles'

export interface FilterConfigCardProps {
  admin: Admin
  config: FilterConfig
}

export const FilterConfigCard = ({ admin, config }: FilterConfigCardProps) => {
  const matchCount = () => admin.filters.engine.configMatches().get(config.id) ?? 0

  return (
    <article
      css={`
        ${card}
        ${p(2)}
        display: grid;
        gap: 0.75rem;
      `}
    >
      <div
        css={`
          ${flex}
          ${gap(1)}
          ${flexWrap}
          justify-content: space-between;
          align-items: flex-start;
        `}
      >
        <div
          css={`
            display: grid;
            gap: 0.45rem;
          `}
        >
          <div
            css={`
              ${flex}
              ${gap(1)}
              ${flexWrap}
              align-items: center;
            `}
          >
            <span
              css={`
                ${badge}
                background: ${config.enabled ? colors.successSoft : colors.bgElevated};
                border-color: ${config.enabled ? colors.success : colors.borderStrong};
                color: ${config.enabled ? colors.success : colors.textSubtle};
              `}
            >
              {config.enabled ? 'Enabled' : 'Paused'}
            </span>
            <span
              css={`
                ${badge}
                background: ${colors.bgElevated};
                color: ${colors.textMuted};
              `}
            >
              {formatModeLabel(config.mode)}
            </span>
            <span
              css={`
                ${badge}
                background: ${colors.bgElevated};
                color: ${colors.textSubtle};
              `}
            >
              {() => {
                const count = matchCount()
                return `${count} match${count === 1 ? '' : 'es'}`
              }}
            </span>
          </div>
          <h4
            css={`
              ${panelTitle}
              font-size: 0.92rem;
            `}
          >
            {config.name}
          </h4>
        </div>

        <div
          css={`
            ${flex}
            ${gap(1)}
            ${flexWrap}
            justify-content: flex-end;
          `}
        >
          <button
            type="button"
            css={buttonGhost}
            on:click={() => admin.filters.engine.toggleConfig(config.id)}
          >
            {config.enabled ? 'Disable' : 'Enable'}
          </button>
          <button
            type="button"
            css={buttonGhost}
            on:click={() => admin.filters.engine.duplicateConfig(config.id)}
          >
            Duplicate
          </button>
          <button
            type="button"
            css={buttonGhost}
            on:click={() => admin.filters.engine.removeConfig(config.id)}
          >
            Remove
          </button>
        </div>
      </div>

      <div
        css={`
          color: ${colors.textMuted};
          font-size: 0.78rem;
          line-height: 1.5;
        `}
      >
        {config.expression.children.length === 0
          ? 'This rule currently has no tag references.'
          : `This ${formatModeLabel(config.mode).toLowerCase()} rule uses ${config.expression.children.length} expression node(s).`}
      </div>

      {config.mode === 'highlight' && (
        <label
          css={`
            display: inline-flex;
            align-items: center;
            gap: 0.55rem;
            color: ${colors.textMuted};
            font-size: 0.78rem;
          `}
        >
          Highlight color
          <input
            type="color"
            value={config.highlightColor ?? '#89b4fa'}
            on:input={(event: Event) => {
              const target = event.currentTarget
              if (!(target instanceof HTMLInputElement)) return
              admin.filters.engine.updateConfig(config.id, {
                highlightColor: target.value,
              })
            }}
          />
        </label>
      )}

      <div
        css={`
          ${flex}
          ${gap(1)}
          ${flexWrap}
        `}
      >
        <button
          type="button"
          css={buttonBase}
          on:click={() =>
            admin.filters.expression.setExpression(config.expression)
          }
        >
          Load into studio
        </button>
      </div>
    </article>
  )
}
