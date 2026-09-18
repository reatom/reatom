import { designation, estimate } from '../../model'
import { mono } from '../../styles'
import { Formula, prose, Section } from './blocks'

export const Notes = () => (
  <>
    <Section index="01" title="The entrance pupil is the real aperture">
      <p css={prose}>
        Photographers write f/1.4. The thing that actually has to fit through
        the barrel is the entrance pupil — the image of the iris as seen from
        the front. Its diameter is focal length over f-number. For the current{' '}
        <span css={mono}>{designation}</span> that is{' '}
        <span css={mono}>
          {() => `Ø ${estimate().entrancePupil.toFixed(1)} mm`}
        </span>
        .
      </p>
      <Formula>D_ep = f / N</Formula>
      <p css={prose}>
        A 50 / 1.4 and a 35 / 1.0 share almost the same pupil. So does a 400 /
        2.8 versus a 200 / 1.4. Speed is cheap on short glass and brutal on long
        glass, which is why super-teles look like artillery and pancake 2.8s do
        not.
      </p>
    </Section>

    <Section index="02" title="Reach, not millimetres, classifies the design">
      <p css={prose}>
        “Wide” and “tele” only make sense relative to the sensor. The model uses
        reach — how many octaves the focal length sits above or below the
        image-circle diameter. Negative reach is retrofocus, near zero is a
        double Gauss, positive is telephoto. A 25 mm on Micro 4/3 is a normal;
        the same glass on full frame is a wide.
      </p>
      <Formula>reach = log₂(f / image circle)</Formula>
      <p css={prose}>
        Almost every shape parameter — pupil depth, stop ratio, front-group
        cliff, telephoto track — is a curve of reach, so the estimate slides
        continuously from a 14 mm to a 400 mm instead of jumping between named
        types.
      </p>
    </Section>

    <Section index="03" title="The front element is a vignetting budget">
      <p css={prose}>
        The corner beam aims at the entrance pupil a few tens of millimetres
        behind the front vertex. By the time it gets there it is already off
        axis, so the front glass must be larger than the pupil or the barrel rim
        clips it. Lower falloff tolerance forces a larger front group. 2 EV is
        typical for production lenses wide open; cinema glass often spends the
        extra diameter to get closer to 0.
      </p>
      <Formula>
        {() => {
          const { halfFieldDeg, pupilDepth, spec } = estimate()
          return `D_front ≥ D_ep + 2 · ${pupilDepth.toFixed(0)} mm · sin(${halfFieldDeg.toFixed(1)}°) · (1 + 0.4(2 − ${spec.vignetting.toFixed(1)}))`
        }}
      </Formula>
      <p css={prose}>
        That is why a fast ultra-wide has a bulbous front and no useful filter
        thread: the field angle is huge, the pupil sits deep, and there is
        nowhere for an M-thread to live without vignetting the corner.
      </p>
    </Section>

    <Section index="04" title="Where the iris sits">
      <p css={prose}>
        The slider centre is where a designer would put the iris for this reach
        — about halfway on a Gauss, further back on a tele, a little forward of
        centre on a retrofocus. Pushing it toward the mount deepens the entrance
        pupil, so the front group grows; pulling it forward makes the rear group
        cover the image circle. Either way the asymmetric layout needs extra
        correction glass.
      </p>
      <p css={prose}>
        Right now the iris is at{' '}
        <span css={mono}>
          {() => `${Math.round(estimate().stopPosition * 100)} %`}
        </span>{' '}
        of the optical track, wide open{' '}
        <span css={mono}>
          {() => `Ø ${estimate().stopDiameter.toFixed(1)} mm`}
        </span>
        . On a long tele the physical iris is much smaller than the entrance
        pupil: the front group already magnified it.
      </p>
    </Section>

    <Section index="05" title="The SLR tax and the telephoto trick">
      <p css={prose}>
        Mirrorless bodies have a short flange and a wide throat — about 18 mm
        and 50 mm on E / Z / RF / L. An SLR keeps a mirror box behind the mount,
        so the flange jumps to 44 mm. A 14 mm SLR lens cannot be 14 mm long: the
        rear vertex would sit inside the swinging mirror. The retrofocus group
        inverts the natural layout and the barrel grows.
      </p>
      <p css={prose}>
        The opposite trick is the telephoto. A 400 mm does not need 400 mm of
        glass; a negative rear group shortens the track to roughly 0.75–1.05 ×
        focal length. That is why the drawing of a super-tele is long but not
        absurd, and why the rear elements suddenly look tiny after the front
        cliff.
      </p>
    </Section>

    <Section index="06" title="Correction is mostly extra glass">
      <p css={prose}>
        Classic is spherical glass and film-era residuals — six or seven
        elements for a 50 / 1.8. Modern adds aspherics and ED and is aimed at 40
        MP sensors. Flagship is GM / Art class: near-zero residuals, 14–21
        elements, and a barrel that has to hold them. The model just multiplies
        a speed-and-field count by 1 / 1.3 / 1.9.
      </p>
      <Formula>
        {() =>
          `elements ≈ (4 + 2·fast + 2.2·wide + 1.5·tele + 4|shift|) · ${estimate().spec.tier === 'classic' ? '1.0' : estimate().spec.tier === 'modern' ? '1.3' : '1.9'}`
        }
      </Formula>
      <p css={prose}>
        More elements are more mass twice: once as glass, again as the shell and
        focus drive that have to move them. Autofocus adds a motor, encoder and
        a couple of millimetres of length; a stabilizer is a floating group —
        about +3 mm diameter and +8 mm length before the extra glass is even
        counted.
      </p>
    </Section>

    <Section index="07" title="Mass is volume, then a shell">
      <p css={prose}>
        Each element is treated as a cylinder of its clear diameter and centre
        thickness, then discounted by a shape factor because real surfaces are
        thinner at the edge. Density is a mid-index crown, about 3.3 g/cm³. The
        barrel is a cylindrical shell of the chosen material — aluminium at 2.7,
        magnesium at 1.8, polycarbonate at 1.25, brass at 8.5 — thickened for
        ribs, helicoids and the focus ring. Mount mass scales with throat area;
        the iris with stop diameter.
      </p>
      <p css={prose}>
        Brass looks “premium” and weighs like a doorstop. Super-teles are
        magnesium for a reason: the shell is huge and the glass already accounts
        for most of the budget. A polycarbonate 50 / 1.8 can be under 200 g; the
        same formula in brass is a paperweight.
      </p>
    </Section>

    <Section index="08" title="What the drawing is, and is not">
      <p css={prose}>
        The blue fan is the axial beam: it fills the entrance pupil and lands on
        the image centre. The amber fan is the corner beam; its dashed chief ray
        goes through the middle of the iris and to the corner of the image
        circle. Neither is a real trace — surfaces do not refract, and the
        element profiles are a plausible collage, not a patent drawing.
      </p>
      <p css={prose}>
        Filter threads jump in ISO steps (M49, M52, M67…). When the front
        element outgrows M112 the model drops the thread and assumes a rear
        drop-in, which is how 400 / 2.8s actually work. The readout starts with
        a short published-envelope hint; Find nearest loads the 2,901-lens
        catalog. Neither is a claim that the estimate equals that datasheet.
      </p>
    </Section>
  </>
)
