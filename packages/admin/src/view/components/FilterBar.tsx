import type { Admin } from '../../index'
import {
  colors,
  flex,
  gap,
  px,
  py,
  rounded,
  shadowSm,
  transitionBase,
} from '../styles'

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
        ${px(3)}
        ${py(2)}
        align-items: center;
        background: linear-gradient(
          180deg,
          rgba(49, 50, 74, 0.96),
          rgba(42, 42, 62, 0.9)
        );
        border-bottom: 1px solid rgba(69, 71, 90, 0.84);
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
          ${transitionBase}
          border: 1px solid rgba(69, 71, 90, 0.84);
          background: rgba(30, 30, 46, 0.84);
          color: ${colors.text};
          min-width: 0;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
          &::placeholder {
            color: ${colors.textMuted};
          }
          &:focus-visible {
            outline: 2px solid ${colors.accent};
            outline-offset: 2px;
            border-color: rgba(137, 180, 250, 0.5);
            ${shadowSm}
          }
        `}
      />
      <select
        model:value={search.searchTarget}
        css={`
          ${px(2)}
          ${py(1)}
          ${rounded}
          ${transitionBase}
          border: 1px solid rgba(69, 71, 90, 0.84);
          background: rgba(30, 30, 46, 0.84);
          color: ${colors.text};
          cursor: pointer;
          &:focus-visible {
            outline: 2px solid ${colors.accent};
            outline-offset: 2px;
          }
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
              ${transitionBase}
              border: 1px solid rgba(243, 139, 168, 0.32);
              background: rgba(30, 30, 46, 0.84);
              color: ${colors.error};
              font-size: 0.72rem;
              font-weight: 600;
              cursor: pointer;
              &:hover {
                background: ${colors.errorSoft};
                border-color: rgba(243, 139, 168, 0.46);
              }
              &:focus-visible {
                outline: 2px solid ${colors.error};
                outline-offset: 2px;
              }
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
