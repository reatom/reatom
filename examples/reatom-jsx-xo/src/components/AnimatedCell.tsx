import { computed } from '@reatom/core'

import { board, isComputerThinking, makeMove, winner } from '../model'

const cellLabels = [
  'Top left cell',
  'Top center cell',
  'Top right cell',
  'Middle left cell',
  'Center cell',
  'Middle right cell',
  'Bottom left cell',
  'Bottom center cell',
  'Bottom right cell',
] as const

export const AnimatedCell = ({ index }: { index: number }) => {
  const isWinningCell = computed(() => {
    const w = winner()
    if (w === 'none' || w === 'draw') return false

    const b = board()
    const winningCombinations = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ]

    return winningCombinations.some(
      (combo) => combo.includes(index) && combo.every((i) => b[i] === w),
    )
  })
  const cellLabel = cellLabels[index] ?? `Cell ${index + 1}`

  return (
    <button
      aria-label={cellLabel}
      on:click={() => makeMove(index)}
      prop:disabled={() => board()[index] !== null || winner() !== 'none'}
      data-winning={isWinningCell}
      data-thinking={isComputerThinking}
      css={`
        width: 100%;
        height: 100%;
        padding: 0;
        aspect-ratio: 1;
        border-radius: clamp(8px, 2.5vmin, 16px);
        border: none;
        background: rgba(255, 255, 255, 0.9);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow:
          0 4px 6px rgba(0, 0, 0, 0.07),
          0 1px 3px rgba(0, 0, 0, 0.1);
        position: relative;
        overflow: hidden;

        &:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.02);
          box-shadow:
            0 12px 20px rgba(0, 0, 0, 0.1),
            0 4px 8px rgba(0, 0, 0, 0.06);
        }

        &:disabled {
          cursor: not-allowed;
        }

        &[data-winning='true'] {
          background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
          animation: winner-pulse 1s ease-in-out infinite;
          box-shadow:
            0 0 20px rgba(251, 160, 133, 0.5),
            0 8px 16px rgba(251, 160, 133, 0.3);
        }

        &[data-thinking='true'] {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
        }
      `}
    >
      <div
        class="mark"
        data-value={() => board()[index] ?? ''}
        css={`
          position: relative;
          width: 60%;
          height: 60%;
          animation: pop-in 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);

          /* Hide mark when cell is empty */
          &[data-value=''] {
            display: none;
          }

          /* O styling */
          &[data-value='O'] {
            width: 55%;
            height: 55%;
            aspect-ratio: 1;
            border: clamp(4px, 1.5vmin, 8px) solid #1e88e5;
            border-radius: 50%;
            animation:
              pop-in 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55),
              draw-o 0.4s ease-out forwards;
          }

          /* X styling */
          &[data-value='X'] {
            width: 70%;
            height: 70%;

            &::before,
            &::after {
              content: '';
              position: absolute;
              width: 100%;
              height: clamp(4px, 1.5vmin, 8px);
              background: #e53935;
              border-radius: clamp(2px, 0.5vmin, 4px);
              top: 50%;
              left: 50%;
              transform-origin: center;
              opacity: 0;
            }

            &::before {
              --rotation: 45deg;
              transform: translate(-50%, -50%) rotate(var(--rotation)) scaleX(0);
              animation: draw-x 0.25s ease-out forwards;
              animation-delay: 0.1s;
            }

            &::after {
              --rotation: -45deg;
              transform: translate(-50%, -50%) rotate(var(--rotation)) scaleX(0);
              animation: draw-x 0.25s ease-out forwards;
              animation-delay: 0.2s;
            }
          }
        `}
      />
    </button>
  )
}

export const cellStyles = `
  @keyframes pop-in {
    0% {
      transform: scale(0) rotate(-180deg);
      opacity: 0;
    }
    50% {
      transform: scale(1.2) rotate(10deg);
    }
    100% {
      transform: scale(1) rotate(0deg);
      opacity: 1;
    }
  }

  @keyframes draw-o {
    from {
      opacity: 0;
      transform: scale(0);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes draw-x {
    from {
      opacity: 0;
      transform: translate(-50%, -50%) rotate(var(--rotation)) scaleX(0);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) rotate(var(--rotation)) scaleX(1);
    }
  }

  @keyframes winner-pulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }
`
