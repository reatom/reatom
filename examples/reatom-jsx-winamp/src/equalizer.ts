import type { GenericExt } from '@reatom/core'
import { action, atom, computed, withIndexedDb } from '@reatom/core'

const idb: GenericExt = (target) =>
  target.extend(withIndexedDb({ key: target.name, version: 1 }))

export const EQ_GAIN_MIN = -12

export const EQ_GAIN_MAX = 12

export type EqualizerBand = {
  frequency: number
  label: string
  type: BiquadFilterType
  q: number
}

export type EqualizerPreset = {
  id: string
  label: string
  gains: readonly number[]
}

export const equalizerBands = [
  { frequency: 60, label: '60', type: 'lowshelf', q: 0.8 },
  { frequency: 170, label: '170', type: 'peaking', q: 1.1 },
  { frequency: 310, label: '310', type: 'peaking', q: 1.1 },
  { frequency: 600, label: '600', type: 'peaking', q: 1.1 },
  { frequency: 1000, label: '1K', type: 'peaking', q: 1.1 },
  { frequency: 3000, label: '3K', type: 'peaking', q: 1.1 },
  { frequency: 6000, label: '6K', type: 'peaking', q: 1.1 },
  { frequency: 12000, label: '12K', type: 'peaking', q: 1.1 },
  { frequency: 14000, label: '14K', type: 'peaking', q: 1.1 },
  { frequency: 16000, label: '16K', type: 'highshelf', q: 0.8 },
] as const satisfies readonly EqualizerBand[]

export const defaultEqualizerGains = equalizerBands.map(() => 0)

export const equalizerPresets = [
  { id: 'flat', label: 'Flat', gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { id: 'classical', label: 'Classical', gains: [0, 0, 0, 0, 0, 0, -6, -6, -6, -8] },
  { id: 'club', label: 'Club', gains: [0, 0, 8, 6, 6, 6, 4, 0, 0, 0] },
  { id: 'dance', label: 'Dance', gains: [8, 6, 2, 0, 0, -4, -6, -6, 0, 0] },
  {
    id: 'full-bass',
    label: 'Full Bass',
    gains: [8, 8, 8, 4, 0, -4, -8, -10, -10, -10],
  },
  {
    id: 'full-bass-treble',
    label: 'Bass & Treble',
    gains: [6, 5, 0, -6, -4, 1, 7, 9, 10, 10],
  },
  {
    id: 'full-treble',
    label: 'Full Treble',
    gains: [-8, -8, -8, -4, 2, 8, 11, 11, 11, 12],
  },
  {
    id: 'laptop',
    label: 'Laptop',
    gains: [-4, 0, 4, 6, 2, -4, -2, 0, 4, 6],
  },
  {
    id: 'large-hall',
    label: 'Large Hall',
    gains: [10, 10, 6, 6, 0, -4, -4, -4, 0, 0],
  },
  { id: 'live', label: 'Live', gains: [-4, 0, 4, 6, 6, 6, 4, 2, 2, 2] },
  { id: 'party', label: 'Party', gains: [6, 6, 0, 0, 0, 0, 6, 6, 6, 6] },
  { id: 'pop', label: 'Pop', gains: [-2, 4, 6, 6, 4, 0, -2, -2, -2, -2] },
  { id: 'reggae', label: 'Reggae', gains: [0, 0, 0, -4, 0, 4, 6, 6, 0, 0] },
  { id: 'rock', label: 'Rock', gains: [8, 4, -4, -8, -2, 4, 8, 10, 10, 10] },
  { id: 'ska', label: 'Ska', gains: [-2, -4, -4, 0, 4, 6, 8, 10, 10, 10] },
  { id: 'soft', label: 'Soft', gains: [-4, -2, 0, 4, 6, 8, 10, 11, 10, 10] },
  {
    id: 'soft-rock',
    label: 'Soft Rock',
    gains: [4, 2, 0, -2, 0, 4, 8, 10, 12, 12],
  },
  { id: 'techno', label: 'Techno', gains: [8, 6, 0, -6, -4, 0, 8, 10, 10, 10] },
] as const satisfies readonly EqualizerPreset[]

export const eqEnabled = atom(true, 'eqEnabled').extend(idb)

export const eqBandGains = atom<number[]>(
  defaultEqualizerGains.slice(),
  'eqBandGains',
).extend(idb)

function clampGain(value: number) {
  return Math.min(EQ_GAIN_MAX, Math.max(EQ_GAIN_MIN, value))
}

function gainsMatch(left: readonly number[], right: readonly number[]) {
  return left.every((gain, index) => Math.abs(gain - (right[index] ?? 0)) < 0.001)
}

export function getEqualizerGains() {
  const gains = eqBandGains()
  return equalizerBands.map((_, index) => {
    const gain = gains[index]
    return typeof gain === 'number' && Number.isFinite(gain) ? clampGain(gain) : 0
  })
}

export const activeEqPresetId = computed(() => {
  const gains = getEqualizerGains()
  const preset = equalizerPresets.find(({ gains: presetGains }) =>
    gainsMatch(gains, presetGains),
  )

  return preset?.id ?? 'custom'
}, 'activeEqPresetId')

export const activeEqPresetLabel = computed(() => {
  const activeId = activeEqPresetId()
  const preset = equalizerPresets.find(({ id }) => id === activeId)
  return preset?.label ?? 'Custom'
}, 'activeEqPresetLabel')

export const setEqBandGain = action(
  (payload: { index: number; gain: number }) => {
    const { index, gain } = payload
    if (index < 0 || index >= equalizerBands.length) {
      return
    }

    const nextGains = getEqualizerGains()
    nextGains[index] = clampGain(gain)
    eqBandGains.set(nextGains)
  },
  'setEqBandGain',
)

export const applyEqPreset = action((presetId: string) => {
  const preset = equalizerPresets.find(({ id }) => id === presetId)
  if (!preset) {
    return
  }

  eqEnabled.set(true)
  eqBandGains.set(preset.gains.slice())
}, 'applyEqPreset')

export const resetEqBandGains = action(() => {
  eqBandGains.set(defaultEqualizerGains.slice())
}, 'resetEqBandGains')

export const toggleEq = action(() => {
  eqEnabled.set(!eqEnabled())
}, 'toggleEq')
