import { action, computed } from '@reatom/core'

import { buildBlueprint } from '../layout'
import { estimateLens, findNearestReference, type LensSpec } from '../optics'
import { t } from '../translations'
import {
  autofocus,
  barrel,
  body,
  defaultSpec,
  focal,
  fNumber,
  format,
  nearestStop,
  roundFocal,
  stabilized,
  stopShift,
  tier,
  vignetting,
} from './params'
import { type Preset } from './presets'

export const spec = computed<LensSpec>(
  () => ({
    focal: focal(),
    fNumber: fNumber(),
    vignetting: vignetting(),
    stopShift: stopShift(),
    format: format(),
    body: body(),
    tier: tier(),
    barrel: barrel(),
    autofocus: autofocus(),
    stabilized: stabilized(),
  }),
  'spec',
).extend((target) => {
  const reset = action(() => {
    focal.set(defaultSpec.focal)
    fNumber.set(defaultSpec.fNumber)
    vignetting.set(defaultSpec.vignetting)
    stopShift.set(defaultSpec.stopShift)
    format.reset()
    body.reset()
    tier.reset()
    barrel.reset()
    autofocus.reset()
    stabilized.reset()
  }, `${target.name}.reset`)

  const applyPreset = action((preset: Preset) => {
    reset()
    focal.set(roundFocal(preset.spec.focal))
    fNumber.set(nearestStop(preset.spec.fNumber))
    if (preset.spec.vignetting !== undefined) {
      vignetting.set(preset.spec.vignetting)
    }
    if (preset.spec.stopShift !== undefined) {
      stopShift.set(preset.spec.stopShift)
    }
    if (preset.spec.format !== undefined) format.set(preset.spec.format)
    if (preset.spec.body !== undefined) body.set(preset.spec.body)
    if (preset.spec.tier !== undefined) tier.set(preset.spec.tier)
    if (preset.spec.barrel !== undefined) barrel.set(preset.spec.barrel)
    if (preset.spec.autofocus !== undefined) {
      autofocus.set(preset.spec.autofocus)
    }
    if (preset.spec.stabilized !== undefined) {
      stabilized.set(preset.spec.stabilized)
    }
  }, `${target.name}.applyPreset`)

  return {
    isDefault: computed(
      () =>
        focal() === defaultSpec.focal &&
        fNumber() === defaultSpec.fNumber &&
        vignetting() === defaultSpec.vignetting &&
        stopShift() === defaultSpec.stopShift &&
        format() === defaultSpec.format &&
        body() === defaultSpec.body &&
        tier() === defaultSpec.tier &&
        barrel() === defaultSpec.barrel &&
        autofocus() === defaultSpec.autofocus &&
        stabilized() === defaultSpec.stabilized,
      `${target.name}.isDefault`,
    ),
    reset,
    applyPreset,
  }
})

export const estimate = computed(() => estimateLens(spec()), 'estimate')

export const blueprint = computed(() => buildBlueprint(estimate()), 'blueprint')

export const nearestReference = computed(
  () => findNearestReference(spec()),
  'nearestReference',
)

export const designation = computed(
  () => `${focal()} mm · f/${fNumber()}`,
  'designation',
).extend((target) => ({
  documentTitle: computed(
    () => t.meta.documentTitle(target()),
    `${target.name}.documentTitle`,
  ),
}))
