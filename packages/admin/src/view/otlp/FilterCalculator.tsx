import { atom, computed, withLocalStorage, type Atom } from '@reatom/core'

import { canPersistToLocalStorage } from '../../filters/persistence'
import {
  buildCalculatorIndex,
  highlightCalculator,
  parseCalculator,
  recordMatches,
  recordMatchesCalculator,
  type OtlpAdmin,
} from '../../otlp'
import type { FilterMode } from '../../types'
import {
  Button,
  controlBase,
  focusVisible,
  soft,
  tokens,
  truncate,
  type,
} from '../design-system'
import {
  CALCULATOR_FIELD_KEYS,
  CALCULATOR_OP_KEYS,
  appendCalculatorKey,
  backspaceCalculator,
  calculatorBreakdown,
  calculatorInputState,
  calculatorValueSuggestions,
  isCalculatorKeyEnabled,
  type CalculatorBreakdownNode,
  type CalculatorKey,
} from './calculatorPad'

const SAVED_STORAGE_KEY = '_Admin.filter.saved.v1'

const MODE_KEYS: Array<{ mode: FilterMode; label: string; hint: string }> = [
  { mode: 'show', label: 'Show only', hint: 'Only matching records stay' },
  { mode: 'hide', label: 'Hide', hint: 'Matching records disappear' },
  {
    mode: 'highlight',
    label: 'Highlight',
    hint: 'Matching records are marked',
  },
]

let calculatorCounter = 0

const displayChrome = `
  ${controlBase}
  ${focusVisible}
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: calc(var(--admin-control-height) + var(--admin-space-8));
  padding-inline: var(--admin-space-8);
  ${type.data}
  font-size: 13px;
`

const keyRowLabel = `
  ${type.meta}
  color: ${tokens.text3};
  padding-top: var(--admin-space-6);
`

const keyRow = `
  display: flex;
  flex-wrap: wrap;
  gap: var(--admin-space-4);
  min-width: 0;
  button {
    ${type.data}
    min-width: 2rem;
  }
`

function syncHighlightScroll(event: Event) {
  const input = event.currentTarget
  if (!(input instanceof HTMLInputElement)) return
  const overlay = input.previousElementSibling
  if (overlay instanceof HTMLElement) overlay.scrollLeft = input.scrollLeft
}

export interface FilterCalculatorProps {
  admin: OtlpAdmin
  /** Expression being written. The applied one is `admin.filterCalculator`. */
  draft: Atom<string>
}

/**
 * Filter calculator: a display with the expression and its live result, keypads
 * for logic, targets, comparisons, and values seen in the records, a per-clause
 * breakdown, the match mode, and saved expressions.
 */
export const FilterCalculator = ({ admin, draft }: FilterCalculatorProps) => {
  const calculatorId = ++calculatorCounter
  const name = (part: string) =>
    `_Admin.filter.calculator.${calculatorId}.${part}`

  const savedBase = atom<string[]>([], name('saved'))
  const saved = canPersistToLocalStorage()
    ? savedBase.extend(withLocalStorage(SAVED_STORAGE_KEY))
    : savedBase

  const parsedDraft = computed(() => parseCalculator(draft()), name('parsed'))
  const inputState = computed(
    () => calculatorInputState(draft()),
    name('inputState'),
  )
  const isApplied = computed(
    () => draft().trim() === admin.filterCalculator().trim(),
    name('isApplied'),
  )
  const recordIndex = computed(
    () => buildCalculatorIndex(admin.records()),
    name('recordIndex'),
  )
  const chipRecords = computed(() => {
    const chipFilter = { ...admin.filter(), calculator: undefined }
    return admin.records().filter((record) => recordMatches(record, chipFilter))
  }, name('chipRecords'))
  const draftMatchCount = computed(() => {
    const parsed = parsedDraft()
    if (!parsed.ok || parsed.expression.children.length === 0) return null
    const index = recordIndex()
    return chipRecords().filter((record) =>
      recordMatchesCalculator(record, parsed, index),
    ).length
  }, name('draftMatchCount'))
  const breakdown = computed(() => {
    const parsed = parsedDraft()
    if (!parsed.ok) return null
    return calculatorBreakdown(parsed, chipRecords(), recordIndex())
  }, name('breakdown'))

  let displayInput: HTMLInputElement | null = null
  const focusDisplayEnd = () => {
    if (!displayInput) return
    displayInput.focus()
    const end = displayInput.value.length
    displayInput.setSelectionRange(end, end)
  }

  const press = (key: CalculatorKey) => {
    draft.set(appendCalculatorKey(draft(), key))
    focusDisplayEnd()
  }

  const canApply = () => parsedDraft().ok && !isApplied()

  const apply = () => {
    if (!parsedDraft().ok) return
    admin.filterCalculator.set(draft().trim())
  }

  const canSave = () => {
    const source = draft().trim()
    return source !== '' && parsedDraft().ok && !saved().includes(source)
  }

  const Key = ({
    calculatorKey,
    text,
    label,
    hint,
    children,
  }: {
    calculatorKey: CalculatorKey
    text: string
    label?: string
    hint?: string
    children?: Element | string | Array<Element | string>
  }) => (
    <Button
      label={label ?? `Insert ${text}`}
      title={hint === undefined ? text : `${text}: ${hint}`}
      disabled={() => !isCalculatorKeyEnabled(inputState(), calculatorKey)}
      onClick={() => press(calculatorKey)}
    >
      {children ?? text}
    </Button>
  )

  return (
    <div
      data-reatom-name="FilterCalculator"
      css={`
        display: grid;
        gap: var(--admin-space-12);
        min-width: min(100%, 26rem);
        max-width: 48rem;
        max-height: min(24rem, 45vh);
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: thin;
        padding-right: var(--admin-space-4);
        color: ${tokens.text2};
      `}
    >
      <section
        aria-label="Calculator display"
        css={`
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto;
          gap: var(--admin-space-4);
          align-items: start;
        `}
      >
        <div
          css={`
            position: relative;
            min-width: 0;
            background: ${tokens.surface2};
            border-radius: var(--admin-radius-4);
          `}
        >
          <div
            aria-hidden="true"
            css={`
              ${displayChrome}
              position: absolute;
              inset: 0;
              display: flex;
              align-items: center;
              overflow: hidden;
              white-space: pre;
              pointer-events: none;
              border-color: transparent;
              color: ${tokens.text1};
              [data-kind='keyword'] {
                color: ${tokens.accent};
                font-weight: 600;
              }
              [data-kind='field'] {
                color: ${tokens.info};
              }
              [data-kind='op'] {
                color: ${tokens.warning};
              }
              [data-kind='string'] {
                color: ${tokens.success};
              }
              [data-kind='paren'] {
                color: ${tokens.text2};
              }
              [data-kind='error'] {
                color: ${tokens.error};
                text-decoration: underline wavy;
              }
            `}
          >
            {() =>
              highlightCalculator(draft()).map((span) => (
                <span data-kind={span.kind}>{span.text}</span>
              ))
            }
          </div>
          <input
            type="text"
            aria-label="Filter expression"
            aria-describedby={`filter-calculator-result-${calculatorId}`}
            spellcheck={false}
            autocomplete="off"
            placeholder="Press keys below or type: name:makeMove AND kind:action"
            model:value={draft}
            ref={(element: HTMLInputElement) => {
              displayInput = element
            }}
            on:scroll={syncHighlightScroll}
            on:keydown={(event: KeyboardEvent) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                apply()
                return
              }
              if (event.key === 'Escape' && !isApplied()) {
                event.preventDefault()
                event.stopPropagation()
                draft.set(admin.filterCalculator())
              }
            }}
            css={`
              ${displayChrome}
              position: relative;
              z-index: 1;
              display: block;
              background: transparent;
              color: transparent;
              caret-color: ${tokens.text1};
              &::placeholder {
                color: ${tokens.text3};
                opacity: 1;
              }
            `}
          />
        </div>
        <Button
          variant="icon"
          label="Delete last token"
          title="Delete last token"
          disabled={() => draft() === ''}
          onClick={() => {
            draft.set(backspaceCalculator(draft()))
            focusDisplayEnd()
          }}
        >
          ⌫
        </Button>
        <Button
          variant="icon"
          label="Clear expression"
          title="Clear expression"
          disabled={() => draft() === ''}
          onClick={() => {
            draft.set('')
            focusDisplayEnd()
          }}
        >
          C
        </Button>
        <p
          id={`filter-calculator-result-${calculatorId}`}
          aria-live="polite"
          css={`
            grid-column: 1 / -1;
            display: flex;
            flex-wrap: wrap;
            gap: var(--admin-space-8);
            margin: 0;
            ${type.ui}
            color: ${tokens.text2};
            [data-tone='error'] {
              color: ${tokens.error};
            }
            [data-tone='result'] {
              color: ${tokens.text1};
              font-variant-numeric: tabular-nums;
            }
            [data-tone='pending'] {
              color: ${tokens.warning};
            }
            [data-tone='muted'] {
              color: ${tokens.text3};
            }
          `}
        >
          {() => {
            const parsed = parsedDraft()
            if (!parsed.ok) {
              return (
                <span role="alert" data-tone="error">
                  {parsed.error}
                </span>
              )
            }
            const matched = draftMatchCount()
            if (matched === null) {
              return (
                <span data-tone="muted">
                  Empty expression matches every record. Enter applies.
                </span>
              )
            }
            const total = chipRecords().length
            return (
              <>
                <span data-tone="result">{`= ${matched} of ${total} records match`}</span>
                {isApplied() ? (
                  <span data-tone="muted">Applied</span>
                ) : (
                  <span data-tone="pending">Not applied. Enter or Apply.</span>
                )}
              </>
            )
          }}
        </p>
      </section>

      <div
        role="group"
        aria-label="Calculator keys"
        css={`
          display: grid;
          grid-template-columns: 4.5rem minmax(0, 1fr);
          gap: var(--admin-space-6) var(--admin-space-8);
        `}
      >
        <span css={keyRowLabel}>Logic</span>
        <div role="group" aria-label="Logic keys" css={keyRow}>
          <Key
            calculatorKey={{ kind: 'logic', value: 'AND' }}
            text="AND"
            hint="both sides match"
          />
          <Key
            calculatorKey={{ kind: 'logic', value: 'OR' }}
            text="OR"
            hint="either side matches"
          />
          <Key
            calculatorKey={{ kind: 'logic', value: 'NOT' }}
            text="NOT"
            hint="the next clause does not match"
          />
          <Key
            calculatorKey={{ kind: 'paren', value: '(' }}
            text="("
            hint="open a group"
          />
          <Key
            calculatorKey={{ kind: 'paren', value: ')' }}
            text=")"
            hint="close the group"
          />
        </div>

        <span css={keyRowLabel}>Field</span>
        <div role="group" aria-label="Field keys" css={keyRow}>
          {CALCULATOR_FIELD_KEYS.map((fieldKey) => (
            <Key
              calculatorKey={{ kind: 'field', value: fieldKey.field }}
              text={fieldKey.field}
              hint={fieldKey.hint}
            />
          ))}
        </div>

        <span css={keyRowLabel}>Compare</span>
        <div role="group" aria-label="Compare keys" css={keyRow}>
          {CALCULATOR_OP_KEYS.map((opKey) => (
            <Key
              calculatorKey={{ kind: 'op', value: opKey.op }}
              text={opKey.op}
              label={`Insert ${opKey.hint} (${opKey.op})`}
              hint={opKey.hint}
            >
              <span>{opKey.op}</span>
              <span
                css={`
                  ${type.meta}
                  color: ${tokens.text3};
                `}
              >
                {opKey.hint}
              </span>
            </Key>
          ))}
        </div>

        <span css={keyRowLabel}>Value</span>
        <div role="group" aria-label="Value keys" css={keyRow}>
          {() => {
            const state = inputState()
            const takesValue =
              state.expect === 'value' ||
              (state.expect === 'connector' && state.field !== undefined)
            if (!takesValue) {
              return (
                <span css={keyRowLabel}>
                  Pick a field and a comparison to see values from the records.
                </span>
              )
            }
            const suggestions = calculatorValueSuggestions(
              state.field,
              admin.records(),
            )
            if (suggestions.length === 0) {
              return (
                <span css={keyRowLabel}>
                  {`Type a value for ${state.field ?? 'this field'}. Quote it if it has spaces.`}
                </span>
              )
            }
            return suggestions.map((suggestion) => (
              <Key
                calculatorKey={{ kind: 'value', value: suggestion }}
                text={suggestion}
                hint={
                  state.expect === 'connector'
                    ? 'replaces the last value'
                    : 'seen in the records'
                }
              >
                <span
                  css={`
                    ${truncate}
                    max-width: 14rem;
                  `}
                >
                  {suggestion}
                </span>
              </Key>
            ))
          }}
        </div>
      </div>

      {() => {
        const root = breakdown()
        if (root === null) return null
        const total = chipRecords().length
        return (
          <section aria-label="Expression breakdown">
            <span css={keyRowLabel}>Breakdown</span>
            <ul
              css={`
                margin: var(--admin-space-4) 0 0;
                padding: 0;
                list-style: none;
                display: grid;
                gap: var(--admin-space-2);
              `}
            >
              <BreakdownRow node={root} depth={0} total={total} />
            </ul>
          </section>
        )
      }}

      <div
        css={`
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: var(--admin-space-8);
        `}
      >
        {() =>
          admin.view() === 'analytics' ||
          (admin.view() === 'timeline' && admin.timelineUnit() === 'paths') ? (
            <p
              css={`
                margin: 0;
                color: ${tokens.text2};
              `}
            >
              Include and Exclude decide which sessions match. Show, Hide, and
              Highlight apply to records only.
            </p>
          ) : (
            <div
              role="group"
              aria-label="When a record matches"
              css={`
                display: flex;
                gap: var(--admin-space-4);
              `}
            >
              {MODE_KEYS.map((modeKey) => (
                <Button
                  variant="ghost"
                  label={modeKey.label}
                  title={modeKey.hint}
                  pressed={() => {
                    const mode = admin.filterMode()
                    return (
                      mode === modeKey.mode ||
                      (mode === 'exclude' && modeKey.mode === 'hide')
                    )
                  }}
                  onClick={() => admin.filterMode.set(modeKey.mode)}
                />
              ))}
            </div>
          )
        }
        <span css="flex: 1;" />
        <Button
          variant="ghost"
          label="Save expression"
          title="Save this expression for later"
          disabled={() => !canSave()}
          onClick={() => {
            const source = draft().trim()
            if (!canSave()) return
            saved.set([...saved(), source])
          }}
        >
          Save
        </Button>
        <Button
          variant="primary"
          label="Apply expression"
          title="Apply (Enter)"
          disabled={() => !canApply()}
          onClick={apply}
        >
          = Apply
        </Button>
      </div>

      {() =>
        saved().length === 0 ? null : (
          <section
            aria-label="Saved expressions"
            css={`
              display: grid;
              gap: var(--admin-space-4);
            `}
          >
            <span css={keyRowLabel}>Saved</span>
            <ul
              css={`
                display: flex;
                flex-wrap: wrap;
                gap: var(--admin-space-6);
                margin: 0;
                padding: 0;
                list-style: none;
              `}
            >
              {saved().map((source) => (
                <li
                  css={`
                    display: inline-flex;
                    gap: var(--admin-space-2);
                    min-width: 0;
                  `}
                >
                  <Button
                    variant="ghost"
                    label={`Use saved expression ${source}`}
                    title={source}
                    pressed={() => admin.filterCalculator() === source}
                    onClick={() => {
                      draft.set(source)
                      admin.filterCalculator.set(source)
                    }}
                  >
                    <span
                      css={`
                        ${type.data}
                        ${truncate}
                        max-width: 18rem;
                      `}
                    >
                      {source}
                    </span>
                  </Button>
                  <Button
                    variant="icon"
                    label={`Remove saved expression ${source}`}
                    onClick={() =>
                      saved.set(saved().filter((entry) => entry !== source))
                    }
                  >
                    ×
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )
      }
    </div>
  )
}

const BreakdownRow = ({
  node,
  depth,
  total,
}: {
  node: CalculatorBreakdownNode
  depth: number
  total: number
}) => {
  const share = total === 0 ? 0 : Math.round((node.count / total) * 100)
  const groupWords = node.kind === 'all' ? 'all of' : 'any of'
  const rowLabel =
    node.kind === 'clause'
      ? `${node.label}: ${node.count} of ${total}`
      : `${node.label}, ${groupWords}: ${node.count} of ${total}`
  return (
    <li aria-label={rowLabel}>
      <div
        css:indent={`${depth * 16}px`}
        css:share={`${share}%`}
        css={`
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: var(--admin-space-8);
          align-items: center;
          padding: var(--admin-space-2) var(--admin-space-6);
          padding-left: calc(var(--admin-space-6) + var(--indent));
          border-radius: var(--admin-radius-2);
          background: linear-gradient(
            to right,
            ${soft(tokens.accent, 14)} var(--share),
            transparent var(--share)
          );
          &[data-empty='true'] {
            color: ${tokens.text3};
          }
        `}
        data-empty={String(node.count === 0)}
      >
        <span
          css={`
            ${truncate}
            ${node.kind === 'clause' ? type.data : type.ui}
            color: ${node.kind === 'clause' ? tokens.text1 : tokens.accent};
          `}
        >
          {node.kind === 'clause'
            ? node.label
            : `${node.label} · ${groupWords}`}
        </span>
        <span
          css={`
            ${type.data}
            font-variant-numeric: tabular-nums;
            color: ${tokens.text2};
          `}
        >
          {String(node.count)}
        </span>
      </div>
      {node.children.length === 0 ? null : (
        <ul
          css={`
            margin: var(--admin-space-2) 0 0;
            padding: 0;
            list-style: none;
            display: grid;
            gap: var(--admin-space-2);
          `}
        >
          {node.children.map((child) => (
            <BreakdownRow node={child} depth={depth + 1} total={total} />
          ))}
        </ul>
      )}
    </li>
  )
}
