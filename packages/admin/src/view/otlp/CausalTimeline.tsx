import { atom, computed, wrap } from '@reatom/core'

import {
  crossingBuses,
  crossingBusSummary,
  type CausalBusRoute,
} from '../../causal/buses'
import type { CausalEdge } from '../../causal/graph'
import type { TimelineSection } from '../../causal/model'
import type { OtlpAdmin } from '../../otlp'
import { recordLabel } from '../../otlp'
import {
  Button,
  EmptyState,
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
  focusVisible,
  scrollable,
  tokens,
  truncate,
  type,
} from '../design-system'
import { CausalContinuations } from './CausalContinuations'
import { formatAxisOffset } from './GanttChart'
import { EqualStateWarning } from './EqualStateWarning'
import { KindMark } from './KindMark'
import { recordKindIcon, recordRowDescription } from './recordKind'

const SECTIONS = ['graph', 'logs', 'time'] as const
const LABELS = { graph: 'Graph', logs: 'Logs', time: 'Time' }
let counter = 0

/** Product timeline: one window and one row grid for all three sections. */
export function CausalTimeline({ admin }: { admin: OtlpAdmin }) {
  const model = admin.causal,
    id = ++counter
  // Mount rows are already excluded by the causal predicate unless requested.
  // Keep the legacy whole-capture mount index off the default rendering path.
  const mountIds = () =>
    admin.showMountLogs() ? admin.mountLogIds() : undefined
  const viewportWidth = atom(0, `_Admin.causal.ui.${id}.viewportWidth`)
  const width = () =>
    Math.max(
      viewportWidth(),
      SECTIONS.reduce(
        (sum, key) => sum + (model.sections[key]() ? model.widths[key]() : 0),
        0,
      ),
    )
  // The last visible section owns spare space. Saved widths remain minimums,
  // so toggling a section never loses an explicit resize or narrows its peers.
  const sectionWidth = (key: TimelineSection) => {
    if (!model.sections[key]()) return 0
    const active = SECTIONS.filter((section) => model.sections[section]())
    const spare =
      width() -
      active.reduce((sum, section) => sum + model.widths[section](), 0)
    return model.widths[key]() + (active.at(-1) === key ? spare : 0)
  }
  const tracks = () => SECTIONS.map((key) => `${sectionWidth(key)}px`).join(' ')
  const minimumWidth = (key: TimelineSection) => {
    const active = SECTIONS.filter((section) => model.sections[section]())
    return Math.max(
      key === 'graph' ? 60 : 160,
      active.at(-1) === key
        ? viewportWidth() -
            active.reduce(
              (sum, section) =>
                sum + (section === key ? 0 : model.widths[section]()),
              0,
            )
        : 0,
    )
  }
  const maximumWidth = (key: TimelineSection) =>
    Math.max(2000, minimumWidth(key))
  const only = (key: TimelineSection) =>
    model.sections[key]() &&
    SECTIONS.filter((section) => model.sections[section]()).length === 1
  const toggleRefs = new Map<TimelineSection, HTMLButtonElement>()
  const resizeSection = (section: TimelineSection, next: number) => {
    model.resizeSection(section, next)
    if (section === 'graph')
      model.busTrackBudget.set(
        Math.max(1, Math.min(4, Math.floor((model.widths.graph() - 36) / 18))),
      )
  }
  const horizontal = atom(0, `_Admin.causal.ui.${id}.horizontal`)
  const resizeDisplayed = (section: TimelineSection, next: number) => {
    const clamped = Math.max(
      minimumWidth(section),
      Math.min(maximumWidth(section), next),
    )
    // Spare space is not a saved resize. A blocked leftward drag must not
    // enlarge the remembered width when the other sections return.
    if (Math.round(clamped) !== Math.round(sectionWidth(section)))
      resizeSection(section, clamped)
  }
  const highlight = computed(() => {
    const chain = model.selectionChain(),
      routes = new Map<
        string,
        { start: number; end: number; branches: Set<string> }
      >()
    if (chain.chosen && model.sections.graph()) {
      const layout = model.buses()
      for (const route of layout.routes) {
        let start = Infinity,
          end = -Infinity
        const branches = new Set<string>()
        for (const edge of route.edges) {
          if (!chain.includesProjected(edge)) continue
          const from = layout.ranks.get(edge.from)!,
            to = layout.ranks.get(edge.to)!
          start = Math.min(start, from, to)
          end = Math.max(end, from, to)
          branches.add(edge.from)
          branches.add(edge.to)
        }
        if (branches.size) routes.set(route.key, { start, end, branches })
      }
    }
    return { chosen: chain.chosen, neighbors: chain.related, routes }
  }, `_Admin.causal.ui.${id}.highlight`)
  const inspectRelations = (
    row: Parameters<typeof model.select>[0],
    direction: 'causes' | 'effects',
  ) => {
    model.select(row)
    model.relationshipDirection.set(direction)
    admin.inspectorTab.set('causes')
    admin.cardOpen.setTrue()
  }
  let scroller: HTMLElement | null = null
  const fitSection = (section: TimelineSection) => {
    if (section === 'graph') {
      resizeSection(section, 116)
      return
    }
    if (section === 'time') {
      const otherWidth = SECTIONS.reduce(
        (sum, key) =>
          sum +
          (key !== section && model.sections[key]() ? sectionWidth(key) : 0),
        0,
      )
      resizeSection(section, Math.max(160, viewportWidth() - otherWidth))
      return
    }
    const cell = scroller?.querySelector<HTMLElement>('[data-causal-record]')
    const context = document.createElement('canvas').getContext('2d')
    if (!cell || !context) {
      resizeSection(section, 300)
      return
    }
    const style = getComputedStyle(cell)
    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
    let labelWidth = 0
    // Explicit fitting can inspect all filtered names; scrolling never does.
    for (const row of model.visible.array())
      labelWidth = Math.max(
        labelWidth,
        context.measureText(recordLabel(row.record())).width,
      )
    // Leave space for icons, relation counts, and a useful time axis. Long
    // names still have their full title without creating a huge horizontal list.
    const available = Math.max(
      160,
      viewportWidth() -
        (model.sections.graph() ? sectionWidth('graph') : 0) -
        (model.sections.time() ? 160 : 0),
    )
    resizeSection(
      section,
      Math.min(Math.ceil(labelWidth + 112), available, 800),
    )
  }
  let drag: {
    element: HTMLElement
    pointerId: number
    section: TimelineSection
    x: number
    width: number
  } | null = null
  const cancelDrag = () => {
    if (drag?.element.hasPointerCapture(drag.pointerId))
      drag.element.releasePointerCapture(drag.pointerId)
    drag = null
  }
  const resize = (section: TimelineSection) => (
    <div
      role="separator"
      tabindex={0}
      aria-orientation="vertical"
      aria-label={`Resize ${LABELS[section]} column`}
      aria-valuemin={() => minimumWidth(section)}
      aria-valuemax={() => maximumWidth(section)}
      aria-valuenow={() => sectionWidth(section)}
      title={`Drag to resize; double-click or Home to fit ${LABELS[section]}`}
      css={`
        position: absolute;
        right: -4px;
        top: 0;
        bottom: 0;
        width: 8px;
        cursor: col-resize;
        touch-action: none;
        z-index: 2;
        ${focusVisible}
        &::after {
          content: '';
          position: absolute;
          left: 3.5px;
          top: 6px;
          bottom: 6px;
          width: 1px;
          background: ${tokens.border2};
        }
        &:hover::after {
          background: ${tokens.accent};
        }
      `}
      on:keydown={(event: KeyboardEvent) => {
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.altKey ||
          event.shiftKey ||
          event.isComposing
        )
          return
        if (event.key === 'Home') {
          event.preventDefault()
          event.stopPropagation()
          fitSection(section)
          return
        }
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
        event.preventDefault()
        event.stopPropagation()
        resizeDisplayed(
          section,
          sectionWidth(section) + (event.key === 'ArrowRight' ? 16 : -16),
        )
      }}
      on:pointerdown={(event: PointerEvent) => {
        if (event.button !== 0) return
        const element = event.currentTarget as HTMLElement
        cancelDrag()
        element.setPointerCapture(event.pointerId)
        drag = {
          element,
          section,
          pointerId: event.pointerId,
          x: event.clientX,
          width: sectionWidth(section),
        }
        event.preventDefault()
      }}
      on:pointermove={(event: PointerEvent) => {
        if (
          drag?.element === event.currentTarget &&
          drag.pointerId === event.pointerId
        )
          resizeDisplayed(drag.section, drag.width + event.clientX - drag.x)
      }}
      on:pointerup={cancelDrag}
      on:pointercancel={cancelDrag}
      on:dblclick={() => {
        cancelDrag()
        fitSection(section)
      }}
      on:lostpointercapture={() => {
        drag = null
      }}
      ref={() => cancelDrag}
    />
  )
  const rowElements = model.virtual.reatomMap((row) => {
    const rank = () => {
      const window = model.virtual()
      return window.offset + window.items.indexOf(row)
    }
    const selected = () => model.selectedRow() === row
    const railSlice = computed(() => {
      const layout = model.buses(),
        position = layout.ranks.get(row.key) ?? 0
      return {
        layout,
        position,
        routes: crossingBuses(layout, position),
        branches: layout.branchesByEvent.get(row.key) ?? [],
        overflow: crossingBusSummary(layout, position),
      }
    }, `_Admin.causal.ui.${id}.${row.key}.rails`)
    const describe = () => {
      const graph = model.graph()
      const incoming = graph.parents.get(row.key) ?? []
      const details = [
        recordRowDescription(row.record(), { mountIds: mountIds() }),
        row.synthetic() ? 'In progress' : '',
        `${incoming.length} causes`,
      ]
      if (graph.cyclic.has(row.key)) details.push('Cyclic dependency')
      if (
        incoming.some(
          (key) => graph.events.get(key)!.record.start > row.record().start,
        )
      )
        details.push('Clock skew: effect timestamp precedes its cause')
      details.push(
        ...((model.sections.graph()
          ? model.buses().boundaries
          : graph.boundaries
        ).get(row.key) ?? []),
      )
      if (model.sections.graph()) {
        const summary = railSlice().overflow
        if (summary.routes)
          details.push(
            `${summary.relations} crossing relationships in ${summary.routes} summarized groups`,
          )
      }
      return details.filter(Boolean).join('. ')
    }
    return (
      <div
        role="row"
        tabindex={0}
        aria-label={() => recordLabel(row.record())}
        aria-selected={selected}
        aria-description={describe}
        aria-rowindex={() => rank() + 2}
        data-causal-row={row.key}
        data-record-id={() => row.record().id}
        data-causal-related={() =>
          highlight().neighbors.has(row.key) ? 'true' : undefined
        }
        style:height={() => `${model.rowHeight()}px`}
        style:grid-template-columns={tracks}
        style:background={() =>
          selected()
            ? tokens.surface3
            : highlight().neighbors.has(row.key)
              ? `color-mix(in oklch, ${tokens.accent} 8%, transparent)`
              : admin.filter().mode === 'highlight' &&
                  admin.highlightedIds().has(row.record().id)
                ? tokens.surface3
                : ''
        }
        css={`
          display: grid;
          box-sizing: border-box;
          border-bottom: 1px solid ${tokens.border1};
          cursor: pointer;
          ${focusVisible} &:hover {
            background: ${tokens.surface2};
          }
        `}
        on:click={() => {
          model.select(row)
          admin.cardOpen.setTrue()
        }}
        on:dblclick={() => {
          model.select(row)
          admin.cardOpen.setTrue()
        }}
        on:keydown={(event: KeyboardEvent) => {
          if (event.key === ' ' && event.target === event.currentTarget) {
            event.preventDefault()
            model.select(row)
          }
        }}
      >
        <div
          role="gridcell"
          style:grid-column="1"
          style:display={() => (model.sections.graph() ? '' : 'none')}
          title={describe}
          css={`
            position: relative;
            min-width: 0;
            overflow: hidden;
            border-right: 1px solid ${tokens.border1};
          `}
        >
          {() => {
            if (!model.sections.graph()) return null
            const { layout, position, routes, branches } = railSlice()
            const chosen = highlight(),
              height = model.rowHeight(),
              middle = height / 2
            const rowBackground = selected()
              ? tokens.surface3
              : chosen.neighbors.has(row.key)
                ? `color-mix(in oklch, ${tokens.accent} 8%, ${tokens.canvas})`
                : tokens.canvas
            const trace = layout.edgeByKey.get(model.tracedEdgeKey() ?? '')
            const traceStart = trace ? layout.ranks.get(trace.from) : undefined
            const traceEnd = trace ? layout.ranks.get(trace.to) : undefined
            const traceHere =
              traceStart !== undefined &&
              traceEnd !== undefined &&
              position >= Math.min(traceStart, traceEnd) &&
              position <= Math.max(traceStart, traceEnd)
            const branchPath = (edge: CausalEdge, x: number) => {
              const other = layout.ranks.get(
                edge.from === row.key ? edge.to : edge.from,
              )!
              const boundary = other < position ? 0 : height
              return edge.from === row.key
                ? `M 0 ${middle} H ${x} V ${boundary}`
                : `M ${x} ${boundary} V ${middle} H 0`
            }
            const sortedBranches = [...branches].sort(
              (a, b) => b.route.lane! - a.route.lane!,
            )
            const branchActive = (route: CausalBusRoute) =>
              chosen.routes.get(route.key)?.branches.has(row.key) ?? false
            return (
              <svg:svg
                aria-hidden="true"
                style:width="100%"
                height={height}
                css="display: block; overflow: hidden;"
              >
                <svg:g
                  transform={() =>
                    `translate(${sectionWidth('graph') - 12} 0) scale(-1 1)`
                  }
                >
                  {routes.map((route) => {
                    const x = 24 + route.lane! * 18
                    const active = chosen.routes.get(route.key)
                    const emphasized =
                      active &&
                      position >= active.start &&
                      position <= active.end
                    const top = position === route.start ? middle : 0
                    const bottom = position === route.end ? middle : height
                    return (
                      <>
                        <svg:path
                          data-causal-bus={route.key}
                          data-bus-relations={route.edges.length}
                          data-bus-direction={route.direction}
                          data-hidden-count={route.hiddenIds.length}
                          d={`M ${x} ${top} V ${bottom}`}
                          fill="none"
                          stroke={route.cyclic ? tokens.error : tokens.text3}
                          stroke-width={1}
                          stroke-dasharray={route.hidden ? '4 3' : undefined}
                          opacity={0.7}
                        />
                        {emphasized ? (
                          <svg:path
                            data-causal-highlight={route.key}
                            d={`M ${x} ${position === active.start ? middle : top} V ${position === active.end ? middle : bottom}`}
                            fill="none"
                            stroke={route.cyclic ? tokens.error : tokens.accent}
                            stroke-width={2}
                            stroke-dasharray={route.hidden ? '4 3' : undefined}
                          />
                        ) : null}
                      </>
                    )
                  })}
                  {sortedBranches.map(({ route, count, hiddenCount }) => {
                    const x = 24 + route.lane! * 18
                    return (
                      <>
                        {route.lane! > 0 ? (
                          <svg:path
                            data-causal-crossover={route.key}
                            d={`M 0 ${middle} H ${x}`}
                            fill="none"
                            stroke={rowBackground}
                            stroke-width={5}
                          />
                        ) : null}
                        <svg:path
                          data-causal-edge={route.key}
                          data-branch-relations={count}
                          data-hidden-count={hiddenCount}
                          d={`M 0 ${middle} H ${24 + route.lane! * 18}`}
                          fill="none"
                          stroke={route.cyclic ? tokens.error : tokens.text3}
                          stroke-width={1}
                          stroke-dasharray={route.hidden ? '4 3' : undefined}
                          opacity={0.8}
                        />
                      </>
                    )
                  })}
                  {sortedBranches
                    .filter(({ route }) => branchActive(route))
                    .map(({ route }) => (
                      <svg:path
                        data-causal-highlight-branch={route.key}
                        d={`M 0 ${middle} H ${24 + route.lane! * 18}`}
                        fill="none"
                        stroke={route.cyclic ? tokens.error : tokens.accent}
                        stroke-width={2}
                        stroke-dasharray={route.hidden ? '4 3' : undefined}
                      />
                    ))}
                  {traceHere && trace ? (
                    <>
                      <svg:path
                        data-causal-trace-halo={trace.key}
                        d={
                          trace.from === row.key || trace.to === row.key
                            ? branchPath(trace, 12)
                            : `M 12 0 V ${height}`
                        }
                        fill="none"
                        stroke={rowBackground}
                        stroke-width={6}
                      />
                      <svg:path
                        data-causal-trace={trace.key}
                        d={
                          trace.from === row.key || trace.to === row.key
                            ? branchPath(trace, 12)
                            : `M 12 0 V ${height}`
                        }
                        fill="none"
                        stroke={tokens.accent}
                        stroke-width={2.5}
                        stroke-dasharray={
                          trace.hidden.length ? '4 3' : undefined
                        }
                      />
                    </>
                  ) : null}
                  {sortedBranches.map(({ route }) => (
                    <svg:circle
                      data-causal-tap={route.key}
                      cx={24 + route.lane! * 18}
                      cy={middle}
                      r={1.8}
                      fill={
                        route.cyclic
                          ? tokens.error
                          : branchActive(route)
                            ? tokens.accent
                            : tokens.text3
                      }
                    />
                  ))}
                </svg:g>
                <svg:circle
                  data-causal-node=""
                  cx={() => sectionWidth('graph') - 12}
                  cy={middle}
                  r={chosen.chosen === row.key ? 4.5 : 3.5}
                  fill={
                    chosen.chosen === row.key || chosen.neighbors.has(row.key)
                      ? tokens.accent
                      : tokens.text3
                  }
                />
              </svg:svg>
            )
          }}
          <span
            css={`
              ${type.meta} position: absolute;
              left: 4px;
              top: 0;
              pointer-events: none;
              background: ${tokens.surface1};
            `}
          >
            {() => {
              if (!model.sections.graph()) return ''
              const { layout } = railSlice()
              const incoming = layout.incoming.get(row.key) ?? []
              const hidden = new Set(incoming.flatMap((edge) => edge.hidden))
                .size
              const boundary = layout.boundaries.get(row.key)?.length
              return `${hidden ? `+${hidden} hidden` : ''}${boundary ? ' ?' : ''}${model.graph().cyclic.has(row.key) ? ' ↻' : ''}`
            }}
          </span>
        </div>
        <div
          role="gridcell"
          data-causal-record=""
          style:grid-column="2"
          style:display={() => (model.sections.logs() ? 'flex' : 'none')}
          css={`
            ${type.data} ${truncate} align-items: center;
            gap: 8px;
            min-width: 0;
            padding: 0 8px;
            border-right: 1px solid ${tokens.border1};
          `}
        >
          {() => <KindMark kind={recordKindIcon(row.record(), mountIds())} />}
          <EqualStateWarning admin={admin} record={row.record} />
          <span
            title={() => recordLabel(row.record())}
            css={`
              ${truncate} flex: 1;
              min-width: 0;
              direction: rtl;
              text-align: left;
            `}
          >
            {() => recordLabel(row.record())}
          </span>
          <span css="display: flex; gap: 2px; margin-left: auto; flex: none;">
            {() => {
              const relations = model.rawRelations()
              const portal = model.sections.graph()
                ? model.buses().portals.get(row.key)
                : undefined
              return (['causes', 'effects'] as const).map((direction) => {
                const incoming = direction === 'causes'
                const count =
                  (incoming ? relations.incoming : relations.outgoing).get(
                    row.key,
                  )?.length ?? 0
                const summarized = incoming
                  ? portal?.incoming
                  : portal?.outgoing
                if (!count || (count < 2 && !selected() && !summarized))
                  return null
                return (
                  <button
                    type="button"
                    aria-label={`${count} recorded ${direction} of ${recordLabel(row.record())}`}
                    title={`${count} recorded ${direction}${summarized ? '; includes summarized relationships' : ''}`}
                    css={`
                      ${type.meta} ${focusVisible} border: 1px solid ${tokens.border1};
                      border-radius: 3px;
                      padding: 0 4px;
                      height: 20px;
                      background: ${tokens.surface2};
                      color: ${tokens.text2};
                      cursor: pointer;
                    `}
                    on:click={(event: MouseEvent) => {
                      event.stopPropagation()
                      inspectRelations(row, direction)
                    }}
                  >
                    {incoming ? '↑' : '↓'}
                    {count}
                  </button>
                )
              })
            }}
          </span>
          <span
            css={`
              ${type.meta} color: ${tokens.error};
            `}
          >
            {() => (row.record().error ? 'error' : '')}
          </span>
        </div>
        <div
          role="gridcell"
          style:grid-column="3"
          style:display={() => (model.sections.time() ? '' : 'none')}
          title={() =>
            `${row.record().start}ms${row.record().end === undefined ? '' : ` – ${row.record().end}ms`}. ${describe()}`
          }
          css={`
            position: relative;
            min-width: 0;
            overflow: hidden;
          `}
        >
          <div
            data-causal-bar={row.key}
            style:left={() => `${(model.bar(row)?.left ?? 0) * 100}%`}
            style:width={() => `${(model.bar(row)?.width ?? 0) * 100}%`}
            style:background={() =>
              row.record().error ? tokens.error : tokens.accent
            }
            style:top={() => `${model.rowHeight() / 2 - 5}px`}
            css="position: absolute; height: 10px; min-width: 2px; border-radius: 2px;"
          />
          <span
            css={`
              ${type.meta} position: absolute;
              right: 5px;
              top: 2px;
              pointer-events: none;
            `}
          >
            {() =>
              row.synthetic()
                ? 'In progress'
                : row.record().end === undefined
                  ? ''
                  : formatAxisOffset(
                      Math.max(0, row.record().end! - row.record().start),
                    )
            }
          </span>
        </div>
      </div>
    )
  }, `_Admin.causal.ui.${id}.rows`)
  return (
    <section
      aria-label="Causal timeline"
      css="display: flex; flex-direction: column; height: 100%; min-height: 0; min-width: 0;"
    >
      <div
        css={`
          ${scrollable} overflow-y: hidden;
          flex: none;
        `}
      >
        <div css="width: max-content; min-width: 100%;">
          <Toolbar>
            <ToolbarGroup>
              <Button
                label="Causal"
                variant="ghost"
                pressed={true}
                onClick={() => {}}
              >
                Causal
              </Button>
              <Button
                label="Waterfall"
                onClick={() => {
                  admin.causalEnabled.setFalse()
                  admin.gantt.mode.set('waterfall')
                }}
              >
                Waterfall
              </Button>
              <Button
                label="Log"
                onClick={() => {
                  admin.causalEnabled.setFalse()
                  admin.gantt.mode.set('log')
                }}
              >
                Log
              </Button>
              <Button label="Paths" onClick={() => admin.openPaths()}>
                Paths
              </Button>
            </ToolbarGroup>
            <ToolbarSeparator />
            <ToolbarGroup>
              <>
                {SECTIONS.map((key) => (
                  <span
                    ref={(element) => {
                      const button = element.querySelector('button')
                      if (button) toggleRefs.set(key, button)
                    }}
                  >
                    <Button
                      label={`${LABELS[key]} section`}
                      variant="ghost"
                      pressed={model.sections[key]}
                      disabled={() => only(key)}
                      title={() =>
                        only(key)
                          ? 'Keep at least one section visible'
                          : `Show or hide ${LABELS[key]}`
                      }
                      onClick={() => {
                        if (drag?.section === key) cancelDrag()
                        const focused = scroller?.getRootNode() as
                          ShadowRoot | Document | undefined
                        if (
                          focused?.activeElement &&
                          scroller?.contains(focused.activeElement)
                        )
                          toggleRefs.get(key)?.focus()
                        model.toggleSection(key)
                      }}
                    >
                      {LABELS[key]}
                    </Button>
                  </span>
                ))}
              </>
              <Button
                label="Expand graph column"
                disabled={() =>
                  !model.sections.graph() || model.widths.graph() >= 116
                }
                title="Restore room for four readable tracks"
                onClick={() => resizeSection('graph', 116)}
              >
                Widen graph
              </Button>
            </ToolbarGroup>
            <ToolbarSeparator />
            <ToolbarGroup>
              <Button
                label="Fit time"
                onClick={() => model.timeWindow.set(null)}
              >
                Fit
              </Button>
              <Button
                label="Zoom in"
                disabled={() => !model.visibleTime()}
                onClick={() => model.zoom(1.5)}
              >
                +
              </Button>
              <Button
                label="Zoom out"
                disabled={() => !model.visibleTime()}
                onClick={() => model.zoom(1 / 1.5)}
              >
                −
              </Button>
              <Button
                label="Pan earlier"
                disabled={() => !model.visibleTime()}
                onClick={() => {
                  const time = model.visibleTime()!
                  model.pan(-(time.end - time.start) / 4)
                }}
              >
                ←
              </Button>
              <Button
                label="Pan later"
                disabled={() => !model.visibleTime()}
                onClick={() => {
                  const time = model.visibleTime()!
                  model.pan((time.end - time.start) / 4)
                }}
              >
                →
              </Button>
              <Button
                label="Follow live"
                variant="ghost"
                pressed={admin.followLive}
                onClick={() => admin.followLive.toggle()}
              >
                {() =>
                  model.unseen() ? `${model.unseen()} new · Follow` : 'Follow'
                }
              </Button>
            </ToolbarGroup>
          </Toolbar>
        </div>
      </div>
      <CausalContinuations admin={admin} />
      {() =>
        model.hiddenSelection() ? (
          <div
            role="status"
            css={`
              ${type.meta} padding: 4px 8px;
            `}
          >
            Selected record is hidden by the current filters.{' '}
            <Button
              label="Reveal selected record"
              onClick={() => {
                admin.resetFilter()
                admin.showMountLogs.setTrue()
                admin.showAbortAndSuspense.setTrue()
              }}
            >
              Reveal
            </Button>
          </div>
        ) : null
      }
      <div css="height: 32px; flex: none; overflow: hidden;">
        <div
          role="row"
          style:grid-template-columns={tracks}
          style:width={() => `${width()}px`}
          style:transform={() => `translateX(-${horizontal()}px)`}
          css={`
            display: grid;
            height: 32px;
            background: ${tokens.surface1};
            border-bottom: 1px solid ${tokens.border2};
          `}
        >
          {SECTIONS.map((key) => (
            <div
              role="columnheader"
              style:grid-column={SECTIONS.indexOf(key) + 1}
              style:display={() => (model.sections[key]() ? '' : 'none')}
              css={`
                ${type.meta} position: relative;
                min-width: 0;
                padding: 7px 8px;
                box-sizing: border-box;
                box-shadow: inset -1px 0 ${tokens.border1};
              `}
            >
              <span
                css={`
                  ${truncate} display: block;
                  height: 18px;
                `}
              >
                {key === 'graph' ? (
                  () =>
                    model.sections.graph()
                      ? `Graph · ${model.buses().laneCount} ${model.buses().laneCount === 1 ? 'track' : 'tracks'}`
                      : 'Graph'
                ) : key === 'logs' ? (
                  'Records'
                ) : (
                  <span
                    aria-label="Measured time"
                    css="display: block; position: relative; height: 16px;"
                  >
                    {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
                      <span
                        style:left={`${fraction * 100}%`}
                        style:transform={
                          fraction === 1
                            ? 'translateX(-100%)'
                            : fraction === 0
                              ? ''
                              : 'translateX(-50%)'
                        }
                        css="position: absolute; white-space: nowrap;"
                      >
                        {() => {
                          const time = model.visibleTime()
                          return time
                            ? formatAxisOffset(
                                (time.end - time.start) * fraction,
                              )
                            : '—'
                        }}
                      </span>
                    ))}
                  </span>
                )}
              </span>
              {resize(key)}
            </div>
          ))}
        </div>
      </div>
      <div
        role="grid"
        aria-label="Causal records"
        aria-rowcount={() => model.visible().size + 1}
        data-testid="causal-scroller"
        css={`
          ${scrollable} flex: 1;
          min-height: 0;
          overflow-anchor: none;
        `}
        on:scroll={(event: Event) =>
          horizontal.set((event.currentTarget as HTMLElement).scrollLeft)
        }
        ref={(element) => {
          scroller = element
          const syncWidth = wrap(() => viewportWidth.set(element.clientWidth))
          syncWidth()
          const observer = new ResizeObserver(syncWidth)
          observer.observe(element)
          const stop = model.virtual.bindScroller(element)
          return () => {
            observer.disconnect()
            cancelDrag()
            scroller = null
            stop()
          }
        }}
      >
        <div style:width={() => `${width()}px`} css="min-width: 100%;">
          <div
            aria-hidden="true"
            style:height={() => `${model.virtual.padding().before}px`}
          />
          <div
            css="position: sticky;"
            style:top={() => `${model.virtual.stickyInset()}px`}
            style:bottom={() => `${model.virtual.stickyInset()}px`}
          >
            {rowElements}
          </div>
          <div
            aria-hidden="true"
            style:height={() => `${model.virtual.padding().after}px`}
          />
        </div>
        {() =>
          model.visible().size ? null : (
            <EmptyState
              title={
                admin.store.recordList().size
                  ? 'No matching records'
                  : 'No records yet'
              }
              description={
                admin.store.recordList().size
                  ? 'Reset filters to show captured records.'
                  : 'Check OpenTelemetry setup, consent, and capture filters.'
              }
              action={
                admin.store.recordList().size ? (
                  <Button
                    label="Reset filters"
                    onClick={() => admin.resetFilter()}
                  >
                    Reset
                  </Button>
                ) : (
                  <a href="https://v1001.reatom.dev">OpenTelemetry setup</a>
                )
              }
            />
          )
        }
      </div>
    </section>
  )
}
