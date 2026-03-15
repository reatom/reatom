import type { Admin } from '../../index'
import { buttonGhost, colors, flex, flexWrap, gap, inputLike, px, py } from '../styles'

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
  const builtInTagId = (name: string) =>
    admin.filters.tags.tags().find((tag) => tag.builtIn && tag.name === name)?.id

  const toggleQuickRule = (tagName: string, mode: 'show' | 'hide') => {
    const tagId = builtInTagId(tagName)
    if (!tagId) return

    const existing = admin.filters.engine.configs().find(
      (config) =>
        config.name === `Quick ${tagName}` &&
        config.expression.children.some(
          (child) => 'tagId' in child && child.tagId === tagId,
        ),
    )

    if (existing) {
      admin.filters.engine.removeConfig(existing.id)
      return
    }

    admin.filters.engine.addConfig({
      id: `quick-${tagName}-${Date.now()}`,
      name: `Quick ${tagName}`,
      expression: {
        operator: 'AND',
        children: [{ tagId, negated: false }],
      },
      mode,
    })
  }

  return (
    <div
      css={`
        ${flex}
        ${gap(2)}
        ${flexWrap}
        ${px(2)}
        ${py(1)}
        background: ${colors.surface};
        border-bottom: 1px solid ${colors.border};
        align-items: center;
      `}
    >
      <input
        type="search"
        placeholder="Search frames, params, payloads, and state..."
        model:value={search.searchQuery}
        css={`
          flex: 1;
          ${px(2)} ${py(1)}
          ${inputLike}
          min-width: 0;
        `}
      />
      <select
        model:value={search.searchTarget}
        css={`
          ${px(2)} ${py(1)}
          ${inputLike}
        `}
      >
        {TARGETS.map((t) => (
          <option value={t.value}>{t.label}</option>
        ))}
      </select>

      <div
        css={`
          ${flex}
          ${gap(1)}
          ${flexWrap}
        `}
      >
        {[
          { label: 'Errors', tagName: 'error', mode: 'show' as const },
          { label: 'Actions', tagName: 'action', mode: 'show' as const },
          { label: 'State only', tagName: 'reactive', mode: 'show' as const },
        ].map((quickRule) => (
          <button
            type="button"
            css={buttonGhost}
            on:click={() =>
              toggleQuickRule(quickRule.tagName, quickRule.mode)
            }
          >
            {quickRule.label}
          </button>
        ))}
      </div>

      <div
        css={`
          color: ${colors.textSubtle};
          font-size: 0.72rem;
          margin-left: auto;
        `}
      >
        {() =>
          `${search.resultCount()} result(s) · ${admin.filters.engine.configs().length} active rule(s)`
        }
      </div>

      <button
        type="button"
        css={buttonGhost}
        on:click={() => {
          admin.filters.search.searchQuery.set('')
          admin.filters.engine.clearConfigs()
        }}
      >
        Reset
      </button>
    </div>
  )
}
