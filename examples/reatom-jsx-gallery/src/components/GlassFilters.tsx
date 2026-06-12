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
  const chromaScale = displacementMap.scale * displacementMap.chroma * 0.35

  return (
    <svg:filter
      id={filterId}
      x="-12%"
      y="-12%"
      width="124%"
      height="124%"
      attr:color-interpolation-filters="sRGB"
    >
      <svg:feImage
        href={displacementMap.href}
        result="displacementMap"
        attr:preserveAspectRatio="none"
      />
      <svg:feDisplacementMap
        in="SourceGraphic"
        in2="displacementMap"
        scale={displacementMap.scale}
        attr:xChannelSelector="R"
        attr:yChannelSelector="G"
        result="refracted"
      />
      <svg:feDisplacementMap
        in="refracted"
        in2="displacementMap"
        scale={chromaScale}
        attr:xChannelSelector="R"
        attr:yChannelSelector="G"
        result="chromaShift"
      />
      <svg:feBlend in="refracted" in2="chromaShift" mode="screen" />
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
