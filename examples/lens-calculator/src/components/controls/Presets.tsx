import { presets, spec } from '../../model'
import { chip } from './widgets'

export const Presets = () => (
  <div
    css={`
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    `}
  >
    {presets.map((preset) => (
      <button
        type="button"
        title={preset.note}
        on:click={() => spec.applyPreset(preset)}
        css={chip}
      >
        {preset.label}
      </button>
    ))}
    <button
      type="button"
      title="Restore the default 50 / 1.4 full-frame spec"
      prop:disabled={spec.isDefault}
      on:click={() => spec.reset()}
      css={`
        ${chip}
        margin-left: auto;
        color: var(--accent);
        border-color: var(--accent-soft);

        &:hover:not(:disabled) {
          color: var(--accent);
          border-color: var(--accent);
        }
      `}
    >
      Reset
    </button>
  </div>
)
