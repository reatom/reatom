import { toggleMute, volume } from '../model'

const volumeLabelId = 'winamp-volume-label'

export const VolumeSlider = () => {
  return (
    <div
      css={`
        display: grid;
        gap: 4px;
        padding: 5px;
        border: 1px solid var(--skin-border-dark);
        background: linear-gradient(
          180deg,
          rgba(95, 100, 148, 0.98) 0%,
          var(--skin-panel) 26%,
          var(--skin-panel-dark) 100%
        );
        box-shadow:
          inset 1px 1px 0 var(--skin-border-light),
          inset -1px -1px 0 var(--skin-panel-inset-dark);
      `}
    >
      <div
        css={`
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          padding: 0 1px;
        `}
      >
        <span
          id={volumeLabelId}
          css={`
            color: #dde2f3;
            font-family: var(--pixel-font);
            font-size: 8px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          `}
        >
          Vol
        </span>
        <span
          css={() => `
            color: ${volume() === 0 ? '#bcc3d9' : 'var(--skin-display-warn)'};
            font-family: var(--pixel-font);
            font-size: 8px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          `}
        >
          {() => (volume() === 0 ? 'Off' : 'On')}
        </span>
      </div>
      <div
        css={`
          display: grid;
          justify-items: center;
          gap: 6px;
          padding: 4px 3px 5px;
          border: 1px solid #000000;
          background:
            linear-gradient(180deg, rgba(42, 94, 50, 0.22), transparent 28%),
            linear-gradient(180deg, var(--skin-display-bg), var(--skin-display-dark));
          box-shadow:
            inset 1px 1px 0 rgba(133, 190, 133, 0.22),
            inset -1px -1px 0 #010401;
        `}
      >
        <button
          type="button"
          aria-label={volume() === 0 ? 'Unmute' : 'Mute'}
          on:click={() => toggleMute()}
          css={`
            width: 100%;
            height: 18px;
            padding: 0;
            display: grid;
            place-items: center;
            border: 1px solid var(--skin-border-dark);
            background: linear-gradient(
              180deg,
              var(--skin-button-top) 0%,
              var(--skin-button-face) 55%,
              var(--skin-button-bottom) 100%
            );
            box-shadow:
              inset 1px 1px 0 #ffffff,
              inset -1px -1px 0 var(--skin-button-shadow-mid);
            color: var(--skin-button-text);
            font-family: var(--pixel-font);
            font-size: 8px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            cursor: pointer;
          `}
        >
          {() => (volume() === 0 ? 'Off' : 'Mute')}
        </button>
        <div
          css={`
            display: grid;
            grid-template-columns: auto auto;
            gap: 4px;
            align-items: end;
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
              width: 18px;
              height: 96px;
              margin: 0;
              writing-mode: vertical-lr;
              direction: rtl;
              appearance: none;
              background: transparent;
              cursor: pointer;

              &::-webkit-slider-runnable-track {
                width: 6px;
                border: 1px solid #09110b;
                background: linear-gradient(180deg, #517f59 0%, #1b2f1f 100%);
              }

              &::-webkit-slider-thumb {
                appearance: none;
                width: 12px;
                height: 10px;
                margin-left: -4px;
                border: 1px solid var(--skin-border-dark);
                background: linear-gradient(
                  180deg,
                  var(--skin-button-top) 0%,
                  var(--skin-button-face) 55%,
                  var(--skin-button-bottom) 100%
                );
                box-shadow:
                  inset 1px 1px 0 #ffffff,
                  inset -1px -1px 0 var(--skin-button-shadow-mid);
              }

              &::-moz-range-track {
                width: 6px;
                border: 1px solid #09110b;
                background: linear-gradient(180deg, #517f59 0%, #1b2f1f 100%);
              }

              &::-moz-range-thumb {
                width: 12px;
                height: 10px;
                border: 1px solid var(--skin-border-dark);
                background: linear-gradient(
                  180deg,
                  var(--skin-button-top) 0%,
                  var(--skin-button-face) 55%,
                  var(--skin-button-bottom) 100%
                );
                box-shadow:
                  inset 1px 1px 0 #ffffff,
                  inset -1px -1px 0 var(--skin-button-shadow-mid);
              }
            `}
          />
          <div
            aria-hidden="true"
            css={`
              display: flex;
              flex-direction: column-reverse;
              box-sizing: border-box;
              justify-content: space-between;
              height: 96px;
              padding: 2px 0;
            `}
          >
            {Array.from({ length: 8 }, (_, index) => index).map((index) => (
              <span
                css={() => {
                  const filledCount = Math.round(volume() * 8)
                  const isFilled = index < filledCount
                  return `
                    width: 12px;
                    height: 5px;
                    background: ${
                      isFilled
                        ? 'linear-gradient(180deg, var(--skin-display-warn), var(--skin-display-text))'
                        : '#233128'
                    };
                    opacity: ${isFilled ? 1 : 0.85};
                  `
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <span
        aria-hidden="true"
        css={`
          ${`
            border: 1px solid #000000;
            background:
              linear-gradient(180deg, rgba(42, 94, 50, 0.22), transparent 28%),
              linear-gradient(180deg, var(--skin-display-bg), var(--skin-display-dark));
            box-shadow:
              inset 1px 1px 0 rgba(133, 190, 133, 0.22),
              inset -1px -1px 0 #010401;
          `}
          width: 100%;
          padding: 3px 4px;
          color: var(--skin-display-warn);
          text-align: center;
          font-family: var(--pixel-font);
          font-size: 9px;
        `}
      >
        {() => `${Math.round(volume() * 100)}%`}
      </span>
    </div>
  )
}
