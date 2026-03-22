import { volume } from '../model'

const ticks = [0, 1, 2, 3, 4, 5, 6, 7]

const volumeLabelId = 'winamp-volume-label'

export const VolumeSlider = () => {
  return (
    <div
      css={`
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 9px;
        width: 100%;
        padding: 9px 8px 10px;
        border: 1px solid rgba(0, 0, 0, 0.6);
        border-radius: 9px;
        background: linear-gradient(180deg, rgba(48, 52, 60, 0.96), rgba(20, 22, 27, 0.98));
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.08),
          inset 0 0 0 1px rgba(255, 255, 255, 0.03);
      `}
    >
      <span
        id={volumeLabelId}
        css={`
          color: var(--winamp-muted);
          font-size: 10px;
          letter-spacing: 0.12em;
        `}
      >
        VOL
      </span>
      <div
        css={`
          width: 100%;
          padding: 8px 8px 9px;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          align-items: center;
          border: 1px solid #071109;
          border-radius: 8px;
          background:
            linear-gradient(180deg, rgba(17, 19, 24, 0.96), rgba(7, 8, 11, 0.98)),
            repeating-linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.02) 0 1px,
              transparent 1px 4px
            );
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
        `}
      >
        <div
          css={`
            display: flex;
            justify-content: center;
          `}
        >
          <input
            type="range"
            min={0}
            max={100}
            aria-labelledby={volumeLabelId}
            prop:value={() => Math.round(volume() * 100)}
            on:input={(event) => {
              volume.set(Number(event.currentTarget.value) / 100)
            }}
            css={`
              width: 22px;
              height: 102px;
              writing-mode: vertical-lr;
              direction: rtl;
              accent-color: var(--winamp-accent);
              filter: drop-shadow(0 0 8px rgba(243, 163, 63, 0.18));
              cursor: pointer;
            `}
          />
        </div>
        <div
          aria-hidden="true"
          css={`
            display: flex;
            flex-direction: column-reverse;
            gap: 4px;
          `}
        >
          {ticks.map((tick) => (
            <span
              css={() => {
                const filledCount = Math.round(volume() * ticks.length)
                const isFilled = tick < filledCount
                return `
                  width: 12px;
                  height: 7px;
                  border-radius: 999px;
                  background: ${
                    isFilled
                      ? 'linear-gradient(180deg, #ffd782, #ff9e2b)'
                      : 'linear-gradient(180deg, #39404c, #242832)'
                  };
                  box-shadow: ${
                    isFilled
                      ? '0 0 10px rgba(255, 165, 48, 0.22)'
                      : 'inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                  };
                  opacity: ${isFilled ? 1 : 0.7};
                `
              }}
            />
          ))}
        </div>
      </div>
      <span
        aria-hidden="true"
        css={`
          min-width: 40px;
          padding: 4px 8px;
          text-align: center;
          color: var(--winamp-led);
          font-family: ui-monospace, 'Courier New', monospace;
          font-size: 11px;
          border: 1px solid #071109;
          border-radius: 999px;
          background:
            linear-gradient(180deg, rgba(13, 38, 18, 0.98), rgba(7, 18, 10, 0.98)),
            repeating-linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.03) 0 1px,
              transparent 1px 4px
            );
          box-shadow: inset 0 0 0 1px rgba(135, 255, 145, 0.08);
          text-shadow: 0 0 8px rgba(87, 255, 107, 0.3);
        `}
      >
        {() => `${Math.round(volume() * 100)}%`}
      </span>
    </div>
  )
}
