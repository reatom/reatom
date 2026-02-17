import type { Admin } from '../../index'
import { colors, flex, gap, px, py, rounded } from '../styles'

export interface FilterBarProps {
  admin: Admin
}

const TARGETS: Array<{
  value: 'name' | 'state' | 'params' | 'payload' | 'all'
  label: string
}> = [
  { value: 'all', label: 'All' },
  { value: 'name', label: 'Name' },
  { value: 'state', label: 'State' },
  { value: 'params', label: 'Params' },
  { value: 'payload', label: 'Payload' },
]

export const FilterBar = ({ admin }: FilterBarProps) => {
  const search = admin.filters.search
  const errorTagId = () =>
    admin.filters.tags.tags().find((t) => t.builtIn && t.name === 'error')?.id

  return (
    <div
      css={`
        ${flex}
        ${gap(2)}
        ${px(2)}
        ${py(1)}
        background: ${colors.surface};
        border-bottom: 1px solid ${colors.border};
      `}
    >
      <input
        type="search"
        placeholder="Search..."
        model:value={search.searchQuery}
        css={`
          flex: 1;
          ${px(2)}
          ${py(1)}
          ${rounded}
          border: 1px solid ${colors.border};
          background: ${colors.bg};
          color: ${colors.text};
          min-width: 0;
        `}
      />
      <select
        model:value={search.searchTarget}
        css={`
          ${px(2)}
          ${py(1)}
          ${rounded}
          border: 1px solid ${colors.border};
          background: ${colors.bg};
          color: ${colors.text};
        `}
      >
        {TARGETS.map((t) => (
          <option value={t.value}>{t.label}</option>
        ))}
      </select>
      {() => {
        const errId = errorTagId()
        if (!errId) return null
        return (
          <button
            type="button"
            css={`
              ${px(2)}
              ${py(1)}
              ${rounded}
              border: 1px solid ${colors.border};
              background: ${colors.bg};
              color: ${colors.error};
              font-size: 0.75rem;
              cursor: pointer;
            `}
            on:click={() => {
              const configs = admin.filters.engine.configs()
              const hasError = configs.some((c) =>
                c.expression.children.some(
                  (ch) => 'tagId' in ch && ch.tagId === errId,
                ),
              )
              if (hasError) {
                const toRemove = configs.find((c) =>
                  c.expression.children.some(
                    (ch) => 'tagId' in ch && ch.tagId === errId,
                  ),
                )
                if (toRemove) admin.filters.engine.removeConfig(toRemove.id)
              } else {
                admin.filters.engine.addConfig({
                  id: `err-${Date.now()}`,
                  expression: {
                    operator: 'AND',
                    children: [{ tagId: errId, negated: false }],
                  },
                  mode: 'show',
                })
              }
            }}
          >
            Errors
          </button>
        )
      }}
    </div>
  )
}
