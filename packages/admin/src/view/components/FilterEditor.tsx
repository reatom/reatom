import type { Admin } from '../../index'
import type { FilterMode } from '../../types'
import { colors, flex, flexCol, gap, p, rounded } from '../styles'

export interface FilterEditorProps {
  admin: Admin
}

const MODES: Array<{ value: FilterMode; label: string }> = [
  { value: 'show', label: 'Show only' },
  { value: 'hide', label: 'Hide' },
  { value: 'highlight', label: 'Highlight' },
  { value: 'exclude', label: 'Exclude' },
]

export const FilterEditor = ({ admin }: FilterEditorProps) => {
  const engine = admin.filters.engine
  const tags = admin.filters.tags
  const configs = () => engine.configs()

  return (
    <div
      css={`
        ${flex}
        ${flexCol}
        ${gap(2)}
      `}
    >
      <h3
        css={`
          margin: 0;
          color: ${colors.text};
          font-size: 1rem;
        `}
      >
        Filter configs
      </h3>
      {() =>
        configs().map((config) => (
          <div
            css={`
              ${p(2)}
              background: ${colors.surface};
              border: 1px solid ${colors.border};
              ${rounded}
            `}
          >
            <div
              css={`
                ${flex} ${gap(2)};
                margin-bottom: 0.5rem;
                align-items: center;
              `}
            >
              <select
                value={config.mode}
                css={`
                  padding: 0.25rem 0.5rem;
                  border: 1px solid ${colors.border};
                  background: ${colors.bg};
                  color: ${colors.text};
                  font-size: 0.75rem;
                  ${rounded}
                `}
                on:change={(e: Event) => {
                  const target = e.currentTarget as HTMLSelectElement
                  engine.updateConfig(config.id, {
                    mode: target.value as FilterMode,
                  })
                }}
              >
                {MODES.map((m) => (
                  <option value={m.value}>{m.label}</option>
                ))}
              </select>
              <button
                type="button"
                css={`
                  padding: 0.25rem 0.5rem;
                  border: 1px solid ${colors.error};
                  background: transparent;
                  color: ${colors.error};
                  cursor: pointer;
                  font-size: 0.75rem;
                  ${rounded}
                `}
                on:click={() => engine.removeConfig(config.id)}
              >
                Remove
              </button>
            </div>
            <div
              css={`
                font-size: 0.7rem;
                color: ${colors.textMuted};
              `}
            >
              Tags:{' '}
              {config.expression.children
                .filter(
                  (c): c is { tagId: string; negated: boolean } => 'tagId' in c,
                )
                .map((c) => {
                  const tag = tags.getTag(c.tagId)
                  return (
                    (tag?.name ?? c.tagId) + (c.negated ? ' (negated)' : '')
                  )
                })
                .join(', ')}
            </div>
          </div>
        ))
      }
      <div
        css={`
          ${flex} ${gap(2)};
          flex-wrap: wrap;
        `}
      >
        {() =>
          tags.tags().map((tag) => (
            <button
              type="button"
              css={`
                padding: 0.25rem 0.5rem;
                border: 1px solid ${colors.border};
                background: ${colors.bg};
                color: ${colors.text};
                cursor: pointer;
                font-size: 0.75rem;
                ${rounded}
              `}
              on:click={() =>
                engine.addConfig({
                  id: `config-${Date.now()}`,
                  expression: {
                    operator: 'AND',
                    children: [{ tagId: tag.id, negated: false }],
                  },
                  mode: 'show',
                })
              }
            >
              + {tag.name}
            </button>
          ))
        }
      </div>
    </div>
  )
}
