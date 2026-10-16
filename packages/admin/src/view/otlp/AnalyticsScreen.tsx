import type { OtlpAdmin } from '../../otlp'
import {
  analyticsPercentText,
  type AnalyticsBreakdownRow,
  type AnalyticsDimension,
} from '../../otlp/analytics'
import {
  Button,
  DataGrid,
  EmptyState,
  scrollable,
  tokens,
  type,
  type DataGridColumn,
} from '../design-system'
import { formatAxisOffset } from './GanttChart'

const TOP_ROWS = 10

const DIMENSIONS: Array<{
  id: AnalyticsDimension
  title: string
  paths: boolean
}> = [
  { id: 'page', title: 'Pages', paths: true },
  { id: 'entry', title: 'Entry pages', paths: true },
  { id: 'exit', title: 'Exit pages', paths: true },
  { id: 'source', title: 'Sources', paths: false },
]

export function analystStatusWords(admin: OtlpAdmin): string {
  const shown = admin.analytics.segment().length
  const total = admin.analytics.sessions().length
  const source =
    admin.source() === 'remote'
      ? 'ClickHouse'
      : admin.source() === 'replay'
        ? 'Replay'
        : 'Live'
  const partial =
    admin.source() === 'remote' ? ' · latest 500 records per signal' : ''
  return `${shown} of ${total} consented sessions · ${source}${partial}`
}

const kpi = (id: string, title: string, text: string) => (
  <div data-testid={`analytics-kpi-${id}`}>
    <div css={kpiLabel}>{title}</div>
    <div css={kpiNumber}>{text}</div>
  </div>
)

export const OtlpAnalyticsScreen = ({ admin }: { admin: OtlpAdmin }) => (
  <section
    data-testid="otlp-analytics"
    data-reatom-name="AnalyticsScreen"
    css={`
      ${scrollable}
      box-sizing: border-box;
      display: grid;
      align-content: start;
      gap: var(--admin-space-16);
      height: 100%;
      min-height: 0;
      padding: var(--admin-space-12);
      background: ${tokens.canvas};
      color: ${tokens.text1};
    `}
  >
    <p
      data-testid="analytics-status"
      css={`
        ${type.meta}
        margin: 0;
        color: ${tokens.text2};
      `}
    >
      {() => analystStatusWords(admin)}
    </p>
    {() =>
      admin.analytics.sessions().length === 0 ? (
        <EmptyState
          title="No analytics sessions."
          description="Analytics reads connectWebAnalytics records (app.page_view logs with session.id). Nothing is sent before consent."
        />
      ) : (
        <div
          css={`
            display: grid;
            gap: var(--admin-space-16);
            min-width: 0;
          `}
        >
          <div
            css={`
              display: flex;
              flex-wrap: wrap;
              gap: var(--admin-space-12);
            `}
          >
            {() => {
              const totals = admin.analytics.totals()
              const sessions = totals.sessions
              return (
                <>
                  {kpi('visitors', 'Visitors', String(totals.visitors))}
                  {kpi('sessions', 'Sessions', String(totals.sessions))}
                  {kpi('pageViews', 'Page views', String(totals.pageViews))}
                  {kpi(
                    'engaged',
                    'Engaged',
                    `${totals.engagedSessions} · ${analyticsPercentText(totals.engagementRate, sessions)}`,
                  )}
                  {kpi(
                    'bounce',
                    'Bounce',
                    analyticsPercentText(totals.bounceRate, sessions),
                  )}
                  {kpi(
                    'activeTime',
                    'Median active',
                    formatAxisOffset(totals.activeMsPerSession.median),
                  )}
                  {kpi('errors', 'Errors', String(totals.sessionsWithErrors))}
                </>
              )
            }}
          </div>
          <AnalyticsTrend admin={admin} />
          <div
            css={`
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
              gap: var(--admin-space-12);
              min-width: 0;
            `}
          >
            {DIMENSIONS.map((dimension) => (
              <BreakdownGrid
                admin={admin}
                dimension={dimension.id}
                title={dimension.title}
                paths={dimension.paths}
              />
            ))}
          </div>
        </div>
      )
    }
  </section>
)

const AnalyticsTrend = ({ admin }: { admin: OtlpAdmin }) => (
  <div
    data-testid="analytics-trend"
    role="img"
    aria-label={() => {
      const trend = admin.analytics.trend()
      const sessions = trend.buckets.reduce(
        (sum, bucket) => sum + bucket.sessions,
        0,
      )
      return `${trend.buckets.length} buckets of ${formatAxisOffset(trend.bucketMs)}, ${sessions} sessions`
    }}
    css={`
      display: flex;
      align-items: end;
      gap: 2px;
      height: 72px;
      min-width: 0;
      padding: var(--admin-space-8);
      background: ${tokens.surface1};
      border: 1px solid ${tokens.border1};
      border-radius: var(--admin-radius-2);
    `}
  >
    {() => {
      const trend = admin.analytics.trend()
      const max = trend.buckets.reduce(
        (peak, bucket) => Math.max(peak, bucket.sessions),
        0,
      )
      return trend.buckets.map((bucket) => (
        <div
          title={`${bucket.sessions}`}
          style:height={max === 0 ? '0%' : `${(bucket.sessions / max) * 100}%`}
          css={`
            flex: 1 1 0;
            min-width: 2px;
            background: ${tokens.accent};
          `}
        />
      ))
    }}
  </div>
)

const BreakdownGrid = ({
  admin,
  dimension,
  title,
  paths,
}: {
  admin: OtlpAdmin
  dimension: AnalyticsDimension
  title: string
  paths: boolean
}) => {
  const rows = () => admin.analytics.breakdowns()[dimension].slice(0, TOP_ROWS)
  const columns: Array<DataGridColumn<AnalyticsBreakdownRow>> = [
    {
      id: 'key',
      header: 'Key',
      render: (row) => <span>{row.key}</span>,
    },
    {
      id: 'sessions',
      header: 'Sessions',
      width: '72px',
      render: (row) => <span>{String(row.sessions)}</span>,
    },
    {
      id: 'visitors',
      header: 'Visitors',
      width: '72px',
      render: (row) => <span>{String(row.visitors)}</span>,
    },
    {
      id: 'pageViews',
      header: 'Page views',
      width: '80px',
      render: (row) => <span>{String(row.pageViews)}</span>,
    },
    {
      id: 'engaged',
      header: 'Engaged %',
      width: '80px',
      render: (row) => (
        <span>
          {analyticsPercentText(
            row.sessions === 0 ? 0 : row.engagedSessions / row.sessions,
            row.sessions,
          )}
        </span>
      ),
    },
    {
      id: 'active',
      header: 'Median active',
      width: '96px',
      render: (row) => <span>{formatAxisOffset(row.activeMs.median)}</span>,
    },
    {
      id: 'actions',
      header: 'Actions',
      width: '220px',
      render: (row) => (
        <span
          css={`
            display: inline-flex;
            gap: var(--admin-space-4);
          `}
          on:click={(event: MouseEvent) => event.stopPropagation()}
        >
          {paths ? (
            <Button
              variant="ghost"
              label={`Paths from here ${row.key}`}
              onClick={() => admin.showPaths(row.key)}
            >
              Paths from here
            </Button>
          ) : null}
          <Button
            variant="ghost"
            label={`Show sessions ${row.key}`}
            onClick={() =>
              admin.showSessions(
                `${title}: ${row.key}`,
                new Set(row.sessionIds),
                {
                  dimension,
                  key: row.key,
                },
              )
            }
          >
            Show sessions
          </Button>
        </span>
      ),
    },
  ]

  return (
    <div data-testid={`analytics-breakdown-${dimension}`}>
      <h2
        css={`
          ${type.ui}
          margin: 0 0 var(--admin-space-8);
        `}
      >
        {title}
      </h2>
      <div
        css={`
          height: 280px;
          min-height: 0;
          border: 1px solid ${tokens.border1};
        `}
      >
        <DataGrid
          columns={columns}
          rows={rows}
          getRowId={(row) => row.key}
          selectedId={() => {
            const scope = admin.analytics.scope()
            if (scope === null || scope.dimension !== dimension) return null
            return scope.key ?? null
          }}
          onSelect={(row) =>
            admin.analytics.scope.scopeTo(
              `${title}: ${row.key}`,
              new Set(row.sessionIds),
              { dimension, key: row.key },
            )
          }
          empty={<span>No rows</span>}
          ariaLabel={title}
        />
      </div>
      {() => {
        const hidden = admin.analytics.breakdowns()[dimension].length - TOP_ROWS
        return hidden > 0 ? <p css={moreRows}>{`+${hidden} more`}</p> : null
      }}
    </div>
  )
}

const kpiLabel = `
  ${type.meta}
  color: ${tokens.text3};
`

const kpiNumber = `
  ${type.title}
  font-variant-numeric: tabular-nums;
`

const moreRows = `
  ${type.meta}
  margin: var(--admin-space-4) 0 0;
  color: ${tokens.text3};
`
