import { presets, spec } from '../../model'
import { t } from '../../translations'
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
        title={t.presets[preset.id].note}
        on:click={() => spec.applyPreset(preset)}
        css={chip}
      >
        {t.presets[preset.id].label}
      </button>
    ))}
    <button
      type="button"
      title={t.controls.resetTitle}
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
      {t.controls.reset}
    </button>
  </div>
)
