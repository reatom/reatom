import type { OtlpAdmin } from '../../otlp'
import {
  ANALYTICS_MIN_SHARE_SESSIONS,
  analyticsPathAncestry,
  typicalAnalyticsSession,
  type AnalyticsPathNode,
} from '../../otlp/analytics'
import { Button, scrollable, tokens, type } from '../design-system'
import { formatAxisOffset } from './GanttChart'

const percentFormat = new Intl.NumberFormat(undefined, {
  style: 'percent',
  maximumFractionDigits: 0,
})

const shareText = (share: number, denominator: number) =>
  denominator < ANALYTICS_MIN_SHARE_SESSIONS ? '—' : percentFormat.format(share)

const directionText = (node: AnalyticsPathNode) => {
  if (node.direction === 'before') return 'Before the alignment point'
  if (node.direction === 'after') return 'After the alignment point'
  return 'At the alignment point'
}

const quartileText = (median: number, low: number, high: number) =>
  `${formatAxisOffset(median)} (p25 ${formatAxisOffset(low)}–p75 ${formatAxisOffset(high)})`

export const PathStepCard = ({ admin }: { admin: OtlpAdmin }) => (
  <section
    data-testid="path-step-card"
    data-reatom-name="PathStepCard"
    css={`
      ${scrollable}
      box-sizing: border-box;
      display: grid;
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
      const node = admin.analytics.paths.selected()
      if (node === null) {
        return <p css={quiet}>No step selected</p>
      }
      const rootSessions =
        node.share > 0 ? node.sessions / node.share : node.sessions
      const parentSessions =
        node.continuation > 0 ? node.sessions / node.continuation : 0
      const stopLabel = node.direction === 'before' ? 'Entries' : 'Exits'
      return (
        <div
          css={`
            display: grid;
            gap: var(--admin-space-12);
            min-width: 0;
          `}
        >
          <div
            css={`
              display: grid;
              gap: var(--admin-space-4);
            `}
          >
            <h2
              css={`
                ${type.title}
                margin: 0;
              `}
            >
              {node.label}
            </h2>
            <p css={quiet}>{directionText(node)}</p>
          </div>
          <dl
            css={`
              display: grid;
              grid-template-columns: minmax(0, 1fr) auto;
              gap: var(--admin-space-4) var(--admin-space-12);
              margin: 0;
              ${type.body}
            `}
          >
            <dt css={factLabel}>Sessions</dt>
            <dd css={factValue}>
              {`${node.sessions} (${shareText(node.share, rootSessions)})`}
            </dd>
            <dt css={factLabel}>Continue %</dt>
            <dd css={factValue}>
              {shareText(node.continuation, parentSessions)}
            </dd>
            <dt css={factLabel}>{stopLabel}</dt>
            <dd css={factValue}>{String(node.stops)}</dd>
            <dt css={factLabel}>Median time from alignment point</dt>
            <dd css={factValue}>{formatAxisOffset(node.offsetMs.median)}</dd>
            <dt css={factLabel}>Median time on step</dt>
            <dd css={factValue}>
              {quartileText(
                node.durationMs.median,
                node.durationMs.p25,
                node.durationMs.p75,
              )}
            </dd>
            <dt css={factLabel}>Median active time</dt>
            <dd css={factValue}>{formatAxisOffset(node.activeMs.median)}</dd>
            <dt css={factLabel}>Sessions with errors</dt>
            <dd css={factValue}>{String(node.sessionsWithErrors)}</dd>
          </dl>
          <div
            css={`
              display: flex;
              flex-wrap: wrap;
              gap: var(--admin-space-8);
            `}
          >
            <Button
              label="Show sessions"
              testId="path-step-sessions"
              onClick={() =>
                admin.showSessions(
                  `${node.label}: ${node.sessions} sessions`,
                  new Set(node.sessionIds),
                )
              }
            >
              Show sessions
            </Button>
            <Button
              label="Open typical session"
              testId="path-step-typical-session"
              onClick={() => {
                const chain = analyticsPathAncestry(
                  admin.analytics.pathNodes(),
                  node,
                )
                admin.openTypicalSession(
                  typicalAnalyticsSession(admin.analytics.segment(), chain),
                )
              }}
            >
              Open typical session
            </Button>
            <Button
              label="Align here"
              testId="path-step-align"
              disabled={node.direction === 'root' || node.folded}
              onClick={() => admin.showPaths(node.label)}
            >
              Align here
            </Button>
          </div>
        </div>
      )
    }}
  </section>
)

const factLabel = `
  ${type.meta}
  margin: 0;
  color: ${tokens.text2};
`

const factValue = `
  margin: 0;
  text-align: end;
  font-variant-numeric: tabular-nums;
`

const quiet = `
  ${type.meta}
  margin: 0;
  color: ${tokens.text2};
`
