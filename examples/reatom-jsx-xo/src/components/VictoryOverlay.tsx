import { playWithComputer, resetGame, showWinner, winner } from '../model'

export const VictoryOverlay = () => {
  return (
    <div
      style:display={() => (showWinner() ? 'flex' : 'none')}
      css={`
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(8px);
        z-index: 1000;
        animation: fade-in 0.3s ease-out;
        padding: 10px;
        box-sizing: border-box;
      `}
    >
      <div
        css={`
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          border-radius: 16px;
          text-align: center;
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.3),
            0 0 0 1px rgba(255, 255, 255, 0.1);
          animation: scale-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          max-width: min(90vw, 320px);
          width: 100%;
        `}
      >
        <div
          css={`
            font-size: clamp(2rem, 5vmin, 2.5rem);
            margin-bottom: 8px;
            animation: bounce 0.6s ease-out 0.2s;
          `}
        >
          {() => {
            const w = winner()
            if (w === 'draw') {
              return (
                <div
                  css={`
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 4px;
                  `}
                >
                  <span
                    css={`
                      display: inline-block;
                      animation: hand-shake-left 0.5s ease-out 0.2s;
                    `}
                  >
                    🤜
                  </span>
                  <span
                    css={`
                      display: inline-block;
                      animation: hand-shake-right 0.5s ease-out 0.2s;
                    `}
                  >
                    🤛
                  </span>
                </div>
              )
            }
            return '🏆'
          }}
        </div>

        <h2
          css={`
            font-size: clamp(1.25rem, 4vmin, 1.75rem);
            font-weight: 800;
            color: white;
            margin-bottom: 16px;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            animation: fade-in-up 0.4s ease-out 0.1s;
          `}
        >
          {() => {
            const w = winner()
            if (w === 'draw') return "It's a Draw! 🤝"
            return `${playWithComputer() ? '🤖' : `Player ${w}`} Wins! 🎉`
          }}
        </h2>

        <button
          on:click={() => resetGame()}
          css={`
            padding: clamp(12px, 3vmin, 16px) clamp(24px, 6vmin, 48px);
            font-size: clamp(1rem, 3vmin, 1.25rem);
            font-weight: 700;
            color: #667eea;
            background: white;
            border: none;
            border-radius: clamp(8px, 2vmin, 12px);
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            animation: fade-in-up 0.4s ease-out 0.2s;

            &:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
            }

            &:active {
              transform: translateY(0);
            }
          `}
        >
          Play Again 🚀
        </button>

        {/* Confetti particles or draw animation */}
        <div
          css={`
            position: absolute;
            inset: -50px;
            pointer-events: none;
            overflow: hidden;
          `}
        >
          {() => {
            const isDraw = winner() === 'draw'
            // Draw animation - peaceful floating hearts
            return Array.from({ length: 12 }).map(() => (
              <div
                css:animation-delay={`${Math.random() * 2}s`}
                css:animation-duration={`${3 + Math.random() * 2}s`}
                css:left={`${Math.random() * 100}%`}
                css:font-size={`${8 + Math.random() * 12}px`}
                css={`
                  position: absolute;
                  animation: confetti var(--animation-duration) ease-in-out
                    infinite;
                  animation-delay: var(--animation-delay);
                  top: 100%;
                  left: var(--left);
                  font-size: var(--font-size);
                  opacity: 0;
                `}
              >
                {isDraw ? '🤗' : '🎉'}
              </div>
            ))
          }}
        </div>
      </div>
    </div>
  )
}

export const victoryOverlayStyles = `
  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes scale-in {
    from {
      transform: scale(0.8);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes fade-in-up {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes bounce {
    0% {
      transform: scale(0) rotate(-180deg);
    }
    50% {
      transform: scale(1.3) rotate(10deg);
    }
    100% {
      transform: scale(1) rotate(0deg);
    }
  }

  @keyframes confetti-fall {
    0% {
      transform: translateY(0) rotate(0deg);
      opacity: 1;
    }
    100% {
      transform: translateY(500px) rotate(720deg);
      opacity: 0;
    }
  }

  @keyframes hand-shake-left {
    0% {
      transform: translateX(-30px) rotate(-45deg);
    }
    50% {
      transform: translateX(10px) rotate(15deg);
    }
    100% {
      transform: translateX(0) rotate(0deg);
    }
  }

  @keyframes hand-shake-right {
    0% {
      transform: translateX(30px) rotate(45deg);
    }
    50% {
      transform: translateX(-10px) rotate(-15deg);
    }
    100% {
      transform: translateX(0) rotate(0deg);
    }
  }

  @keyframes confetti {
    0% {
      transform: translateY(0) rotate(0deg) scale(0.5);
      opacity: 0;
    }
    10% {
      opacity: 1;
    }
    50% {
      transform: translateY(-200px) rotate(180deg) scale(1);
    }
    90% {
      opacity: 1;
    }
    100% {
      transform: translateY(-400px) rotate(360deg) scale(0.5);
      opacity: 0;
    }
  }
`
