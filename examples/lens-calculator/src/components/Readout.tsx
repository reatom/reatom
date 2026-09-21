import { estimate } from '../model'
import { panel } from '../styles'
import { t } from '../translations'
import { MassBar } from './readout/MassBar'
import { Primary, Spec } from './readout/Primary'
import { Reference } from './readout/Reference'

export const Readout = () => (
  <section
    aria-label={t.readout.aria}
    css={`
      ${panel}
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
      gap: 1.5rem 2rem;
      padding: 1.25rem;
      animation: prime-rise 500ms 240ms ease-out backwards;

      @media (max-width: 720px) {
        grid-template-columns: minmax(0, 1fr);
      }
    `}
  >
    <div
      css={`
        display: grid;
        gap: 1.5rem;
        align-content: start;
      `}
    >
      <div
        css={`
          display: grid;
          grid-template-columns: repeat(3, minmax(0, auto));
          gap: 1rem 2rem;
        `}
      >
        <Primary
          name={t.readout.diameter}
          value={() => estimate().barrelDiameter.toFixed(0)}
          unit="mm"
        />
        <Primary
          name={t.readout.length}
          value={() => estimate().length.toFixed(0)}
          unit="mm"
        />
        <Primary
          name={t.readout.mass}
          value={() => Math.round(estimate().mass.total / 5) * 5 + ''}
          unit="g"
        />
      </div>
      <MassBar />
      <Reference />
    </div>

    <div
      css={`
        display: grid;
        align-content: start;
      `}
    >
      <Spec
        name={t.readout.filterThread}
        value={() => {
          const thread = estimate().filterThread
          return thread === null ? t.readout.rearDropIn : `M${thread} × 0.75`
        }}
      />
      <Spec
        name={t.readout.frontElement}
        value={() => `Ø ${estimate().frontElement.toFixed(1)} mm`}
      />
      <Spec
        name={t.readout.entrancePupil}
        value={() => `Ø ${estimate().entrancePupil.toFixed(1)} mm`}
      />
      <Spec
        name={t.readout.irisWideOpen}
        value={() =>
          `Ø ${estimate().stopDiameter.toFixed(1)} mm · ${Math.round(estimate().stopPosition * 100)} %`
        }
      />
      <Spec
        name={t.readout.elementsGroups}
        value={() => `${estimate().elementCount} / ${estimate().groupCount}`}
      />
      <Spec
        name={t.readout.aov}
        value={() => `${estimate().diagonalAovDeg.toFixed(1)}°`}
      />
      <Spec
        name={t.readout.backFocus}
        value={() => `${estimate().backFocus.toFixed(1)} mm`}
      />
      <Spec
        name={t.readout.flange}
        value={() =>
          `${estimate().mount.flange} mm · ${estimate().mount.label}`
        }
      />
      <Spec
        name={t.readout.opticalType}
        value={() => {
          const { kind } = estimate()
          return kind === 'wide'
            ? t.readout.retrofocus
            : kind === 'tele'
              ? t.readout.telephoto
              : t.readout.gauss
        }}
      />
    </div>
  </section>
)
