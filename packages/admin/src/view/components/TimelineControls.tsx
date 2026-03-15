import type { Admin } from '../../index'
import { buttonGhost, colors, flex, flexWrap, gap, inputLike } from '../styles'

export interface TimelineControlsProps {
  admin: Admin
}

export const TimelineControls = ({ admin }: TimelineControlsProps) => {
  return (
    <div
      css={`
        ${flex}
        ${gap(2)}
        ${flexWrap}
        align-items: end;
      `}
    >
      <label
        css={`
          display: grid;
          gap: 0.35rem;
          color: ${colors.textMuted};
          font-size: 0.76rem;
        `}
      >
        Bucket size
        <input
          type="number"
          min={10}
          step={10}
          prop:value={admin.timeline.bucketSize}
          on:input={(event: Event) => {
            const target = event.currentTarget
            if (!(target instanceof HTMLInputElement)) return
            const nextValue = Number.parseInt(target.value, 10)
            if (Number.isNaN(nextValue) || nextValue < 10) return
            admin.timeline.bucketSize.set(nextValue)
          }}
          css={inputLike}
        />
      </label>

      <label
        css={`
          display: grid;
          gap: 0.35rem;
          color: ${colors.textMuted};
          font-size: 0.76rem;
        `}
      >
        Zoom
        <input
          type="range"
          min={1}
          max={8}
          step={1}
          prop:value={admin.timeline.zoom}
          on:input={(event: Event) => {
            const target = event.currentTarget
            if (!(target instanceof HTMLInputElement)) return
            const nextValue = Number.parseInt(target.value, 10)
            if (Number.isNaN(nextValue) || nextValue < 1) return
            admin.timeline.zoom.set(nextValue)
          }}
        />
      </label>

      <label
        css={`
          display: grid;
          gap: 0.35rem;
          color: ${colors.textMuted};
          font-size: 0.76rem;
          min-width: 14rem;
        `}
      >
        Offset
        <input
          type="range"
          min={-1}
          max={1}
          step={0.05}
          prop:value={admin.timeline.offset}
          on:input={(event: Event) => {
            const target = event.currentTarget
            if (!(target instanceof HTMLInputElement)) return
            const nextValue = Number.parseFloat(target.value)
            if (Number.isNaN(nextValue)) return
            admin.timeline.offset.set(nextValue)
          }}
        />
      </label>

      <button
        type="button"
        css={buttonGhost}
        on:click={() => {
          admin.timeline.bucketSize.set(100)
          admin.timeline.zoom.set(1)
          admin.timeline.offset.set(0)
        }}
      >
        Reset timeline
      </button>
    </div>
  )
}
