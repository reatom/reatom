import { estimate } from '../model'
import { panel } from '../styles'
import { MassBar } from './readout/MassBar'
import { Primary, Spec } from './readout/Primary'
import { Reference } from './readout/Reference'

export const Readout = () => (
  <section
    aria-label="Estimate"
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
          name="Diameter"
          value={() => estimate().barrelDiameter.toFixed(0)}
          unit="mm"
        />
        <Primary
          name="Length"
          value={() => estimate().length.toFixed(0)}
          unit="mm"
        />
        <Primary
          name="Mass"
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
        name="Filter thread"
        value={() => {
          const thread = estimate().filterThread
          return thread === null ? 'rear drop-in' : `M${thread} × 0.75`
        }}
      />
      <Spec
        name="Front element"
        value={() => `Ø ${estimate().frontElement.toFixed(1)} mm`}
      />
      <Spec
        name="Entrance pupil"
        value={() => `Ø ${estimate().entrancePupil.toFixed(1)} mm`}
      />
      <Spec
        name="Iris wide open"
        value={() =>
          `Ø ${estimate().stopDiameter.toFixed(1)} mm · ${Math.round(estimate().stopPosition * 100)} %`
        }
      />
      <Spec
        name="Elements / groups"
        value={() => `${estimate().elementCount} / ${estimate().groupCount}`}
      />
      <Spec
        name="Diagonal angle of view"
        value={() => `${estimate().diagonalAovDeg.toFixed(1)}°`}
      />
      <Spec
        name="Back focus"
        value={() => `${estimate().backFocus.toFixed(1)} mm`}
      />
      <Spec
        name="Flange distance"
        value={() =>
          `${estimate().mount.flange} mm · ${estimate().mount.label}`
        }
      />
      <Spec
        name="Optical type"
        value={() => {
          const { kind } = estimate()
          return kind === 'wide'
            ? 'retrofocus'
            : kind === 'tele'
              ? 'telephoto'
              : 'double Gauss'
        }}
      />
    </div>
  </section>
)
