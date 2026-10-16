import {
  addChangeHook,
  atom,
  effect,
  sleep,
  wrap,
  type Atom,
} from '@reatom/core'
import { mount } from '@reatom/jsx'

import type { AdminConnection, OtlpAdmin, OtlpAdminOptions } from '../../otlp'
import { ADMIN_CLEAR_UNDO_MS, reatomOtlpAdmin } from '../../otlp'
import { ADMIN_FRAME } from '../../root'
import {
  Button,
  DebuggerWorkspace,
  Drawer,
  Kbd,
  Popover,
  StatusBar,
  StatusDot,
  Tabs,
  Toast,
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
  ToolbarSpacer,
  focusVisible,
  scrollable,
  size,
  tokens,
  truncate,
  type,
} from '../design-system'
import { adminThemeVars } from '../design-system/tokens'
import { ADMIN_HOST_Z_INDEX, keepAdminHostInView } from '../hostBox'
import { bindAdminStylesheet } from '../stylesheet'
import { importRecordFile } from '../../otlp/importRecords'
import { adminSettings, bindAdminPalette } from '../settings'
import { OtlpAnalyticsScreen, analystStatusWords } from './AnalyticsScreen'
import { closeFrameCard, OtlpFrameCard } from './FrameCard'
import { OtlpFilterBar } from './FilterBar'
import { floatAdminHost, type FloatingWindowOptions } from './FloatingWindow'
import { OtlpGanttChart, pathRowAdapter, recordRowAdapter } from './GanttChart'
import { PathStepCard } from './PathStepCard'
import { OtlpRemotePanel } from './RemotePanel'
import { OtlpGraphView, OtlpStateView } from './SecondaryViews'
import { handleAdminShellKey, isEditableTarget } from './shellKeys'
import { SettingsScreen } from './SettingsScreen'

export interface OtlpAppProps {
  admin: OtlpAdmin
  connection?: AdminConnection | null
  /** Shared with the floating window so Minimize also shrinks the host. */
  minimized?: Atom<boolean>
  /** Shared with the floating window so Close shrinks the host to an icon. */
  closed?: Atom<boolean>
  /**
   * The host is already docked, so the closed icon fills it instead of using
   * `position: fixed`.
   */
  floating?: boolean
}

export interface AdminViewOptions {
  /**
   * Float the host over the page as a resizable window instead of filling the
   * box the page gives it. Minimize collapses it to a status strip. Close
   * leaves an icon in the corner chosen in Settings.
   */
  floating?: boolean | FloatingWindowOptions
}

let shellCounter = 0

const VIEWS = [
  { id: 'timeline' as const, label: 'Timeline' },
  { id: 'state' as const, label: 'State' },
  { id: 'graph' as const, label: 'Graph' },
  { id: 'analytics' as const, label: 'Analytics' },
  { id: 'settings' as const, label: 'Settings' },
]

function statusWords(
  admin: OtlpAdmin,
  connection: AdminConnection | null,
): string {
  if (admin.source() === 'remote') return 'ClickHouse'
  if (admin.source() === 'replay') return 'Replay'
  const paused = connection ? connection.paused() : admin.paused()
  if (!paused) return 'Capturing'
  const waiting = connection?.waiting() ?? 0
  return waiting > 0 ? `Paused, ${waiting} waiting` : 'Paused'
}

function serviceLabel(admin: OtlpAdmin): string {
  const name = admin.records()[0]?.resource['service.name']
  if (typeof name === 'string' && name !== '') return name
  if (admin.source() === 'remote') return 'ClickHouse'
  if (admin.source() === 'replay') return 'Replay'
  return 'Live'
}

export const OtlpApp = ({
  admin,
  connection = null,
  minimized: sharedMinimized,
  closed: sharedClosed,
  floating = false,
}: OtlpAppProps) => {
  const shellId = ++shellCounter
  const settings = adminSettings()
  const helpOpen = atom(false, `_Admin.shell.help.${shellId}`)
  const frameCardOpen = atom(false, `_Admin.shell.frameCard.${shellId}`)
  effect(() => {
    frameCardOpen.set(admin.view() !== 'settings' && admin.cardOpen())
  }, `_Admin.shell.frameCard.sync.${shellId}`)
  const undoOpen = atom(false, `_Admin.shell.undoOpen.${shellId}`)
  const undoGeneration = atom(0, `_Admin.shell.undoGeneration.${shellId}`)
  const minimized =
    sharedMinimized ?? atom(false, `_Admin.shell.minimized.${shellId}`)
  const closed = sharedClosed ?? atom(false, `_Admin.shell.closed.${shellId}`)
  const launcherEdge = (side: 'top' | 'right' | 'bottom' | 'left') => () => {
    if (floating) return '0px'
    const corner = settings.corner()
    const placed =
      (side === 'top' && corner.startsWith('top')) ||
      (side === 'bottom' && corner.startsWith('bottom')) ||
      (side === 'left' && corner.endsWith('left')) ||
      (side === 'right' && corner.endsWith('right'))
    return placed ? '16px' : 'auto'
  }
  const openPanel = () => {
    minimized.set(false)
    closed.set(false)
  }
  let localSnapshot: ReturnType<OtlpAdmin['records']> | null = null

  effect(async () => {
    if (admin.inProgress().length === 0) return
    while (admin.inProgress().length > 0) {
      admin.ganttNow.set(Date.now())
      await wrap(sleep(200))
    }
  }, `_Admin.shell.tickNow.${shellId}`)

  const clearWorkspace = () => {
    undoGeneration.set(undoGeneration() + 1)
    if (connection) connection.clear()
    else {
      localSnapshot = admin.records().slice()
      admin.clear()
    }
    undoOpen.set(true)
  }

  const restoreWorkspace = () => {
    if (connection) connection.undo()
    else if (localSnapshot) admin.restoreRecords(localSnapshot)
    localSnapshot = null
  }

  const togglePause = () => {
    if (connection) {
      if (connection.paused()) connection.resume()
      else connection.pause()
      return
    }
    if (admin.paused()) admin.paused.setFalse()
    else admin.paused.setTrue()
  }

  const header = (
    <header>
      <Toolbar height={size.tabs}>
        <ToolbarGroup>
          <span
            css={`
              ${type.ui}
              color: ${tokens.text1};
              white-space: nowrap;
              flex: none;
            `}
          >
            Reatom Admin
          </span>
          <span
            css={`
              ${type.meta}
              flex: none;
              white-space: nowrap;
            `}
          >
            <StatusDot
              tone={() =>
                statusWords(admin, connection) === 'Capturing'
                  ? 'success'
                  : 'warning'
              }
              label={() => statusWords(admin, connection)}
            />
          </span>
          <span
            css={`
              ${type.meta}
              ${truncate}
              min-width: 0;
              color: ${tokens.text2};
            `}
          >
            {() => serviceLabel(admin)}
          </span>
          <span
            data-testid="summary-metrics"
            css={`
              ${type.meta}
              ${truncate}
              min-width: 0;
              color: ${tokens.text2};
              font-variant-numeric: tabular-nums;
            `}
          >
            {() => `${admin.summary().totalFrames.toLocaleString()} records`}
          </span>
        </ToolbarGroup>
        <ToolbarSpacer />
        <div
          css={`
            flex: none;
            display: flex;
          `}
        >
          <Tabs value={admin.view} items={VIEWS} ariaLabel="Views" />
        </div>
      </Toolbar>
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
                label="Back"
                title="Back (Alt+Left)"
                disabled={() => !admin.canSelectionBack()}
                onClick={() => admin.selectionBack()}
              >
                Back
              </Button>
              <Button
                label="Forward"
                title="Forward (Alt+Right)"
                disabled={() => !admin.canSelectionForward()}
                onClick={() => admin.selectionForward()}
              >
                Forward
              </Button>
              <span>
                {() =>
                  (connection ? connection.paused() : admin.paused()) ? (
                    <Button label="Resume" onClick={togglePause}>
                      Resume
                    </Button>
                  ) : (
                    <Button label="Pause" onClick={togglePause}>
                      Pause
                    </Button>
                  )
                }
              </span>
            </ToolbarGroup>
            <ToolbarSeparator />
            <ToolbarGroup>
              <Button variant="danger" label="Clear" onClick={clearWorkspace}>
                Clear
              </Button>
              <Button
                label="Export"
                onClick={() => downloadRecords(admin.records())}
              >
                Export
              </Button>
              <ImportRecords admin={admin} />
              <Button
                label="Remote ClickHouse source"
                testId="otlp-remote-toggle"
                pressed={() => admin.remoteOpen()}
                onClick={() => admin.remoteOpen.toggle()}
              >
                ClickHouse
              </Button>
            </ToolbarGroup>
            <ToolbarSpacer />
            <ToolbarGroup>
              <Button
                label="Help"
                title="Help (?)"
                onClick={() => helpOpen.set(true)}
              >
                Help
              </Button>
              <Button
                label="Close"
                onClick={() => {
                  minimized.set(false)
                  closed.set(true)
                }}
              >
                Close
              </Button>
              <Button label="Minimize" onClick={() => minimized.set(true)}>
                Minimize
              </Button>
            </ToolbarGroup>
          </Toolbar>
        </div>
      </div>
    </header>
  )

  const filters = (
    <div>
      {() =>
        admin.view() === 'settings' ? null : (
          <div>
            {() =>
              admin.remoteOpen() ? <OtlpRemotePanel admin={admin} /> : null
            }
            <OtlpFilterBar admin={admin} />
          </div>
        )
      }
    </div>
  )

  const main = (
    <div
      css={`
        height: 100%;
        min-height: 0;
        min-width: 0;
      `}
    >
      {() => {
        const view = admin.view()
        if (view === 'settings') return <SettingsScreen />
        if (view === 'state') return <OtlpStateView admin={admin} />
        if (view === 'graph') return <OtlpGraphView admin={admin} />
        if (view === 'analytics') return <OtlpAnalyticsScreen admin={admin} />
        if (admin.timelineUnit() === 'paths') {
          return (
            <OtlpGanttChart
              gantt={admin.analytics.paths}
              admin={admin}
              adapter={pathRowAdapter(admin)}
              onInspect={() => admin.cardOpen.setTrue()}
            />
          )
        }
        return (
          <OtlpGanttChart
            gantt={admin.gantt}
            admin={admin}
            adapter={recordRowAdapter(admin, admin.ganttSelection)}
            onInspect={() => admin.cardOpen.setTrue()}
          />
        )
      }}
    </div>
  )

  const status = (
    <StatusBar>
      <span role="status">{() => statusWords(admin, connection)}</span>
      <span>
        {() => {
          const analyst =
            admin.view() === 'analytics' ||
            (admin.view() === 'timeline' && admin.timelineUnit() === 'paths')
          if (analyst) return analystStatusWords(admin)
          const summary = admin.summary()
          return `${summary.visibleFrames} of ${summary.totalFrames}`
        }}
      </span>
      <span>
        {() => {
          const hidden =
            admin.hiddenAbortSuspenseCount() + admin.hiddenMountLogCount()
          return hidden > 0 ? <span>{`${hidden} hidden`}</span> : null
        }}
      </span>
      <span>
        {() => {
          const stats = connection?.stats()
          if (!stats) return null
          return `queued ${stats.queued} · in flight ${stats.inFlight} · exported ${stats.exported} · dropped ${stats.dropped}`
        }}
      </span>
      <span>
        {() =>
          connection?.stats()?.transportQuarantined
            ? 'Transport quarantined'
            : null
        }
      </span>
      <span>
        {() =>
          connection?.olderRecordsDropped() ? 'Older records dropped' : null
        }
      </span>
      <Popover triggerLabel="Drop reasons" label="Dropped by reason">
        <span>
          {() => {
            const reasons = connection?.stats()?.droppedByReason ?? {}
            const entries = Object.entries(reasons)
            if (entries.length === 0) return 'No dropped records'
            return entries
              .map(([reason, count]) => `${reason}: ${count}`)
              .join(', ')
          }}
        </span>
      </Popover>
    </StatusBar>
  )

  return (
    <div
      data-reatom-name="AppShell"
      data-testid="admin-visual-snapshot"
      data-admin-icons={() => String(settings.icons())}
      data-admin-colors={() => String(settings.colors())}
      data-admin-scheme={() => settings.resolvedScheme()}
      data-admin-corner={() => settings.corner()}
      data-closed={() => (closed() ? 'true' : 'false')}
      tabindex={0}
      css={`
        ${adminThemeVars}
        position: relative;
        height: 100%;
        min-height: 0;
        overflow: hidden;
        background: ${tokens.canvas};
        color: ${tokens.text1};
        font-family: ${tokens.fontUi};
        outline: none;
        &:has([data-reatom-name='SettingsScreen']) [aria-label='Filters'] {
          display: none;
        }
        &[data-closed='true'] {
          background: transparent;
          pointer-events: none;
          overflow: visible;
        }
      `}
      ref={(shell) => {
        const onCapture = wrap((event: Event) => {
          if (!(event instanceof KeyboardEvent)) return
          if (event.key !== 'Escape' || isEditableTarget(event.target)) return
          if (!helpOpen()) return
          event.preventDefault()
          event.stopPropagation()
          helpOpen.set(false)
        })
        const onBubble = wrap((event: Event) => {
          if (!(event instanceof KeyboardEvent)) return
          handleAdminShellKey(shell, event, admin, helpOpen)
        })
        shell.addEventListener('keydown', onCapture, true)
        shell.addEventListener('keydown', onBubble)
        connection?.refreshStats()
        const unbindPalette = bindAdminPalette(shell)
        return () => {
          unbindPalette()
          shell.removeEventListener('keydown', onCapture, true)
          shell.removeEventListener('keydown', onBubble)
        }
      }}
    >
      {() =>
        closed() ? (
          <button
            type="button"
            aria-label="Open Reatom Admin"
            css:openPosition={() => (floating ? 'absolute' : 'fixed')}
            css:openTop={launcherEdge('top')}
            css:openRight={launcherEdge('right')}
            css:openBottom={launcherEdge('bottom')}
            css:openLeft={launcherEdge('left')}
            css:openWidth={() => (floating ? '100%' : '44px')}
            css:openHeight={() => (floating ? '100%' : '44px')}
            css={`
              all: unset;
              box-sizing: border-box;
              position: var(--openPosition);
              top: var(--openTop);
              right: var(--openRight);
              bottom: var(--openBottom);
              left: var(--openLeft);
              z-index: ${ADMIN_HOST_Z_INDEX};
              width: var(--openWidth);
              height: var(--openHeight);
              display: inline-flex;
              align-items: center;
              justify-content: center;
              border-radius: 999px;
              border: 1px solid ${tokens.border2};
              background: ${tokens.surface2};
              color: ${tokens.accent};
              font-family: ${tokens.fontUi};
              font-size: 1rem;
              font-weight: 750;
              cursor: pointer;
              pointer-events: auto;
              box-shadow: 0 12px 28px -16px oklch(0 0 0 / 0.7);
              ${focusVisible}
            `}
            on:click={openPanel}
          >
            R
          </button>
        ) : minimized() ? (
          <Toolbar>
            <ToolbarGroup>
              <span role="status">{() => statusWords(admin, connection)}</span>
            </ToolbarGroup>
            <ToolbarSpacer />
            <Button label="Show admin" onClick={() => minimized.set(false)}>
              Show
            </Button>
          </Toolbar>
        ) : null
      }
      <div
        prop:hidden={() => minimized() || closed()}
        css={`
          height: 100%;
          min-height: 0;
        `}
      >
        <DebuggerWorkspace
          header={header}
          filter={filters}
          main={main}
          inspector={() => <OtlpInspectorBody admin={admin} />}
          inspectorLabel={() =>
            admin.view() === 'timeline' && admin.timelineUnit() === 'paths'
              ? 'Step'
              : 'Frame'
          }
          inspectorOpen={frameCardOpen}
          onInspectorClose={() => closeFrameCard(admin)}
          status={status}
        />
      </div>
      {() => {
        undoGeneration()
        if (!undoOpen()) return null
        return (
          <Toast
            open={undoOpen}
            message="Records cleared"
            actionLabel="Undo"
            onAction={restoreWorkspace}
            onDismiss={() => {
              localSnapshot = null
            }}
            durationMs={ADMIN_CLEAR_UNDO_MS}
          />
        )
      }}
      <Drawer open={helpOpen} label="Help" onClose={() => helpOpen.set(false)}>
        <HelpBody />
      </Drawer>
    </div>
  )
}

const OtlpInspectorBody = ({ admin }: { admin: OtlpAdmin }) => (
  <div css="display: contents;">
    {() =>
      admin.view() === 'timeline' && admin.timelineUnit() === 'paths' ? (
        <PathStepCard admin={admin} />
      ) : (
        <OtlpFrameCard admin={admin} />
      )
    }
  </div>
)

const HelpBody = () => (
  <div
    css={`
      display: grid;
      gap: var(--admin-space-8);
      ${type.body}
    `}
  >
    <p css="margin: 0;">Shortcuts</p>
    <p css="margin: 0;">
      <Kbd keys={['J']} /> <Kbd keys={['K']} /> move the selection. Arrow keys
      do the same. Left and Right collapse and expand. Enter opens the frame
      card. Esc closes the top layer. <Kbd keys={['/']} /> focuses name search.{' '}
      <Kbd keys={['?']} /> opens this help. <Kbd keys={['Alt', 'Left']} /> and{' '}
      <Kbd keys={['Alt', 'Right']} /> walk selection history.{' '}
      <Kbd keys={['I']} /> toggles kind icons. <Kbd keys={['C']} /> toggles kind
      colors.
    </p>
    <p css="margin: 0;">
      Filter language: name, kind, errors, duration, spans, trace, attr, cause
      and the direction markers. Example: name:makeMove kind:action.
    </p>
    <p css="margin: 0;">
      Paths and Analytics treat the filter as a session filter (session in when
      any record matches; Exclude flips).
    </p>
  </div>
)

const ImportRecords = ({ admin }: { admin: OtlpAdmin }) => (
  <label
    css={`
      ${type.ui}
      display: inline-flex;
      align-items: center;
      cursor: pointer;
      color: ${tokens.text1};
    `}
  >
    Import
    <input
      aria-label="Import"
      type="file"
      accept="application/json"
      css={`
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
      `}
      on:change={async (event: Event) => {
        const input = event.currentTarget
        if (!(input instanceof HTMLInputElement)) return
        const file = input.files?.[0]
        if (!file) return
        await importRecordFile(admin, file)
      }}
    />
  </label>
)

function downloadRecords(records: readonly unknown[]) {
  const blob = new Blob([JSON.stringify(records, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'admin-records.json'
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Inherited text styles of the host app stop at the shadow host. Inline styles
 * that a story or `keepAdminHostInView` sets on the host still win.
 */
const ADMIN_HOST_RESET = `
  :host {
    all: initial;
    display: block;
  }
  :host([hidden]) {
    display: none;
  }
`

let viewCounter = 0

/**
 * Mounts the Gantt-first admin into `host`'s shadow root and points JSX `css`
 * rules at that shadow sheet. With `floating`, the host becomes a fixed window
 * over the page. Call it inside `ADMIN_FRAME`.
 */
export function mountAdminView(
  host: HTMLElement,
  admin: OtlpAdmin,
  connection: AdminConnection | null,
  options: AdminViewOptions = {},
): () => void {
  host.dataset['adminHost'] = ''
  host.hidden = false
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' })
  shadow.replaceChildren()
  const hostReset = document.createElement('style')
  hostReset.textContent = ADMIN_HOST_RESET
  shadow.append(hostReset)
  const adminSheet = bindAdminStylesheet(shadow)
  const { floating = false } = options
  const floatingOptions = floating === true ? {} : floating || null
  const viewId = ++viewCounter
  const minimized = atom(false, `_Admin.view.minimized.${viewId}`)
  const closed = atom(false, `_Admin.view.closed.${viewId}`)
  const releaseHostBox = floatingOptions
    ? floatAdminHost(host, shadow, minimized, closed, floatingOptions)
    : keepAdminHostInView(host)
  const syncClosedPointer = (value: boolean) => {
    if (floatingOptions) return
    host.style.pointerEvents = value ? 'none' : ''
  }
  syncClosedPointer(closed())
  const removeClosedPointer = addChangeHook(closed, syncClosedPointer)
  const mountHost = document.createElement('div')
  mountHost.style.height = '100%'
  mountHost.style.minHeight = '0'
  shadow.append(mountHost)
  const mountPoint = document.createElement('div')
  mountPoint.style.height = '100%'
  mountPoint.style.minHeight = '0'
  mountHost.append(mountPoint)
  const app = (
    <OtlpApp
      admin={admin}
      connection={connection}
      minimized={minimized}
      closed={closed}
      floating={floatingOptions !== null}
    />
  )
  const mounted = mount(mountPoint, app)
  return () => {
    mounted.unmount()
    removeClosedPointer()
    if (!floatingOptions) host.style.pointerEvents = ''
    releaseHostBox()
    adminSheet.restore()
  }
}

export function createOtlpAdminApp(
  target: Element,
  options: OtlpAdminOptions,
  records: readonly unknown[] = [],
  viewOptions: AdminViewOptions = {},
): { admin: OtlpAdmin; unmount: () => void } {
  const admin = reatomOtlpAdmin(options)
  const host =
    target instanceof HTMLElement ? target : document.createElement('div')
  if (!(target instanceof HTMLElement)) target.append(host)
  return ADMIN_FRAME.run(() => {
    if (records.length > 0) admin.ingest(records)
    const unmount = mountAdminView(host, admin, null, viewOptions)
    return { admin, unmount }
  })
}
