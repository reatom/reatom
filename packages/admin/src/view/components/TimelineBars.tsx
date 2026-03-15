import type { Admin } from '../../index'
import type { TimeBucket } from '../../timeline'
import { formatTimestamp } from '../format'
import { colors, flex, flexCol, gap, rounded } from '../styles'

export interface TimelineBarsProps {
  admin: Admin
  selectedBucketIndex: number | null
  onSelectBucket: (bucket: TimeBucket, index: number) => void
}

export const TimelineBars = ({
  admin,
  selectedBucketIndex,
  onSelectBucket,
}: TimelineBarsProps) => {
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
          buckets().map((bucket, i) => {
            const height = (bucket.entries.length / maxCount()) * 100
            const hasError = bucket.errorCount > 0
            return (
              <button
                type="button"
                title={`${bucket.entries.length} frames, ${bucket.errorCount} errors`}
                css={`
                  flex: 1;
                  min-width: 4px;
                  background: ${selectedBucketIndex === i
                    ? colors.warning
                    : hasError
                      ? colors.error
                      : colors.accent};
                  opacity: ${0.3 + (bucket.entries.length / maxCount()) * 0.7};
                  border-radius: 8px 8px 0 0;
                  transition: height 0.15s, transform 0.15s;
                  border: 1px solid ${selectedBucketIndex === i
                    ? colors.warning
                    : 'transparent'};
                  cursor: pointer;
                `}
                style={{ height: `${Math.max(2, height)}%` }}
                on:click={() => onSelectBucket(bucket, i)}
              />
            )
          })
        }
      </div>
      <div
        css={`
          font-size: 0.65rem;
          color: ${colors.textMuted};
          display: flex;
          justify-content: space-between;
          gap: 1rem;
        `}
      >
        {() => {
          const [min, max] = timeRange()
          return (
            <>
              <span>{formatTimestamp(min)}</span>
              <span
                css={`
                  ${rounded}
                  padding: 0.2rem 0.45rem;
                  border: 1px solid ${colors.border};
                  background: ${colors.bgElevated};
                `}
              >
                {buckets().length} bucket{buckets().length === 1 ? '' : 's'}
              </span>
              <span>{formatTimestamp(max)}</span>
            </>
          )
        }}
      </div>
    </div>
  )
}
