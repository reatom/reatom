import { designation, estimate } from '../../model'
import { mono } from '../../styles'
import { t } from '../../translations'
import { Formula, prose, Section } from './blocks'

export const Notes = () => (
  <>
    <Section index={t.envelope.pupil.index} title={t.envelope.pupil.title}>
      <p css={prose}>
        {t.envelope.pupil.p1Before}
        <span css={mono}>{designation}</span>
        {t.envelope.pupil.p1Mid}
        <span css={mono}>
          {() => `Ø ${estimate().entrancePupil.toFixed(1)} mm`}
        </span>
        {t.envelope.pupil.p1After}
      </p>
      <Formula>D_ep = f / N</Formula>
      <p css={prose}>{t.envelope.pupil.p2}</p>
    </Section>

    <Section index={t.envelope.reach.index} title={t.envelope.reach.title}>
      <p css={prose}>{t.envelope.reach.p1}</p>
      <Formula>reach = log₂(f / image circle)</Formula>
      <p css={prose}>{t.envelope.reach.p2}</p>
    </Section>

    <Section index={t.envelope.front.index} title={t.envelope.front.title}>
      <p css={prose}>{t.envelope.front.p1}</p>
      <Formula>
        {() => {
          const { halfFieldDeg, pupilDepth, spec } = estimate()
          return `D_front ≥ D_ep + 2 · ${pupilDepth.toFixed(0)} mm · sin(${halfFieldDeg.toFixed(1)}°) · (1 + 0.4(2 − ${spec.vignetting.toFixed(1)}))`
        }}
      </Formula>
      <p css={prose}>{t.envelope.front.p2}</p>
    </Section>

    <Section index={t.envelope.iris.index} title={t.envelope.iris.title}>
      <p css={prose}>{t.envelope.iris.p1}</p>
      <p css={prose}>
        {t.envelope.iris.p2Before}
        <span css={mono}>
          {() => `${Math.round(estimate().stopPosition * 100)} %`}
        </span>
        {t.envelope.iris.p2Mid}
        <span css={mono}>
          {() => `Ø ${estimate().stopDiameter.toFixed(1)} mm`}
        </span>
        {t.envelope.iris.p2After}
      </p>
    </Section>

    <Section index={t.envelope.slr.index} title={t.envelope.slr.title}>
      <p css={prose}>{t.envelope.slr.p1}</p>
      <p css={prose}>{t.envelope.slr.p2}</p>
    </Section>

    <Section
      index={t.envelope.correction.index}
      title={t.envelope.correction.title}
    >
      <p css={prose}>{t.envelope.correction.p1}</p>
      <Formula>
        {() =>
          `elements ≈ (4 + 2·fast + 2.2·wide + 1.5·tele + 4|shift|) · ${estimate().spec.tier === 'classic' ? '1.0' : estimate().spec.tier === 'modern' ? '1.3' : '1.9'}`
        }
      </Formula>
      <p css={prose}>{t.envelope.correction.p2}</p>
    </Section>

    <Section index={t.envelope.mass.index} title={t.envelope.mass.title}>
      <p css={prose}>{t.envelope.mass.p1}</p>
      <p css={prose}>{t.envelope.mass.p2}</p>
    </Section>

    <Section index={t.envelope.drawing.index} title={t.envelope.drawing.title}>
      <p css={prose}>{t.envelope.drawing.p1}</p>
      <p css={prose}>{t.envelope.drawing.p2}</p>
    </Section>
  </>
)
