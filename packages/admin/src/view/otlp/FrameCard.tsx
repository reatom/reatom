import { atom, computed, type AtomLike } from '@reatom/core'

import type { OtlpAdmin } from '../../otlp'
import {
  isStateWrite,
  recordHasError,
  recordLabel,
  toRailNode,
} from '../../otlp'
import type { AdminRecord } from '../../otlp'
import {
  Button,
  InspectorTabs,
  RailGraph,
  scrollable,
  tokens,
  type,
} from '../design-system'
import { Inspector, ParamList } from '../inspector'
import { KindMark } from './KindMark'
import { kindColorVar, recordKindIcon } from './recordKind'
import {
  frameValueView,
  overviewDataValue,
  overviewEventAttributes,
  overviewParamsValue,
  recordFieldValue,
  type FrameValueTitle,
} from './frameValues'

function durationLabel(record: AdminRecord): string {
  if (record.end === undefined) return 'open'
  const ms = Math.max(0, record.end - record.start)
  if (ms < 1000) return `${Math.round(ms)}ms`
  const seconds = ms / 1000
  return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)}s`
}

function kindLabel(record: AdminRecord): string {
  if (record.outcome === 'abort') return 'abort'
  if (record.kind === 'log' && record.reatomKind === undefined) return 'LOG'
  return record.reatomKind ?? record.kind
}

function focusSelector(selector: string) {
  const hosts = document.querySelectorAll('[data-admin-host]')
  for (const host of hosts) {
    const row = host.shadowRoot?.querySelector(selector)
    if (row instanceof HTMLElement) {
      row.focus()
      return
    }
  }
  const row = document.querySelector(selector)
  if (row instanceof HTMLElement) row.focus()
}

export function closeFrameCard(admin: OtlpAdmin) {
  const paths = admin.view() === 'timeline' && admin.timelineUnit() === 'paths'
  const pathId = paths ? (admin.analytics.paths.selected()?.id ?? null) : null
  const recordId = admin.selectedRecordId()
  admin.cardOpen.setFalse()
  queueMicrotask(() => {
    if (paths) {
      if (pathId !== null) {
        focusSelector(`[data-path-id="${CSS.escape(pathId)}"]`)
      }
      return
    }
    if (recordId !== null) {
      focusSelector(`[data-record-id="${CSS.escape(recordId)}"]`)
    }
  })
}

let frameSerial = 0

function frameSources(admin: OtlpAdmin) {
  frameSerial += 1
  const name = `_Admin.frameCard.${frameSerial}`
  const data = computed(() => {
    const record = admin.selectedRecord()
    if (!record) return undefined
    return overviewDataValue(record)
  }, `${name}.data`)
  const params = computed(() => {
    const record = admin.selectedRecord()
    if (!record) return undefined
    return overviewParamsValue(record)
  }, `${name}.params`)
  return { data, params }
}

export const OtlpFrameCard = ({ admin }: { admin: OtlpAdmin }) => {
  const sources = frameSources(admin)
  return (
    <section
      data-reatom-name="FrameCard"
      css={`
        ${scrollable}
        box-sizing: border-box;
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        align-content: start;
        gap: var(--admin-space-12);
        height: 100%;
        min-height: 0;
        padding: var(--admin-space-12);
        background: ${tokens.surface1};
        color: ${tokens.text1};
      `}
    >
      {() => {
        const record = admin.selectedRecord()
        if (!record) return null
        const kind = recordKindIcon(record, admin.mountLogIds())
        return (
          <div
            css={`
              display: grid;
              grid-template-columns: minmax(0, 1fr);
              gap: var(--admin-space-12);
              min-width: 0;
            `}
          >
            <header
              css={`
                display: grid;
                gap: var(--admin-space-4);
                min-width: 0;
              `}
            >
              <h2
                css={`
                  ${type.title}
                  display: flex;
                  align-items: center;
                  gap: var(--admin-space-6);
                  margin: 0;
                  min-width: 0;
                `}
              >
                <KindMark kind={kind} />
                <span
                  css={`
                    min-width: 0;
                    overflow-wrap: anywhere;
                  `}
                >
                  {recordLabel(record)}
                </span>
              </h2>
              <p
                css={`
                  ${type.meta}
                  margin: 0;
                  color: ${tokens.text2};
                `}
              >
                <span
                  css={`
                    color: ${kindColorVar(kind)};
                    [data-admin-colors='false'] & {
                      color: inherit;
                    }
                  `}
                >
                  {kindLabel(record)}
                </span>
                {` · ${record.outcome ?? 'ok'} · ${durationLabel(record)}`}
              </p>
            </header>
            <InspectorTabs value={admin.inspectorTab} />
            {() => {
              const tab = admin.inspectorTab()
              if (tab === 'causes')
                return <Causes admin={admin} record={record} />
              if (tab === 'history')
                return <History admin={admin} record={record} />
              if (tab === 'json')
                return (
                  <Inspector value={admin.selectedRecord} defaultExpanded />
                )
              return <Overview record={record} sources={sources} />
            }}
          </div>
        )
      }}
    </section>
  )
}

function emptyFieldLabel(title: FrameValueTitle): string {
  if (title === 'Payload') return 'No payload'
  if (title === 'Params') return 'No params'
  if (title === 'New state') return 'No new state'
  return 'No earlier value'
}

const expandedValueHooks = {
  initiallyExpanded: () => true,
}

const FrameField = ({
  value,
  emptyLabel,
}: {
  value: AtomLike<unknown>
  emptyLabel: string
}) => (
  <>
    {emptyLabel ? (
      <p css={quiet} prop:hidden={() => frameValueView(value()) !== 'empty'}>
        {emptyLabel}
      </p>
    ) : null}
    <div prop:hidden={() => frameValueView(value()) === 'empty'}>
      <Inspector value={value} defaultExpanded hooks={expandedValueHooks} />
    </div>
  </>
)

let snapshotSerial = 0

const SnapshotInspector = ({ value }: { value: unknown }) => {
  snapshotSerial += 1
  const source = atom(value, `_Admin.frameCard.snapshot.${snapshotSerial}`)
  return <Inspector value={source} defaultExpanded />
}

const SnapshotField = ({
  value,
  emptyLabel,
}: {
  value: unknown
  emptyLabel: string
}) => {
  const view = frameValueView(value)
  if (view === 'empty') return <p css={quiet}>{emptyLabel}</p>
  return <SnapshotInspector value={value} />
}

const Overview = ({
  record,
  sources,
}: {
  record: AdminRecord
  sources: ReturnType<typeof frameSources>
}) => {
  const eventAttributes = overviewEventAttributes(record)
  return (
    <div
      css={`
        display: grid;
        gap: var(--admin-space-12);
        min-width: 0;
      `}
    >
      {recordHasError(record) ? (
        <p
          role="alert"
          css={`
            ${type.body}
            margin: 0;
            color: ${tokens.error};
          `}
        >
          {record.error?.message ?? record.outcome ?? 'error'}
        </p>
      ) : null}
      {eventAttributes !== undefined ? (
        <SnapshotField value={eventAttributes} emptyLabel="" />
      ) : null}
      <FrameField value={sources.data} emptyLabel="" />
      <ParamList value={sources.params} />
    </div>
  )
}

const Causes = ({
  admin,
  record,
}: {
  admin: OtlpAdmin
  record: AdminRecord
}) => {
  const nodes = causeNodes(admin, record)
  return (
    <div
      css={`
        display: grid;
        gap: var(--admin-space-8);
        min-width: 0;
      `}
    >
      {nodes.length === 0 ? (
        <p css={quiet}>No causes</p>
      ) : (
        <RailGraph
          nodes={nodes}
          selectedId={Number(record.frameId)}
          onSelect={(nodeId) => admin.selectFrame(nodeId)}
          onReroot={(nodeId) => admin.selectFrame(nodeId)}
        />
      )}
      <Button label="Open in Graph" onClick={() => admin.view.set('graph')}>
        Open in Graph
      </Button>
    </div>
  )
}

const History = ({
  admin,
  record,
}: {
  admin: OtlpAdmin
  record: AdminRecord
}) => {
  const history = admin.historyForSelected()
  if (history.length === 0) return <p css={quiet}>No earlier value</p>
  const currentTitle = isStateWrite(record) ? 'New state' : 'Payload'
  return (
    <div
      css={`
        display: grid;
        gap: var(--admin-space-8);
      `}
    >
      <section
        css={`
          display: grid;
          gap: var(--admin-space-4);
        `}
      >
        <h3 css={sectionTitle}>{currentTitle}</h3>
        <SnapshotField
          value={recordFieldValue(record)}
          emptyLabel={emptyFieldLabel(currentTitle)}
        />
      </section>
      {history.map((entry) => (
        <section
          css={`
            display: grid;
            gap: var(--admin-space-4);
          `}
        >
          <h3 css={sectionTitle}>Previous state</h3>
          <SnapshotField
            value={recordFieldValue(entry)}
            emptyLabel="No earlier value"
          />
        </section>
      ))}
    </div>
  )
}

function causeNodes(admin: OtlpAdmin, record: AdminRecord) {
  const ids = new Set(record.causeIds)
  const related = admin.records().filter((entry) => {
    if (entry.id === record.id) return true
    return entry.frameId !== undefined && ids.has(entry.frameId)
  })
  return related.flatMap((entry) => {
    const node = toRailNode(entry)
    return node ? [node] : []
  })
}

const sectionTitle = `
  ${type.ui}
  margin: 0;
`

const quiet = `
  ${type.meta}
  margin: 0;
  color: ${tokens.text2};
`
