import { atom, peek } from '@reatom/core'

import type { OtlpAdmin } from '../../otlp'
import { hasActiveFilter } from '../../otlp'
import type { AdminRecord, AdminRecordKind, AdminReatomKind } from '../../otlp'
import {
  Button,
  Disclosure,
  SearchField,
  truncate,
  type,
} from '../design-system'
import { FilterCalculator } from './FilterCalculator'
import { KindMark } from './KindMark'
import type { RecordKindName } from './recordKind'

let filterBarCounter = 0

const CHIP_KINDS: Array<{
  label: string
  reatomKind: AdminReatomKind
  icon: RecordKindName
}> = [
  { label: 'Actions', reatomKind: 'action', icon: 'action' },
  { label: 'Atoms', reatomKind: 'atom', icon: 'atom' },
  { label: 'Computed', reatomKind: 'computed', icon: 'computed' },
]

function countRecords(
  records: readonly AdminRecord[],
  match: (record: AdminRecord) => boolean,
): number {
  let count = 0
  for (const record of records) {
    if (match(record)) count += 1
  }
  return count
}

export const OtlpFilterBar = ({ admin }: { admin: OtlpAdmin }) => {
  const barId = ++filterBarCounter
  const draft = atom(
    peek(admin.filterCalculator),
    `_Admin.filter.draft.${barId}`,
  )

  const toggleKind = (kind: AdminReatomKind) => {
    admin.filterKind.set(undefined)
    admin.filterReatomKind.set(
      admin.filterReatomKind() === kind ? undefined : kind,
    )
  }

  const reset = () => {
    admin.resetFilter()
    admin.showAbortAndSuspense.setFalse()
    admin.showMountLogs.setFalse()
    draft.set('')
  }

  return (
    <div
      css={`
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--admin-space-8);
        padding: var(--admin-space-8);
        min-width: 0;
      `}
    >
      <SearchField
        value={admin.filterName}
        label="Name"
        placeholder="Name"
        shortcut=""
        testId="filter-name"
      />
      <SearchField
        value={admin.filterQuery}
        label="Value"
        placeholder="Value"
        shortcut=""
        testId="filter-value"
      />
      {() => {
        const scope = admin.analytics.scope()
        if (scope === null) return null
        return (
          <span
            data-testid="analytics-scope"
            css={`
              display: inline-flex;
              align-items: center;
              gap: var(--admin-space-4);
            `}
          >
            <span>{scope.label}</span>
            <Button
              variant="ghost"
              label="Remove session scope"
              onClick={() => admin.analytics.clearScope()}
            >
              Remove session scope
            </Button>
          </span>
        )
      }}
      {() =>
        admin.view() === 'analytics' ||
        (admin.view() === 'timeline' && admin.timelineUnit() === 'paths') ? (
          <span
            css={`
              display: inline-flex;
              gap: var(--admin-space-4);
            `}
          >
            <Button
              variant="ghost"
              label="Include"
              testId="analytics-segment-include"
              pressed={() => admin.analytics.segmentMode() === 'include'}
              disabled={() => !hasActiveFilter(admin.filter())}
              onClick={() => admin.analytics.segmentMode.set('include')}
            >
              Include
            </Button>
            <Button
              variant="ghost"
              label="Exclude"
              testId="analytics-segment-exclude"
              pressed={() => admin.analytics.segmentMode() === 'exclude'}
              disabled={() => !hasActiveFilter(admin.filter())}
              onClick={() => admin.analytics.segmentMode.set('exclude')}
            >
              Exclude
            </Button>
          </span>
        ) : null
      }
      <Button
        variant="ghost"
        label="Errors"
        pressed={() => admin.filterHasError() === true}
        onClick={() => {
          admin.filterHasError.set(
            admin.filterHasError() === true ? undefined : true,
          )
        }}
      >
        {() =>
          `Errors ${countRecords(admin.records(), (record) => record.error != null || record.outcome === 'error')}`
        }
      </Button>
      {CHIP_KINDS.map((chip) => (
        <Button
          variant="ghost"
          label={chip.label}
          pressed={() => admin.filterReatomKind() === chip.reatomKind}
          onClick={() => toggleKind(chip.reatomKind)}
        >
          <KindMark kind={chip.icon} />
          <span>
            {() =>
              `${chip.label} ${countRecords(admin.records(), (record) => record.reatomKind === chip.reatomKind)}`
            }
          </span>
        </Button>
      ))}
      <Button
        variant="ghost"
        label="LOG"
        pressed={() => admin.filterKind() === 'log'}
        onClick={() => {
          const next: AdminRecordKind | undefined =
            admin.filterKind() === 'log' ? undefined : 'log'
          admin.filterKind.set(next)
          if (next === 'log') admin.filterReatomKind.set(undefined)
        }}
      >
        <KindMark kind="log" />
        <span>
          {() =>
            `LOG ${countRecords(admin.records(), (record) => record.kind === 'log')}`
          }
        </span>
      </Button>
      <Button
        variant="ghost"
        label="Aborted and suspense"
        pressed={() => admin.showAbortAndSuspense()}
        onClick={() => admin.showAbortAndSuspense.toggle()}
      >
        {() => {
          const count = admin.showAbortAndSuspense()
            ? admin.abortSuspenseCount()
            : admin.hiddenAbortSuspenseCount()
          return count > 0
            ? `Aborted and suspense ${count}`
            : 'Aborted and suspense'
        }}
      </Button>
      <Button
        variant="ghost"
        label="Mount logs"
        title="Logs from the first read or connect of an atom"
        pressed={() => admin.showMountLogs()}
        onClick={() => admin.showMountLogs.toggle()}
      >
        {() => {
          const count = admin.showMountLogs()
            ? admin.mountLogCount()
            : admin.hiddenMountLogCount()
          return count > 0 ? `Mount logs ${count}` : 'Mount logs'
        }}
      </Button>
      {() => {
        const applied = admin.filterCalculator().trim()
        if (applied === '') return null
        return (
          <Button
            label={`Remove applied expression ${applied}`}
            title={`Applied expression: ${applied}. Click to remove it.`}
            onClick={() => admin.filterCalculator.set('')}
          >
            <span
              css={`
                ${type.data}
                ${truncate}
                max-width: 16rem;
              `}
            >
              {`= ${applied}`}
            </span>
            <span aria-hidden="true">×</span>
          </Button>
        )
      }}
      <div
        css={`
          min-width: 0;
          &:has(> details[open]) {
            flex-basis: 100%;
            order: 1;
          }
        `}
      >
        <Disclosure label="Advanced filters">
          <FilterCalculator admin={admin} draft={draft} />
        </Disclosure>
      </div>
      {() =>
        hasActiveFilter(admin.filter()) ||
        admin.showAbortAndSuspense() ||
        admin.showMountLogs() ? (
          <Button label="Reset filters" onClick={reset}>
            Reset
          </Button>
        ) : null
      }
    </div>
  )
}
