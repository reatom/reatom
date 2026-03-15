import type { Admin } from '../../index'
import { colors, flex, flexCol, gap } from '../styles'

export interface TimelineBarsProps {
  admin: Admin
}

export const TimelineBars = ({ admin }: TimelineBarsProps) => {
  const buckets = () => admin.timeline.buckets()
  const timeRange = () => admin.store.timeRange()
  const maxCount = () => Math.max(1, ...buckets().map((b) => b.entries.length))

  return (
    <div
      css={`
        ${flex}
        ${flexCol}
        ${gap(1)}
        width: 100%;
        height: 12rem;
      `}
    >
      <div
        css={`
          ${flex}
          ${gap(1)}
          flex: 1;
          align-items: flex-end;
          min-height: 0;
        `}
      >
        {() =>
          buckets().map((bucket) => {
            const height = (bucket.entries.length / maxCount()) * 100
            const hasError = bucket.errorCount > 0
            return (
              <div
                title={`${bucket.entries.length} frames, ${bucket.errorCount} errors`}
                css={`
                  flex: 1;
                  min-width: 4px;
                  background: ${hasError ? colors.error : colors.accent};
                  opacity: ${0.3 + (bucket.entries.length / maxCount()) * 0.7};
                  border-radius: 2px 2px 0 0;
                  transition: height 0.15s;
                `}
                style={{ height: `${Math.max(2, height)}%` }}
              />
            )
          })
        }
      </div>
      <div
        css={`
          font-size: 0.65rem;
          color: ${colors.textMuted};
        `}
      >
        {() => {
          const [min, max] = timeRange()
          return `${new Date(min).toISOString().slice(11, 19)} – ${new Date(max).toISOString().slice(11, 19)}`
        }}
      </div>
    </div>
  )
}
