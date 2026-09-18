import { action } from '@reatom/core'

const HapticPatterns = {
  move: [50],
  win: [100, 50, 100],
  draw: [150],
  invalid: [30, 30, 30],
  reset: [100],
  computerThinking: [10, 100],
} satisfies Record<string, VibratePattern>

export type HapticPattern = keyof typeof HapticPatterns

export const triggerHaptic = action((pattern: HapticPattern) => {
  try {
    navigator.vibrate(HapticPatterns[pattern])
  } catch {
    /* nothing to do */
  }
}, '_triggerHaptic')
