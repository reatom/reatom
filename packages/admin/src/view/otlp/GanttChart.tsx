import { atom, computed, effect, wrap, type Atom } from '@reatom/core'

import type { Gantt, GanttTime } from '../../gantt'
import { ADMIN_GANTT_ROW_HEIGHT as ROW_HEIGHT } from '../../gantt'
import type { GanttRecordSelection } from '../../gantt/selection'
import type { AdminRecord, OtlpAdmin } from '../../otlp'
import { recordHasError, recordLabel } from '../../otlp'
import {
  ANALYTICS_MIN_SHARE_SESSIONS,
  type AnalyticsPathNode,
} from '../../otlp/analytics'
import {
  Button,
  EmptyState,
  Icon,
  SelectField,
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
  ToolbarSpacer,
  focusVisible,
  kindTokens,
  scrollable,
  tokens,
  truncate,
  type,
  visuallyHidden,
} from '../design-system'
import { KindMark } from './KindMark'
import {
  recordKindIcon,
  recordRowDescription,
  recordStatusIcon,
} from './recordKind'

const LABEL_WIDTH = 220
const INDENT = 12
const CHEVRON = 16

const COLUMNS = `${LABEL_WIDTH}px minmax(0, 1fr)`
let ganttUiCounter = 0

export function formatAxisOffset(offsetMs: number): string {
  const sign = offsetMs < 0 ? '-' : ''
  const abs = Math.abs(offsetMs)
  if (abs < 1000) return `${sign}${Math.round(abs)}ms`
  if (abs < 60_000) {
    const seconds = abs / 1000
    return `${sign}${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)}s`
  }
  if (abs < 3_600_000) return `${sign}${Math.round(abs / 60_000)}m`
  if (abs < 86_400_000) return `${sign}${Math.round(abs / 3_600_000)}h`
  return `${sign}${Math.round(abs / 86_400_000)}d`
}

function recordDuration(record: AdminRecord): string {
  if (record.end === undefined) return ''
  return formatAxisOffset(Math.max(0, record.end - record.start))
}

export interface GanttColumn<Node> {
  id: string
  header: string
  width: string
  render: (node: Node) => Element | string
}

export interface GanttRowAdapter<Node> {
  labelHeader: string
  ariaLabel: string
  rowId: (node: Node) => string
  label: (node: Node) => string
  description?: (node: Node) => string
  barKind: (node: Node) => string
  barVariant: 'span' | 'aggregate'
  status?: (node: Node) => string | undefined
  duration: (node: Node) => string
  isError?: (node: Node) => boolean
  isSelected: (node: Node) => boolean
  isHighlighted?: (node: Node) => boolean
  columns?: Array<GanttColumn<Node>>
  axisLabel: (time: GanttTime, fraction: number) => string
  summary: () => string
  select: (node: Node) => void
  empty: () => Element
  live: boolean
}

const columnPixels = (width: string) => {
  const parsed = Number.parseFloat(width)
  return Number.isFinite(parsed) ? parsed : 0
}

const ganttGridTemplate = <Node,>(adapter: GanttRowAdapter<Node>) => {
  const widths = (adapter.columns ?? []).map((column) => column.width).join(' ')
  return widths === ''
    ? `${LABEL_WIDTH}px minmax(0, 1fr)`
    : `${LABEL_WIDTH}px ${widths} minmax(0, 1fr)`
}

const ganttSideWidth = <Node,>(adapter: GanttRowAdapter<Node>) =>
  LABEL_WIDTH +
  (adapter.columns ?? []).reduce(
    (sum, column) => sum + columnPixels(column.width),
    0,
  )

const shareLabel = (share: number, denominator: number) =>
  denominator < ANALYTICS_MIN_SHARE_SESSIONS ? '—' : percentFormat.format(share)

const percentFormat = new Intl.NumberFormat(undefined, {
  style: 'percent',
  maximumFractionDigits: 0,
})

export interface OtlpGanttChartProps<Node, Key = Node> {
  gantt: Gantt<Node, Key>
  admin: OtlpAdmin
  adapter: GanttRowAdapter<Node>
  /** Opens the frame card for the row that was just selected. */
  onInspect?: () => void
}

export function recordRowAdapter(
  admin: OtlpAdmin,
  selection: GanttRecordSelection,
): GanttRowAdapter<AdminRecord> {
  return {
    labelHeader: 'Span',
    ariaLabel: 'Timeline',
    rowId: (row) => row.id,
    label: (row) => recordLabel(row),
    barKind: (row) => recordKindIcon(row, admin.mountLogIds()),
    barVariant: 'span',
    status: (row) => recordStatusIcon(row),
    duration: (row) => recordDuration(row),
    isError: (row) => recordHasError(row),
    isSelected: (row) => admin.selectedRecordId() === row.id,
    isHighlighted: (row) => admin.highlightedIds().has(row.id),
    axisLabel: (time, fraction) =>
      formatAxisOffset((time.end - time.start) * fraction),
    summary: () => {
      const rowCount = admin.gantt.rows().length
      const time = admin.gantt.visibleTime()
      const span = time === null ? 0 : Math.max(0, time.end - time.start)
      const noun = rowCount === 1 ? 'row' : 'rows'
      return `${rowCount} ${noun} · ${formatAxisOffset(span)}`
    },
    select: (row) => selection.select(row),
    empty: () => {
      const filtered = admin.records().length > 0
      return (
        <EmptyState
          title={filtered ? 'No matching records' : 'No records yet'}
          description={
            filtered
              ? 'Reset filters to show the captured records again.'
              : 'Nothing has been captured. OpenTelemetry may have been created after the app atoms, skipGlobalExtension may be on, a filter may be dropping every span, or consent and kill switches may be off.'
          }
          action={
            filtered ? (
              <Button label="Reset filters" onClick={() => admin.resetFilter()}>
                Reset
              </Button>
            ) : (
              <a
                href="https://v1001.reatom.dev"
                css={`
                  color: ${tokens.accent};
                `}
              >
                OpenTelemetry setup
              </a>
            )
          }
        />
      )
    },
    live: true,
  }
}

export function pathRowAdapter(
  admin: OtlpAdmin,
): GanttRowAdapter<AnalyticsPathNode> {
  const paths = admin.analytics.paths
  return {
    labelHeader: 'Step',
    ariaLabel: 'Paths',
    rowId: (node) => node.id,
    label: (node) => node.label,
    description: (node) =>
      node.direction === 'before'
        ? `${node.label}, before the alignment point`
        : node.direction === 'after'
          ? `${node.label}, after the alignment point`
          : node.label,
    barKind: () => 'path',
    barVariant: 'aggregate',
    duration: (node) => formatAxisOffset(node.durationMs.median),
    isError: (node) => node.sessionsWithErrors > 0,
    isSelected: (node) => paths.selected()?.id === node.id,
    columns: [
      {
        id: 'sessions',
        header: 'Sessions',
        width: '88px',
        render: (node) => {
          const rootSessions =
            node.share > 0 ? node.sessions / node.share : node.sessions
          return (
            <span
              css={`
                display: grid;
                gap: 2px;
                min-width: 0;
              `}
            >
              <span>{String(node.sessions)}</span>
              <span
                css={`
                  display: block;
                  height: 4px;
                  background: ${tokens.surface3};
                  border-radius: var(--admin-radius-2);
                  overflow: hidden;
                `}
              >
                <span
                  style:width={`${Math.max(0, Math.min(1, node.share)) * 100}%`}
                  css={`
                    display: block;
                    height: 100%;
                    background: ${tokens.accent};
                  `}
                />
              </span>
              <span
                css={`
                  color: ${tokens.text3};
                `}
              >
                {shareLabel(node.share, rootSessions)}
              </span>
            </span>
          )
        },
      },
      {
        id: 'continue',
        header: 'Continue %',
        width: '72px',
        render: (node) => {
          const parentSessions =
            node.continuation > 0 ? node.sessions / node.continuation : 0
          return shareLabel(node.continuation, parentSessions)
        },
      },
      {
        id: 'stops',
        header: 'Exit here',
        width: '96px',
        render: (node) =>
          node.direction === 'before'
            ? `Entered here ${node.stops}`
            : String(node.stops),
      },
      {
        id: 'median',
        header: 'Median on step',
        width: '96px',
        render: (node) => formatAxisOffset(node.durationMs.median),
      },
      {
        id: 'errors',
        header: 'Errors',
        width: '56px',
        render: (node) => String(node.sessionsWithErrors),
      },
    ],
    axisLabel: (time, fraction) =>
      formatAxisOffset(time.start + (time.end - time.start) * fraction),
    summary: () => {
      const shown = admin.analytics.pathNodes()[0]?.sessions ?? 0
      const total = admin.analytics.segment().length
      const align = admin.analytics.align()
      if (align === undefined) return `Paths over ${shown} sessions`
      return `Paths over ${shown} of ${total} sessions, aligned at ${align}, ${admin.analytics.leftOut()} without ${align} left out`
    },
    select: (node) => paths.select(node),
    empty: () => (
      <EmptyState
        title="No paths"
        description="No sessions in this segment have the aligned step."
      />
    ),
    live: false,
  }
}

const GanttRow = ({
  gantt,
  admin,
  adapter,
  row,
  rowIndex,
  onInspect,
}: {
  gantt: Gantt<AdminRecord>
  admin: OtlpAdmin
  adapter: GanttRowAdapter<AdminRecord>
  row: AdminRecord
  rowIndex: () => number
  onInspect?: () => void
}) => {
  const label = recordLabel(row)
  const duration = recordDuration(row)
  const depth = computed(() => gantt.depth(row), `_Admin.gantt.row.depth`)
  const hasChildren = computed(
    () => gantt.children(row).length > 0,
    `_Admin.gantt.row.hasChildren`,
  )
  const expanded = computed(
    () => hasChildren() && gantt.isExpanded(row),
    `_Admin.gantt.row.expanded`,
  )
  const spanCount = computed(
    () =>
      row.kind === 'span' && depth() === 0
        ? admin.spanCountByTrace().get(row.traceId)
        : undefined,
    `_Admin.gantt.row.spanCount`,
  )
  const kindName = computed(
    () => recordKindIcon(row, admin.mountLogIds()),
    `_Admin.gantt.row.kind`,
  )
  const statusName = recordStatusIcon(row)

  return (
    <div
      role="row"
      tabindex={-1}
      data-testid="gantt-row"
      data-record-id={row.id}
      data-depth={() => String(depth())}
      data-kind={row.kind}
      data-outcome={row.outcome ?? ''}
      data-band={() =>
        kindName() === 'action' && hasChildren() ? 'true' : 'false'
      }
      aria-label={label}
      aria-description={() =>
        recordRowDescription(row, {
          spanCount: spanCount(),
          duration,
          mountIds: admin.mountLogIds(),
        })
      }
      aria-level={() => depth() + 1}
      aria-expanded={() => (hasChildren() ? expanded() : undefined)}
      aria-rowindex={rowIndex}
      aria-selected={() => adapter.isSelected(row)}
      data-highlighted={() => (adapter.isHighlighted?.(row) ? 'true' : 'false')}
      title={label}
      css={`
        box-sizing: border-box;
        display: grid;
        grid-template-columns: ${COLUMNS};
        align-items: center;
        height: ${ROW_HEIGHT}px;
        border-bottom: 1px solid ${tokens.border1};
        background: ${tokens.canvas};
        color: ${tokens.text1};
        ${type.data}
        cursor: pointer;
        &[data-band='true']:not([aria-selected='true']):not(:hover) {
          background: color-mix(
            in oklch,
            ${kindTokens.action} 7%,
            ${tokens.canvas}
          );
        }
        [data-admin-colors='false']
          &[data-band='true']:not([aria-selected='true']):not(:hover) {
          background: ${tokens.canvas};
        }
        &:hover {
          background: ${tokens.surface2};
        }
        &[aria-selected='true'] {
          background: color-mix(
            in oklch,
            ${tokens.accent} 24%,
            ${tokens.canvas}
          );
        }
        &[data-highlighted='true'] {
          box-shadow: inset 3px 0 0 ${tokens.accent};
        }
      `}
      on:click={(event: MouseEvent) => {
        adapter.select(row)
        onInspect?.()
        if (event.currentTarget instanceof HTMLElement) {
          event.currentTarget
            .closest<HTMLElement>('[data-testid="otlp-gantt"]')
            ?.focus()
        }
      }}
    >
      <div
        data-gantt-label=""
        style:padding-left={() => `${depth() * INDENT + 8}px`}
        css={`
          display: flex;
          align-items: center;
          gap: var(--admin-space-4);
          min-width: 0;
          height: 100%;
          padding-right: var(--admin-space-8);
        `}
      >
        {() =>
          hasChildren() ? (
            <button
              type="button"
              data-testid="gantt-expand"
              aria-expanded={expanded}
              aria-label={() =>
                expanded() ? `Collapse ${label}` : `Expand ${label}`
              }
              css={`
                ${focusVisible}
                appearance: none;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: ${CHEVRON}px;
                height: ${CHEVRON}px;
                padding: 0;
                border: 0;
                background: transparent;
                color: ${tokens.text2};
                cursor: pointer;
                flex: 0 0 ${CHEVRON}px;
              `}
              on:click={(event: MouseEvent) => {
                event.stopPropagation()
                gantt.toggle(row)
                if (event.currentTarget instanceof HTMLElement) {
                  event.currentTarget
                    .closest<HTMLElement>('[data-testid="otlp-gantt"]')
                    ?.focus()
                }
              }}
            >
              {() => (
                <Icon name={expanded() ? 'chevron-down' : 'chevron-right'} />
              )}
            </button>
          ) : (
            <span
              aria-hidden="true"
              css={`
                width: ${CHEVRON}px;
                flex: 0 0 ${CHEVRON}px;
              `}
            />
          )
        }
        {() => <KindMark kind={kindName()} />}
        <span
          data-testid="gantt-row-label"
          css={`
            min-width: 0;
            ${truncate}
            color: ${recordHasError(row) ? tokens.error : tokens.text1};
          `}
        >
          {label}
          {row.error?.message ? ` — ${row.error.message}` : ''}
          {() =>
            spanCount() !== undefined ? (
              <span
                css={`
                  color: ${tokens.text3};
                `}
              >{` ${spanCount()}`}</span>
            ) : null
          }
        </span>
        {statusName ? (
          <span
            data-gantt-status=""
            css={`
              display: flex;
              flex: 0 0 auto;
              color: ${statusName === 'error' ? tokens.error : tokens.text2};
            `}
          >
            <Icon name={statusName} size={12} />
          </span>
        ) : null}
        {duration !== '' && (
          <span
            data-gantt-duration=""
            css={`
              flex: 0 0 auto;
              color: ${tokens.text3};
              font-variant-numeric: tabular-nums;
            `}
          >
            {duration}
          </span>
        )}
      </div>
      <div
        data-gantt-track=""
        data-gantt-bars=""
        css={`
          position: relative;
          height: 10px;
          margin-inline: var(--admin-space-8);
          background: ${tokens.surface3};
          border-radius: var(--admin-radius-2);
          overflow: hidden;
        `}
      >
        <div
          data-testid="gantt-bar"
          data-record-kind={() => kindName()}
          data-status={statusName ?? ''}
          style:left={() => {
            const geometry = gantt.bar(row)
            return geometry === null ? '0%' : `${geometry.left * 100}%`
          }}
          style:width={() => {
            const geometry = gantt.bar(row)
            if (geometry === null || geometry.width <= 0) return '2px'
            return `${geometry.width * 100}%`
          }}
          css={`
            position: absolute;
            top: 0;
            bottom: 0;
            min-width: 2px;
            border-radius: var(--admin-radius-2);
            background: var(--bar-color);
            --bar-color: ${kindTokens.other};
            &[data-record-kind='action'] {
              --bar-color: ${kindTokens.action};
            }
            &[data-record-kind='atom'] {
              --bar-color: ${kindTokens.atom};
            }
            &[data-record-kind='computed'] {
              --bar-color: ${kindTokens.computed};
            }
            &[data-record-kind='effect'] {
              --bar-color: ${kindTokens.effect};
            }
            &[data-record-kind='log'] {
              --bar-color: ${kindTokens.log};
            }
            [data-admin-colors='false'] & {
              --bar-color: ${tokens.text3};
            }
            &[data-status='error'] {
              background: ${tokens.error};
            }
            &[data-status='abort'] {
              background: repeating-linear-gradient(
                135deg,
                ${tokens.text3} 0 2px,
                transparent 2px 5px
              );
            }
            &[data-status='pending'],
            &[data-status='suspense'] {
              background: repeating-linear-gradient(
                135deg,
                var(--bar-color) 0 4px,
                color-mix(in oklch, var(--bar-color) 35%, transparent) 4px 8px
              );
            }
            &[data-status='pending'] {
              mask-image: linear-gradient(90deg, black 70%, transparent);
            }
          `}
        />
      </div>
    </div>
  )
}

const PathGanttRow = ({
  gantt,
  adapter,
  row,
  rowIndex,
  columns,
  onInspect,
}: {
  gantt: Gantt<AnalyticsPathNode, string>
  adapter: GanttRowAdapter<AnalyticsPathNode>
  row: AnalyticsPathNode
  rowIndex: () => number
  columns: string
  onInspect?: () => void
}) => {
  const depth = computed(() => gantt.depth(row), `_Admin.gantt.path.depth`)
  const hasChildren = computed(
    () => gantt.children(row).length > 0,
    `_Admin.gantt.path.hasChildren`,
  )
  const expanded = computed(
    () => hasChildren() && gantt.isExpanded(row),
    `_Admin.gantt.path.expanded`,
  )
  const label = adapter.label(row)
  return (
    <div
      role="row"
      tabindex={-1}
      data-testid="gantt-row"
      data-path-id={adapter.rowId(row)}
      data-depth={() => String(depth())}
      aria-label={label}
      aria-description={() => adapter.description?.(row) ?? label}
      aria-level={() => depth() + 1}
      aria-expanded={() => (hasChildren() ? expanded() : undefined)}
      aria-rowindex={rowIndex}
      aria-selected={() => adapter.isSelected(row)}
      title={label}
      css={`
        box-sizing: border-box;
        display: grid;
        grid-template-columns: ${columns};
        align-items: center;
        height: ${ROW_HEIGHT}px;
        border-bottom: 1px solid ${tokens.border1};
        background: ${tokens.canvas};
        color: ${tokens.text1};
        ${type.data}
        cursor: pointer;
        &:hover {
          background: ${tokens.surface2};
        }
        &[aria-selected='true'] {
          background: color-mix(
            in oklch,
            ${tokens.accent} 24%,
            ${tokens.canvas}
          );
        }
      `}
      on:click={(event: MouseEvent) => {
        adapter.select(row)
        onInspect?.()
        if (event.currentTarget instanceof HTMLElement) {
          event.currentTarget
            .closest<HTMLElement>('[data-testid="otlp-gantt"]')
            ?.focus()
        }
      }}
    >
      <div
        data-gantt-label=""
        style:padding-left={() => `${depth() * INDENT + 8}px`}
        css={`
          display: flex;
          align-items: center;
          gap: var(--admin-space-4);
          min-width: 0;
          height: 100%;
          padding-right: var(--admin-space-8);
        `}
      >
        {() =>
          hasChildren() ? (
            <button
              type="button"
              data-testid="gantt-expand"
              aria-expanded={expanded}
              aria-label={() =>
                expanded() ? `Collapse ${label}` : `Expand ${label}`
              }
              css={`
                ${focusVisible}
                appearance: none;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: ${CHEVRON}px;
                height: ${CHEVRON}px;
                padding: 0;
                border: 0;
                background: transparent;
                color: ${tokens.text2};
                cursor: pointer;
                flex: 0 0 ${CHEVRON}px;
              `}
              on:click={(event: MouseEvent) => {
                event.stopPropagation()
                gantt.toggle(row)
                if (event.currentTarget instanceof HTMLElement) {
                  event.currentTarget
                    .closest<HTMLElement>('[data-testid="otlp-gantt"]')
                    ?.focus()
                }
              }}
            >
              {() => (
                <Icon name={expanded() ? 'chevron-down' : 'chevron-right'} />
              )}
            </button>
          ) : (
            <span
              aria-hidden="true"
              css={`
                width: ${CHEVRON}px;
                flex: 0 0 ${CHEVRON}px;
              `}
            />
          )
        }
        <span
          data-testid="gantt-row-label"
          css={`
            min-width: 0;
            ${truncate}
            color: ${adapter.isError?.(row) ? tokens.error : tokens.text1};
          `}
        >
          {label}
        </span>
      </div>
      {(adapter.columns ?? []).map((column) => (
        <div
          data-gantt-column={column.id}
          css={`
            min-width: 0;
            padding-inline: var(--admin-space-4);
            color: ${tokens.text2};
            ${truncate}
          `}
        >
          {column.render(row)}
        </div>
      ))}
      <div
        data-gantt-track=""
        css={`
          position: relative;
          height: 10px;
          margin-inline: var(--admin-space-8);
        `}
      >
        <div
          data-testid="gantt-bar"
          data-bar-variant="aggregate"
          style:left={() => {
            const geometry = gantt.bar(row)
            return geometry === null ? '0%' : `${geometry.left * 100}%`
          }}
          style:width={() => {
            const geometry = gantt.bar(row)
            if (geometry === null || geometry.width <= 0) return '2px'
            return `${geometry.width * 100}%`
          }}
          css={`
            position: absolute;
            top: 0;
            bottom: 0;
            min-width: 2px;
            box-sizing: border-box;
            border-radius: var(--admin-radius-2);
            background: transparent;
            border: 1px solid ${tokens.accent};
          `}
        />
      </div>
    </div>
  )
}

export const OtlpGanttChart = <Node, Key = Node>({
  gantt,
  admin,
  adapter,
  onInspect,
}: OtlpGanttChartProps<Node, Key>) => {
  const uiId = ++ganttUiCounter
  const seenCount = atom(0, `_Admin.gantt.seen.${uiId}`)
  const unseen = atom(0, `_Admin.gantt.unseen.${uiId}`)
  effect(() => {
    const count = gantt.rows().length
    if (admin.followLive()) {
      seenCount.set(count)
      unseen.set(0)
      return
    }
    unseen.set(Math.max(0, count - seenCount()))
  }, `_Admin.gantt.unseen.${uiId}`)

  const isEmpty = computed(
    () => gantt.rows().length === 0,
    `_Admin.gantt.isEmpty.${uiId}`,
  )
  const rowIndexes = computed(() => {
    const { offset, items } = gantt.virtual()
    return new Map(items.map((row, index) => [row, offset + index + 1]))
  }, `_Admin.gantt.rowIndexes.${uiId}`)
  const columns = ganttGridTemplate(adapter)
  const sideWidth = ganttSideWidth(adapter)
  const alignChoice = atom<string>(
    admin.analytics.align() ?? '',
    `_Admin.gantt.align.${uiId}`,
  )
  effect(() => {
    const next = admin.analytics.align() ?? ''
    if (alignChoice() !== next) alignChoice.set(next)
  }, `_Admin.gantt.align.sync.${uiId}`)
  effect(() => {
    if (admin.timelineUnit() !== 'paths') return
    const choice = alignChoice()
    const next = choice === '' ? undefined : choice
    if (admin.analytics.align() !== next) admin.showPaths(next)
  }, `_Admin.gantt.align.apply.${uiId}`)
  const rowElements = gantt.virtual.reatomMap(
    (row) =>
      adapter.barVariant === 'span' ? (
        <GanttRow
          gantt={gantt as Gantt<AdminRecord>}
          admin={admin}
          adapter={adapter as GanttRowAdapter<AdminRecord>}
          row={row as AdminRecord}
          rowIndex={() => rowIndexes().get(row) ?? 0}
          onInspect={onInspect}
        />
      ) : (
        <PathGanttRow
          gantt={gantt as Gantt<AnalyticsPathNode, string>}
          adapter={adapter as GanttRowAdapter<AnalyticsPathNode>}
          row={row as AnalyticsPathNode}
          rowIndex={() => rowIndexes().get(row) ?? 0}
          columns={columns}
          onInspect={onInspect}
        />
      ),
    `_Admin.gantt.rowElements.${uiId}`,
  )

  let pan: {
    pointerId: number
    x: number
    start: number
    end: number
    width: number
  } | null = null

  const placeCursor = (event: PointerEvent) => {
    const host = event.currentTarget
    if (!(host instanceof HTMLElement)) return
    const time = gantt.visibleTime()
    if (time === null || time.end <= time.start) {
      gantt.cursor.set(null)
      return
    }
    const rect = host.getBoundingClientRect()
    const trackWidth = rect.width - sideWidth
    if (trackWidth <= 0) return
    const ratio = (event.clientX - rect.left - sideWidth) / trackWidth
    if (ratio < 0 || ratio > 1) {
      gantt.cursor.set(null)
      return
    }
    gantt.cursor.set(time.start + (time.end - time.start) * ratio)
  }

  return (
    <section
      data-testid="otlp-gantt"
      data-reatom-name="OtlpGanttChart"
      tabindex={0}
      role="treegrid"
      aria-label={adapter.ariaLabel}
      aria-rowcount={() => gantt.rows().length}
      css={`
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
        height: 100%;
        min-height: 0;
        min-width: 0;
        outline: none;
        background: ${tokens.canvas};
        ${focusVisible}
      `}
    >
      <h2 css={visuallyHidden}>Timeline</h2>
      <div
        css={`
          ${scrollable}
          overflow-y: hidden;
          background: ${tokens.surface1};
        `}
      >
        <div
          css={`
            width: max-content;
            min-width: 100%;
          `}
        >
          <Toolbar>
            <ToolbarGroup>
              <Button
                variant="secondary"
                label="Fit time"
                testId="gantt-fit"
                disabled={() => gantt.range() === null}
                onClick={() => gantt.fit()}
              >
                Fit
              </Button>
              <Button
                variant="secondary"
                label="Zoom in"
                testId="gantt-zoom-in"
                disabled={() => gantt.visibleTime() === null}
                onClick={() => gantt.zoom(1.5)}
              >
                +
              </Button>
              <Button
                variant="secondary"
                label="Zoom out"
                testId="gantt-zoom-out"
                disabled={() => gantt.visibleTime() === null}
                onClick={() => gantt.zoom(1 / 1.5)}
              >
                −
              </Button>
            </ToolbarGroup>
            <ToolbarSeparator />
            <ToolbarGroup>
              <Button
                variant="secondary"
                label="Expand all"
                testId="gantt-expand-all"
                onClick={() => gantt.expandAll()}
              >
                Expand
              </Button>
              <Button
                variant="secondary"
                label="Collapse all"
                testId="gantt-collapse-all"
                onClick={() => gantt.collapseAll()}
              >
                Collapse
              </Button>
            </ToolbarGroup>
            <ToolbarSeparator />
            <ToolbarGroup>
              <Button
                variant="ghost"
                label="Waterfall"
                testId="gantt-mode-waterfall"
                pressed={() =>
                  admin.timelineUnit() === 'records' &&
                  admin.gantt.mode() === 'waterfall'
                }
                onClick={() => {
                  admin.timelineUnit.set('records')
                  admin.gantt.mode.set('waterfall')
                }}
              >
                Waterfall
              </Button>
              <Button
                variant="ghost"
                label="Log"
                testId="gantt-mode-log"
                pressed={() =>
                  admin.timelineUnit() === 'records' &&
                  admin.gantt.mode() === 'log'
                }
                onClick={() => {
                  admin.timelineUnit.set('records')
                  admin.gantt.mode.set('log')
                }}
              >
                Log
              </Button>
              <Button
                variant="ghost"
                label="Paths"
                testId="gantt-mode-paths"
                pressed={() => admin.timelineUnit() === 'paths'}
                onClick={() => admin.showPaths(admin.analytics.align())}
              >
                Paths
              </Button>
            </ToolbarGroup>
            {() =>
              admin.timelineUnit() === 'paths' ? (
                <ToolbarGroup>
                  <SelectField
                    value={alignChoice}
                    label="Align at"
                    options={() => [
                      { value: '', label: 'Session start' },
                      ...admin.analytics.breakdowns().page.map((row) => ({
                        value: row.key,
                        label: row.key,
                      })),
                    ]}
                  />
                  <Button
                    variant="secondary"
                    label="Typical path"
                    testId="gantt-typical-path"
                    onClick={() => admin.analytics.expandTypicalPath()}
                  >
                    Typical path
                  </Button>
                  <Button
                    variant="secondary"
                    label="Open typical session"
                    testId="gantt-open-typical-session"
                    onClick={() => admin.openTypicalSession()}
                  >
                    Open typical session
                  </Button>
                </ToolbarGroup>
              ) : null
            }
            <ToolbarSpacer />
            {adapter.live ? (
              <span>
                {() =>
                  unseen() > 0 ? (
                    <Button
                      variant="ghost"
                      label="New records"
                      onClick={() => admin.followLive.setTrue()}
                    >
                      {() => `${unseen()} new`}
                    </Button>
                  ) : null
                }
              </span>
            ) : null}
            {adapter.live ? (
              <Button
                variant="ghost"
                label="Follow live"
                pressed={() => admin.followLive()}
                onClick={() => {
                  if (admin.followLive()) admin.followLive.setFalse()
                  else admin.followLive.setTrue()
                }}
              >
                {() => (admin.followLive() ? 'Following' : 'Follow live')}
              </Button>
            ) : null}
            <span
              data-testid="gantt-summary"
              css={`
                ${type.meta}
                color: ${tokens.text3};
                font-variant-numeric: tabular-nums;
                white-space: nowrap;
              `}
            >
              {() => adapter.summary()}
            </span>
          </Toolbar>
        </div>
      </div>
      <div
        css={`
          position: relative;
          min-height: 0;
          min-width: 0;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr);
        `}
        on:pointermove={placeCursor}
        on:pointerleave={() => {
          if (pan === null) gantt.cursor.set(null)
        }}
      >
        <div
          css={`
            display: grid;
            grid-template-columns: ${columns};
            min-height: 22px;
            border-bottom: 1px solid ${tokens.border1};
            background: ${tokens.surface1};
            ${type.meta}
            color: ${tokens.text3};
          `}
        >
          <div
            css={`
              padding-inline: var(--admin-space-8);
              align-self: center;
            `}
          >
            {adapter.labelHeader}
          </div>
          {(adapter.columns ?? []).map((column) => (
            <div
              css={`
                padding-inline: var(--admin-space-4);
                align-self: center;
                min-width: 0;
              `}
            >
              {column.header}
            </div>
          ))}
          <div
            data-testid="gantt-axis"
            css={`
              position: relative;
              min-width: 0;
              cursor: ew-resize;
              touch-action: none;
            `}
            on:pointerdown={(event: PointerEvent) => {
              if (event.button !== 0) return
              const time = gantt.visibleTime()
              const axis = event.currentTarget
              if (time === null || !(axis instanceof HTMLElement)) return
              const width = axis.getBoundingClientRect().width
              pan = {
                pointerId: event.pointerId,
                x: event.clientX,
                start: time.start,
                end: time.end,
                width,
              }
              axis.setPointerCapture(event.pointerId)
            }}
            on:pointermove={(event: PointerEvent) => {
              if (pan === null || pan.pointerId !== event.pointerId) return
              const span = pan.end - pan.start
              const deltaPx = event.clientX - pan.x
              const delta = pan.width <= 0 ? 0 : (-deltaPx / pan.width) * span
              gantt.timeWindow.set({
                start: pan.start + delta,
                end: pan.end + delta,
              })
            }}
            on:pointerup={(event: PointerEvent) => {
              pan = null
              const axis = event.currentTarget
              if (
                axis instanceof HTMLElement &&
                axis.hasPointerCapture(event.pointerId)
              ) {
                axis.releasePointerCapture(event.pointerId)
              }
            }}
            on:pointercancel={() => {
              pan = null
            }}
          >
            {() => {
              const time = gantt.visibleTime()
              if (time === null) return null
              const count = 4
              return (
                <div
                  css={`
                    position: absolute;
                    inset: 0;
                  `}
                >
                  {Array.from({ length: count + 1 }, (_, index) => {
                    const fraction = index / count
                    const align =
                      index === 0 ? '0' : index === count ? '-100%' : '-50%'
                    return (
                      <span
                        style:left={`${fraction * 100}%`}
                        css={`
                          position: absolute;
                          top: 4px;
                          transform: translateX(${align});
                          white-space: nowrap;
                          font-variant-numeric: tabular-nums;
                        `}
                      >
                        {adapter.axisLabel(time, fraction)}
                      </span>
                    )
                  })}
                </div>
              )
            }}
          </div>
        </div>
        <div
          css={`
            position: relative;
            min-height: 0;
            min-width: 0;
          `}
        >
          {() => {
            const cursor = gantt.cursor()
            const time = gantt.visibleTime()
            if (cursor === null || time === null || time.end <= time.start) {
              return null
            }
            const fraction = Math.min(
              1,
              Math.max(0, (cursor - time.start) / (time.end - time.start)),
            )
            return (
              <div
                data-testid="gantt-cursor"
                style:left={`calc(${sideWidth}px + (100% - ${sideWidth}px) * ${fraction})`}
                css={`
                  position: absolute;
                  top: 0;
                  bottom: 0;
                  width: 1px;
                  background: ${tokens.text3};
                  pointer-events: none;
                  z-index: 1;
                `}
              />
            )
          }}
          <div
            data-testid="gantt-scroller"
            css={`
              ${scrollable}
              overflow-x: hidden;
              height: 100%;
            `}
            ref={(scroller) => {
              const unbindScroller = gantt.virtual.bindScroller(scroller)
              const onWheel = wrap((event: WheelEvent) => {
                if (!event.ctrlKey && !event.metaKey) return
                event.preventDefault()
                const time = gantt.visibleTime()
                if (time === null || !(time.end > time.start)) return
                const rect = scroller.getBoundingClientRect()
                const trackWidth = rect.width - sideWidth
                const ratio =
                  trackWidth <= 0
                    ? 0.5
                    : (event.clientX - rect.left - sideWidth) / trackWidth
                const anchor =
                  time.start +
                  (time.end - time.start) * Math.min(1, Math.max(0, ratio))
                gantt.zoom(event.deltaY < 0 ? 1.25 : 0.8, anchor)
              })
              scroller.addEventListener('wheel', onWheel, { passive: false })

              return () => {
                scroller.removeEventListener('wheel', onWheel)
                unbindScroller()
              }
            }}
          >
            <div
              data-testid="gantt-spacer-before"
              style:height={() => `${gantt.virtual.padding().before}px`}
            />
            <div
              data-testid="gantt-window"
              style:top={() => `${gantt.virtual.stickyInset()}px`}
              style:bottom={() => `${gantt.virtual.stickyInset()}px`}
              css={`
                position: sticky;
              `}
            >
              {() =>
                isEmpty() ? (
                  <div data-testid="gantt-empty">{adapter.empty()}</div>
                ) : null
              }
              <div data-testid="gantt-rows">{rowElements}</div>
            </div>
            <div
              data-testid="gantt-spacer-after"
              style:height={() => `${gantt.virtual.padding().after}px`}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
