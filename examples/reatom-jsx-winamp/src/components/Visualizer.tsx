import { action, atom } from '@reatom/core'

import {
  activeEqPresetId,
  activeEqPresetLabel,
  applyEqPreset,
  EQ_GAIN_MAX,
  EQ_GAIN_MIN,
  eqEnabled,
  equalizerBands,
  equalizerPresets,
  getEqualizerGains,
  resetEqBandGains,
  setEqBandGain,
  toggleEq,
} from '../equalizer'

const chromeButton = `
  min-width: 0;
  height: 18px;
  padding: 0 5px;
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
  font-size: 7px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;

  &:hover {
    filter: brightness(1.03);
  }

  &:active {
    box-shadow:
      inset 1px 1px 0 var(--skin-button-shadow-mid),
      inset -1px -1px 0 #ffffff;
  }
`

const gainMarkers = [EQ_GAIN_MAX, 0, EQ_GAIN_MIN]

const eqPresetMenuOpen = atom(false, 'eqPresetMenuOpen')

const closeEqPresetMenu = action(() => {
  eqPresetMenuOpen.set(false)
}, 'closeEqPresetMenu')

const toggleEqPresetMenu = action(() => {
  eqPresetMenuOpen.set(!eqPresetMenuOpen())
}, 'toggleEqPresetMenu')

export const Visualizer = () => {
  return (
    <section
      role="region"
      aria-label="Equalizer"
      on:keydown={(event) => {
        if (event.key === 'Escape') {
          closeEqPresetMenu()
        }
      }}
      css={`
        position: relative;
        display: grid;
        grid-template-rows: auto minmax(116px, 1fr);
        gap: 4px;
        height: 100%;
        min-height: 0;
        padding: 4px;
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
          gap: 8px;
          padding: 0 1px;
          color: #dde2f3;
          font-family: var(--pixel-font);
          font-size: 8px;
          line-height: 1;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        `}
      >
        <div
          css={`
            display: flex;
            align-items: center;
            gap: 5px;
            min-width: 0;
          `}
        >
          <span>EQ</span>
          <span
            css={`
              min-width: 0;
              color: #ffdc73;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            `}
          >
            {() => activeEqPresetLabel()}
          </span>
        </div>
        <div
          css={`
            display: flex;
            gap: 3px;
            align-items: center;
          `}
        >
          <button
            type="button"
            on:click={() => toggleEq()}
            prop:aria-pressed={() => eqEnabled()}
            css={`
              ${chromeButton}
              color: ${eqEnabled()
                ? 'var(--skin-display-text)'
                : 'var(--skin-button-text)'};
            `}
          >
            {() => (eqEnabled() ? 'On' : 'Off')}
          </button>
          <button
            type="button"
            on:click={() => toggleEqPresetMenu()}
            aria-haspopup="menu"
            prop:aria-expanded={() => eqPresetMenuOpen()}
            css={`
              ${chromeButton}
              color: ${eqPresetMenuOpen()
                ? 'var(--skin-display-text)'
                : 'var(--skin-button-text)'};
            `}
          >
            Prs
          </button>
          <button
            type="button"
            on:click={() => resetEqBandGains()}
            css={chromeButton}
          >
            Rst
          </button>
        </div>
      </div>

      {() =>
        eqPresetMenuOpen() && (
          <div
            role="menu"
            aria-label="Equalizer presets"
            css={`
              position: absolute;
              top: 23px;
              right: 4px;
              z-index: 5;
              width: 142px;
              max-height: 178px;
              overflow: auto;
              display: grid;
              padding: 2px;
              border: 1px solid #000000;
              background: linear-gradient(180deg, #d5d9e9 0%, #b1b7cf 100%);
              box-shadow:
                1px 1px 0 rgba(7, 9, 24, 0.9),
                inset 1px 1px 0 #f8f9ff,
                inset -1px -1px 0 #6f7690;
            `}
          >
            {equalizerPresets.map((preset) => (
              <button
                type="button"
                role="menuitemradio"
                prop:aria-checked={() => activeEqPresetId() === preset.id}
                on:click={() => {
                  applyEqPreset(preset.id)
                  closeEqPresetMenu()
                }}
                css={() => `
                  min-width: 0;
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  gap: 6px;
                  height: 18px;
                  padding: 0 5px;
                  border: 1px solid transparent;
                  background: ${activeEqPresetId() === preset.id ? '#2a3157' : 'transparent'};
                  color: ${activeEqPresetId() === preset.id ? '#ffef9c' : '#22263e'};
                  font-family: var(--pixel-font);
                  font-size: 7px;
                  letter-spacing: 0.06em;
                  text-transform: uppercase;
                  text-align: left;
                  cursor: pointer;

                  &:hover {
                    background: ${activeEqPresetId() === preset.id ? '#2a3157' : '#596084'};
                    color: ${activeEqPresetId() === preset.id ? '#ffef9c' : '#f7f8ff'};
                  }
                `}
              >
                <span
                  css={`
                    min-width: 0;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                  `}
                >
                  {preset.label}
                </span>
                <span>
                  {() => (activeEqPresetId() === preset.id ? '*' : '')}
                </span>
              </button>
            ))}
          </div>
        )
      }

      <div
        css={`
          min-height: 0;
          display: grid;
          grid-template-columns: 22px minmax(0, 1fr);
          gap: 4px;
          padding: 4px 3px 5px;
          border: 1px solid #000000;
          background: linear-gradient(180deg, #dadde8 0%, #b6bbd0 100%);
          box-shadow:
            inset 1px 1px 0 #f8f9ff,
            inset -1px -1px 0 #6f7690;
        `}
      >
        <div
          css={`
            display: grid;
            grid-template-rows: repeat(3, minmax(0, 1fr));
            align-items: center;
            color: #5a617b;
            font-family: var(--pixel-font);
            font-size: 7px;
            line-height: 1;
            letter-spacing: 0.06em;
          `}
        >
          {gainMarkers.map((marker) => (
            <span>{marker > 0 ? `+${marker}` : marker}</span>
          ))}
        </div>
        <div
          css={() => `
            min-height: 0;
            display: grid;
            grid-template-rows: minmax(0, 1fr) auto;
            gap: 4px;
            opacity: ${eqEnabled() ? 1 : 0.58};
          `}
        >
          <div
            css={`
              min-height: 0;
              display: grid;
              grid-template-columns: repeat(10, minmax(0, 1fr));
              gap: 4px;
              padding: 2px 3px 0;
              border: 1px solid #6c728c;
              background:
                linear-gradient(
                  180deg,
                  rgba(255, 255, 255, 0.2),
                  transparent 18%
                ),
                repeating-linear-gradient(
                  180deg,
                  rgba(255, 255, 255, 0.18) 0 1px,
                  transparent 1px 24px
                );
            `}
          >
            {equalizerBands.map((band, index) => (
              <div
                css={`
                  min-width: 0;
                  display: grid;
                  place-items: center;
                `}
              >
                <input
                  type="range"
                  min={EQ_GAIN_MIN}
                  max={EQ_GAIN_MAX}
                  step={0.5}
                  aria-label={`${band.label} equalizer band`}
                  title={`${band.label} Hz`}
                  prop:value={() => getEqualizerGains()[index] ?? 0}
                  on:input={(event) => {
                    setEqBandGain({
                      index,
                      gain: Number(event.currentTarget.value),
                    })
                  }}
                  css={`
                    width: 14px;
                    height: 102px;
                    margin: 0;
                    writing-mode: vertical-lr;
                    direction: rtl;
                    appearance: none;
                    background: transparent;
                    cursor: pointer;

                    &::-webkit-slider-runnable-track {
                      width: 6px;
                      border: 1px solid #0a0a0a;
                      background: linear-gradient(
                        180deg,
                        #4b4f61 0%,
                        #303446 100%
                      );
                    }

                    &::-webkit-slider-thumb {
                      appearance: none;
                      width: 12px;
                      height: 10px;
                      margin-left: -4px;
                      border: 1px solid var(--skin-border-dark);
                      background: linear-gradient(
                        180deg,
                        #f6d76f 0%,
                        #d7b453 100%
                      );
                      box-shadow:
                        inset 1px 1px 0 #fff3bb,
                        inset -1px -1px 0 #8b6f2e;
                    }

                    &::-moz-range-track {
                      width: 6px;
                      border: 1px solid #0a0a0a;
                      background: linear-gradient(
                        180deg,
                        #4b4f61 0%,
                        #303446 100%
                      );
                    }

                    &::-moz-range-thumb {
                      width: 12px;
                      height: 10px;
                      border: 1px solid var(--skin-border-dark);
                      background: linear-gradient(
                        180deg,
                        #f6d76f 0%,
                        #d7b453 100%
                      );
                      box-shadow:
                        inset 1px 1px 0 #fff3bb,
                        inset -1px -1px 0 #8b6f2e;
                    }
                  `}
                />
              </div>
            ))}
          </div>
          <div
            css={`
              display: grid;
              grid-template-columns: repeat(10, minmax(0, 1fr));
              gap: 4px;
              color: #4a5067;
              font-family: var(--pixel-font);
              font-size: 7px;
              line-height: 1;
              letter-spacing: 0.04em;
              text-transform: uppercase;
              text-align: center;
            `}
          >
            {equalizerBands.map((band) => (
              <span>{band.label}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
