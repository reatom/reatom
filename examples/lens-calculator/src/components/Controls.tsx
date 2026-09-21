import { autofocus, barrel, body, format, stabilized, tier } from '../model'
import {
  type Barrel,
  barrels,
  type Body,
  bodies,
  type Format,
  formats,
  type Tier,
  tiers,
} from '../optics'
import { panel } from '../styles'
import { t } from '../translations'
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
    aria-label={t.controls.aria}
    css={`
      ${panel}
      min-width: 0;
      display: grid;
      align-content: start;
      gap: 1.25rem;
      padding: 1.25rem;
      animation: prime-rise 500ms 80ms ease-out backwards;
    `}
  >
    <Section title={t.controls.presets}>
      <Presets />
    </Section>

    <Section title={t.controls.optics}>
      <FocalField />
      <ApertureField />
      <IrisField />
      <VignettingField />
    </Section>

    <Section title={t.controls.system}>
      <Segmented<Format>
        name={t.controls.format}
        value={format}
        options={formats}
        render={(option) => t.format[option]}
      />
      <Segmented<Body>
        name={t.controls.body}
        value={body}
        options={bodies}
        render={(option) => t.body[option]}
      />
      <Segmented<Tier>
        name={t.controls.correction}
        value={tier}
        options={tiers}
        render={(option) => t.tier[option]}
      />
    </Section>

    <Section title={t.controls.build}>
      <Segmented<Barrel>
        name={t.controls.barrel}
        value={barrel}
        options={barrels}
        render={(option) => t.barrel[option]}
      />
      <Switch
        name={t.controls.autofocus}
        note={t.controls.autofocusNote}
        checked={autofocus}
      />
      <Switch
        name={t.controls.stabilizer}
        note={t.controls.stabilizerNote}
        checked={stabilized}
      />
    </Section>
  </aside>
)
