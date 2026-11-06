import { computed, type Computed } from '@reatom/core'

import type { AdminRecord, OtlpAdmin } from '../../otlp'
import { Icon, tokens, type } from '../design-system'
import { adminSettings } from '../settings'
import { equalStateRecordIds } from './frameValues'

const indexes = new WeakMap<OtlpAdmin, Computed<Set<string>>>()
const message =
  'Captured state is structurally equal to the previous captured state'

export const EqualStateWarning = ({
  admin,
  record,
  detail = false,
}: {
  admin: OtlpAdmin
  record: () => AdminRecord
  detail?: boolean
}) => {
  const settings = adminSettings()
  let index = indexes.get(admin)
  if (!index) {
    index = computed(
      () =>
        settings.equalStateWarnings()
          ? equalStateRecordIds(admin.records())
          : new Set<string>(),
      '_Admin.equalStateWarnings',
    )
    indexes.set(admin, index)
  }
  const warnings = index
  return (
    <>
      {() =>
        warnings().has(record().id) ? (
          <span
            data-equal-state-warning=""
            role="note"
            aria-label={message}
            title={message}
            css={`
              ${type.meta} display: inline-flex;
              align-items: center;
              gap: 4px;
              flex: none;
              color: ${tokens.warning};
            `}
          >
            <Icon name="error" />
            {detail ? message : null}
          </span>
        ) : null
      }
    </>
  )
}
