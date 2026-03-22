import { isPlaying, volume } from '../model'

const bars = [72, 48, 86, 58, 94, 38, 76, 52, 88, 46, 82, 60]

export const Visualizer = () => {
  return (
    <div
      css={`
        padding: 8px 9px 9px;
        border: 1px solid rgba(0, 0, 0, 0.72);
        border-radius: 9px;
        background: linear-gradient(180deg, rgba(43, 47, 56, 0.94), rgba(18, 21, 27, 0.98));
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.08),
          inset 0 0 0 1px rgba(255, 255, 255, 0.04);
      `}
    >
      <div
        css={`
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 7px;
          color: var(--winamp-muted);
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        `}
      >
        <span>EQ</span>
        <span
          css={() => `
            color: ${isPlaying() ? '#ffd978' : 'rgba(255, 217, 120, 0.42)'};
            animation: winamp-led-pulse 900ms ease-in-out infinite;
            animation-play-state: ${isPlaying() ? 'running' : 'paused'};
          `}
        >
          {() => (isPlaying() ? 'Live' : 'Idle')}
        </span>
      </div>

      <div
        css={`
          position: relative;
          display: flex;
          align-items: flex-end;
          gap: 4px;
          height: 60px;
          padding: 8px 7px 7px;
          border: 1px solid #061008;
          border-radius: 8px;
          overflow: hidden;
          background:
            linear-gradient(180deg, rgba(9, 34, 15, 0.98), rgba(5, 17, 9, 0.98)),
            repeating-linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.026) 0 1px,
              transparent 1px 4px
            );
          box-shadow:
            inset 0 0 0 1px rgba(135, 255, 145, 0.08),
            inset 0 0 20px rgba(44, 255, 93, 0.08);
        `}
      >
        <div
          css={`
            position: absolute;
            inset: 0;
            background: linear-gradient(
              110deg,
              transparent 0%,
              rgba(255, 255, 255, 0.1) 46%,
              transparent 54%
            );
            animation: winamp-sheen 2.8s linear infinite;
            opacity: 0.28;
            pointer-events: none;
          `}
        />
        {bars.map((baseHeight, index) => (
          <span
            css={() => {
              const level = volume()
              const active = isPlaying()
              const idleScale = 0.18 + (index % 4) * 0.04
              const activeScale = 0.5 + level * 0.6
              return `
                position: relative;
                z-index: 1;
                width: 4px;
                height: ${baseHeight}%;
                border-radius: 999px 999px 2px 2px;
                background: linear-gradient(
                  180deg,
                  #fff0a0 0%,
                  #ffc85d 22%,
                  #ff9831 48%,
                  #61ff83 100%
                );
                box-shadow:
                  0 0 8px rgba(255, 165, 52, 0.2),
                  0 0 14px rgba(97, 255, 131, 0.16);
                transform-origin: bottom;
                transform: scaleY(${active ? activeScale : idleScale});
                animation: winamp-meter ${660 + index * 45}ms ease-in-out infinite alternate;
                animation-delay: ${index * 55}ms;
                animation-play-state: ${active ? 'running' : 'paused'};
                opacity: ${active ? 0.96 : 0.45};
              `
            }}
          />
        ))}
      </div>

      <div
        css={`
          display: flex;
          justify-content: space-between;
          margin-top: 6px;
          color: rgba(191, 255, 198, 0.7);
          font-family: ui-monospace, 'Courier New', monospace;
          font-size: 9px;
          letter-spacing: 0.08em;
        `}
      >
        <span>L</span>
        <span>R</span>
      </div>
    </div>
  )
}
