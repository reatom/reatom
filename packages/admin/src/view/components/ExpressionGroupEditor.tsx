import type { Admin } from '../../index'
import type { FilterGroup, FilterTagRef } from '../../types'
import {
  buttonGhost,
  card,
  colors,
  flex,
  flexWrap,
  gap,
  inputLike,
  p,
  sectionTitle,
} from '../styles'

export interface ExpressionGroupEditorProps {
  admin: Admin
}

type GroupPath = Array<number>

function isTagRef(child: FilterTagRef | FilterGroup): child is FilterTagRef {
  return 'tagId' in child
}

function updateGroupAtPath(
  group: FilterGroup,
  path: GroupPath,
  updater: (target: FilterGroup) => FilterGroup,
): FilterGroup {
  if (path.length === 0) return updater(group)

  const [index, ...rest] = path
  return {
    ...group,
    children: group.children.map((child, childIndex) => {
      if (childIndex !== index || isTagRef(child)) return child
      return updateGroupAtPath(child, rest, updater)
    }),
  }
}

function removeChildAtPath(
  group: FilterGroup,
  path: GroupPath,
  childIndex: number,
): FilterGroup {
  return updateGroupAtPath(group, path, (target) => ({
    ...target,
    children: target.children.filter((_, index) => index !== childIndex),
  }))
}

function appendChildAtPath(
  group: FilterGroup,
  path: GroupPath,
  child: FilterTagRef | FilterGroup,
): FilterGroup {
  return updateGroupAtPath(group, path, (target) => ({
    ...target,
    children: [...target.children, child],
  }))
}

function replaceChildAtPath(
  group: FilterGroup,
  path: GroupPath,
  childIndex: number,
  nextChild: FilterTagRef | FilterGroup,
): FilterGroup {
  return updateGroupAtPath(group, path, (target) => ({
    ...target,
    children: target.children.map((child, index) =>
      index === childIndex ? nextChild : child,
    ),
  }))
}

function createEmptyGroup(): FilterGroup {
  return {
    operator: 'AND',
    children: [],
  }
}

function createEmptyTagRef(tagId: string): FilterTagRef {
  return {
    tagId,
    negated: false,
  }
}

function renderGroup(
  admin: Admin,
  group: FilterGroup,
  path: GroupPath,
  title: string,
): Element {
  const tags = admin.filters.tags.tags()
  const firstTagId = tags[0]?.id ?? ''
  const setExpression = admin.filters.expression.setExpression
  const expression = admin.filters.expression.expression()

  return (
    <section
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
          align-items: center;
        `}
      >
        <h4
          css={`
            ${sectionTitle}
          `}
        >
          {title}
        </h4>
        <label
          css={`
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
            color: ${colors.textMuted};
            font-size: 0.76rem;
          `}
        >
          Operator
          <select
            value={group.operator}
            on:change={(event: Event) => {
              const target = event.currentTarget
              if (!(target instanceof HTMLSelectElement)) return
              const nextOperator = target.value === 'OR' ? 'OR' : 'AND'
              setExpression(
                updateGroupAtPath(expression, path, (targetGroup) => ({
                  ...targetGroup,
                  operator: nextOperator,
                })),
              )
            }}
            css={inputLike}
          >
            <option value="AND">AND</option>
            <option value="OR">OR</option>
          </select>
        </label>
      </div>

      {group.children.length === 0 && (
        <div
          css={`
            color: ${colors.textSubtle};
            font-size: 0.78rem;
          `}
        >
          No predicates added yet. Add tag references or nested groups to build
          a reusable debugging rule.
        </div>
      )}

      <div
        css={`
          display: grid;
          gap: 0.65rem;
        `}
      >
        {group.children.map((child, childIndex) => {
          if (isTagRef(child)) {
            return (
              <div
                css={`
                  display: grid;
                  grid-template-columns: minmax(0, 1fr) auto auto;
                  gap: 0.65rem;
                  align-items: center;
                `}
              >
                <select
                  value={child.tagId}
                  on:change={(event: Event) => {
                    const target = event.currentTarget
                    if (!(target instanceof HTMLSelectElement)) return
                    setExpression(
                      replaceChildAtPath(expression, path, childIndex, {
                        ...child,
                        tagId: target.value,
                      }),
                    )
                  }}
                  css={inputLike}
                >
                  {tags.map((tag) => (
                    <option value={tag.id}>{tag.name}</option>
                  ))}
                </select>
                <label
                  css={`
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    color: ${colors.textMuted};
                    font-size: 0.74rem;
                  `}
                >
                  <input
                    type="checkbox"
                    checked={child.negated}
                    on:change={(event: Event) => {
                      const target = event.currentTarget
                      if (!(target instanceof HTMLInputElement)) return
                      setExpression(
                        replaceChildAtPath(expression, path, childIndex, {
                          ...child,
                          negated: target.checked,
                        }),
                      )
                    }}
                  />
                  Negate
                </label>
                <button
                  type="button"
                  css={buttonGhost}
                  on:click={() =>
                    setExpression(removeChildAtPath(expression, path, childIndex))
                  }
                >
                  Remove
                </button>
              </div>
            )
          }

          return renderGroup(
            admin,
            child,
            [...path, childIndex],
            `Nested group ${childIndex + 1}`,
          )
        })}
      </div>

      <div
        css={`
          ${flex}
          ${gap(1)}
          ${flexWrap}
        `}
      >
        <button
          type="button"
          css={buttonGhost}
          on:click={() => {
            if (!firstTagId) return
            setExpression(
              appendChildAtPath(expression, path, createEmptyTagRef(firstTagId)),
            )
          }}
        >
          Add tag reference
        </button>
        <button
          type="button"
          css={buttonGhost}
          on:click={() =>
            setExpression(
              appendChildAtPath(expression, path, createEmptyGroup()),
            )
          }
        >
          Add nested group
        </button>
      </div>
    </section>
  )
}

export const ExpressionGroupEditor = ({ admin }: ExpressionGroupEditorProps) => {
  return (
    <div data-reatom-name="ExpressionGroupEditor">
      {() =>
        renderGroup(
          admin,
          admin.filters.expression.expression(),
          [],
          'Draft expression',
        )
      }
    </div>
  )
}
