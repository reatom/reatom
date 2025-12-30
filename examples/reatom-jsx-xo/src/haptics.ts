import { action } from '@reatom/core'

// Haptic feedback patterns
const HapticPatterns = {
  move: [50], // Short tap for placing a piece
  win: [100, 50, 100], // Double tap for victory
  draw: [150], // Longer vibration for draw
  invalid: [30, 30, 30], // Triple short tap for invalid move
  reset: [100], // Medium tap for game reset
  computerThinking: [10, 100], // Very short + pause while computer thinks
} as const

export type HapticPattern = keyof typeof HapticPatterns

export const triggerHaptic = action((pattern: HapticPattern) => {
  // if (typeof navigator == 'undefined' || !('vibrate' in navigator)) return

  try {
    navigator.vibrate(HapticPatterns[pattern])
  } catch {
    // Vibration API might throw in some contexts (e.g., iframe)
    // Silently fail rather than break the gameÏ
  }
}, '_triggerHaptic')
