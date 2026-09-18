import {
  autofocus,
  barrel,
  body,
  format,
  stabilized,
  tier,
} from '../model'
import {
  type Barrel,
  barrels,
  barrelSpecs,
  bodies,
  type Body,
  bodySpecs,
  type Format,
  formats,
  formatSpecs,
  type Tier,
  tiers,
  tierSpecs,
} from '../optics'
import { panel } from '../styles'
import {
  ApertureField,
  FocalField,
  IrisField,
  VignettingField,
} from './controls/fields'
import { Presets } from './controls/Presets'
import { Section, Segmented, Switch } from './controls/widgets'

export const Controls = () => (
  <aside
    aria-label="Lens parameters"
    css={`
      ${panel}
      display: grid;
      align-content: start;
      gap: 1.25rem;
      padding: 1.25rem;
      animation: prime-rise 500ms 80ms ease-out backwards;
    `}
  >
    <Section title="Presets">
      <Presets />
    </Section>

    <Section title="Optics">
      <FocalField />
      <ApertureField />
      <IrisField />
      <VignettingField />
    </Section>

    <Section title="System">
      <Segmented<Format>
        name="Format"
        value={format}
        options={formats}
        render={(option) => formatSpecs[option].label}
      />
      <Segmented<Body>
        name="Body"
        value={body}
        options={bodies}
        render={(option) => bodySpecs[option].label}
      />
      <Segmented<Tier>
        name="Correction"
        value={tier}
        options={tiers}
        render={(option) => tierSpecs[option].label}
      />
    </Section>

    <Section title="Build">
      <Segmented<Barrel>
        name="Barrel"
        value={barrel}
        options={barrels}
        render={(option) => barrelSpecs[option].label}
      />
      <Switch
        name="Autofocus"
        note="motor, encoder and drive electronics"
        checked={autofocus}
      />
      <Switch
        name="Stabilizer"
        note="floating group, +3 mm Ø, +8 mm length"
        checked={stabilized}
      />
    </Section>
  </aside>
)
