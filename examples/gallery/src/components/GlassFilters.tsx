import {
  getGlassFilterId,
  getPresetDisplacementMap,
  GLASS_LENS_PRESETS,
  type GlassLensPreset,
} from '../glass'

const GLASS_FILTER_PRESETS = Object.keys(
  GLASS_LENS_PRESETS,
) as GlassLensPreset[]

const GlassFilter = ({ preset }: { preset: GlassLensPreset }) => {
  const displacementMap = getPresetDisplacementMap(preset)
  const filterId = getGlassFilterId(preset)
  const chromaSpread = displacementMap.scale * displacementMap.chroma * 0.35
  const redScale = displacementMap.scale + chromaSpread
  const greenScale = displacementMap.scale
  const blueScale = displacementMap.scale - chromaSpread

  return (
    <svg:filter
      id={filterId}
      x={0}
      y={0}
      width={1}
      height={1}
      filterUnits="objectBoundingBox"
      attr:color-interpolation-filters="sRGB"
    >
      <svg:feImage
        href={displacementMap.href}
        result="displacementMap"
        preserveAspectRatio="none"
      />
      <svg:feDisplacementMap
        in="SourceGraphic"
        in2="displacementMap"
        scale={redScale}
        xChannelSelector="R"
        yChannelSelector="G"
        result="redDisplaced"
      />
      <svg:feColorMatrix
        in="redDisplaced"
        type="matrix"
        values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0 1"
        result="redChannel"
      />
      <svg:feDisplacementMap
        in="SourceGraphic"
        in2="displacementMap"
        scale={greenScale}
        xChannelSelector="R"
        yChannelSelector="G"
        result="greenDisplaced"
      />
      <svg:feColorMatrix
        in="greenDisplaced"
        type="matrix"
        values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 0 1"
        result="greenChannel"
      />
      <svg:feDisplacementMap
        in="SourceGraphic"
        in2="displacementMap"
        scale={blueScale}
        xChannelSelector="R"
        yChannelSelector="G"
        result="blueDisplaced"
      />
      <svg:feColorMatrix
        in="blueDisplaced"
        type="matrix"
        values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 0 1"
        result="blueChannel"
      />
      <svg:feComposite
        in="redChannel"
        in2="greenChannel"
        operator="arithmetic"
        k2={1}
        k3={1}
        result="redGreen"
      />
      <svg:feComposite
        in="redGreen"
        in2="blueChannel"
        operator="arithmetic"
        k2={1}
        k3={1}
        result="rgbDisplaced"
      />
      <svg:feComposite in="rgbDisplaced" in2="SourceAlpha" operator="in" />
    </svg:filter>
  )
}

export const GlassFilters = () => (
  <svg:svg
    aria-hidden="true"
    css={`
      position: absolute;
      width: 0;
      height: 0;
      overflow: hidden;
      pointer-events: none;
    `}
  >
    <svg:defs>
      {GLASS_FILTER_PRESETS.map((preset) => (
        <GlassFilter preset={preset} />
      ))}
    </svg:defs>
  </svg:svg>
)
