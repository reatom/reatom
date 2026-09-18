import { estimate, focal, fNumber, stopShift, vignetting } from '../../model'
import {
  apertureStops,
  FOCAL_MAX,
  FOCAL_MIN,
  STOP_SHIFT_MAX,
  STOP_SHIFT_MIN,
  VIGNETTING_MAX,
  VIGNETTING_MIN,
} from '../../optics'
import { mono, numberInput, rangeInput } from '../../styles'
import { FieldHead } from './widgets'

export const FocalField = () => (
  <label
    css={`
      display: grid;
      gap: 0.35rem;
    `}
  >
    <FieldHead name="Focal length" value={() => `${focal()} mm`} />
    <div
      css={`
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 0.75rem;
      `}
    >
      <input
        type="range"
        attr:min={0}
        attr:max={1000}
        attr:step={1}
        prop:value={() => String(focal.sliderPosition())}
        on:input={(event) =>
          focal.fromSlider(event.currentTarget.valueAsNumber)
        }
        css={rangeInput}
      />
      <input
        type="number"
        attr:min={FOCAL_MIN}
        attr:max={FOCAL_MAX}
        attr:step={1}
        prop:value={() => String(focal())}
        on:change={(event) => focal.fromInput(event.currentTarget.valueAsNumber)}
        css={numberInput}
      />
    </div>
  </label>
)

export const ApertureField = () => (
  <label
    css={`
      display: grid;
      gap: 0.35rem;
    `}
  >
    <FieldHead name="Max aperture" value={() => `f/${fNumber()}`} />
    <input
      type="range"
      attr:min={0}
      attr:max={apertureStops.length - 1}
      attr:step={1}
      prop:value={() => String(fNumber.apertureIndex())}
      on:input={(event) => fNumber.fromIndex(event.currentTarget.valueAsNumber)}
      css={rangeInput}
    />
    <div
      css={`
        ${mono}
        display: flex;
        justify-content: space-between;
        font-size: 0.5625rem;
        color: var(--ink-faint);
      `}
    >
      {apertureStops.map((stop) => (
        <span>{stop}</span>
      ))}
    </div>
  </label>
)

export const IrisField = () => (
  <label
    css={`
      display: grid;
      gap: 0.35rem;
    `}
  >
    <FieldHead
      name="Iris position"
      value={() => {
        const { stopPosition, designStopPosition } = estimate()
        const percent = `${Math.round(stopPosition * 100)} % of track`
        return stopPosition === designStopPosition
          ? `${percent} · design`
          : percent
      }}
    />
    <input
      type="range"
      attr:min={STOP_SHIFT_MIN}
      attr:max={STOP_SHIFT_MAX}
      attr:step={0.05}
      prop:value={() => String(stopShift())}
      on:input={(event) => stopShift.fromInput(event.currentTarget.valueAsNumber)}
      css={rangeInput}
    />
    <div
      css={`
        ${mono}
        display: flex;
        justify-content: space-between;
        font-size: 0.5625rem;
        color: var(--ink-faint);
      `}
    >
      <span>toward front</span>
      <span>design</span>
      <span>toward mount</span>
    </div>
  </label>
)

export const VignettingField = () => (
  <label
    css={`
      display: grid;
      gap: 0.35rem;
    `}
  >
    <FieldHead
      name="Corner falloff wide open"
      value={() => `${vignetting().toFixed(1)} EV`}
    />
    <input
      type="range"
      attr:min={VIGNETTING_MIN}
      attr:max={VIGNETTING_MAX}
      attr:step={0.5}
      prop:value={() => String(vignetting())}
      on:input={(event) => vignetting.fromInput(event.currentTarget.valueAsNumber)}
      css={rangeInput}
    />
  </label>
)
