import { volume } from '../model'

export const VolumeSlider = () => {
  return (
    <div
      css={`
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 4px 2px;
        background: linear-gradient(90deg, #1a1a1a, #333, #1a1a1a);
        border: 1px solid #000;
      `}
    >
      <span
        css={`
          color: #888;
          font-size: 10px;
        `}
      >
        VOL
      </span>
      <input
        type="range"
        min={0}
        max={100}
        prop:value={() => Math.round(volume() * 100)}
        on:input={(event) => {
          volume.set(Number(event.currentTarget.value) / 100)
        }}
        css={`
          width: 22px;
          height: 72px;
          writing-mode: vertical-lr;
          direction: rtl;
          accent-color: var(--winamp-accent);
          cursor: pointer;
        `}
      />
    </div>
  )
}
