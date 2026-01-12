import { abortVar, effect, wrap } from '@reatom/core'

import {
  board,
  currentPlayer,
  isComputerThinking,
  oThinking,
  winner,
  xThinking,
} from '../model'

export const TurnIndicator = () => {
  return (
    <div
      css={`
        display: flex;
        align-items: center;
        justify-content: space-around;
        height: 50px;
        margin: 5px 0;
        padding: 6px 12px;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      `}
    >
      <div
        data-player={currentPlayer}
        data-thinking={isComputerThinking}
        css={`
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: clamp(1rem, 3vmin, 1.25rem);
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 8px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: rgba(229, 57, 53, 0.1);
          color: #e53935;
          box-shadow: 0 2px 8px rgba(229, 57, 53, 0.2);

          &[data-player='O'] {
            background: rgba(30, 136, 229, 0.1);
            color: #1e88e5;
            box-shadow: 0 2px 8px rgba(30, 136, 229, 0.2);
          }

          &[data-thinking='true'] {
            animation: thinking-pulse 1s ease-in-out infinite;
          }
        `}
      >
        <span
          css={`
            width: 1rem;
            display: inline-flex;
            justify-content: center;
          `}
        >
          {() => (isComputerThinking() ? '🤖' : currentPlayer())}
        </span>
        's turn
      </div>
      <div
        ref={(element) => {
          effect(async () => {
            if (!board().some(Boolean)) return

            if (winner() !== 'none') return

            const player = currentPlayer()
            abortVar.subscribe(() => {
              const timePass = Date.now() - start
              if (player === 'X') {
                xThinking.set((state) => state + timePass)
              } else {
                oThinking.set((state) => state + timePass)
              }

              element.innerText = ``
            })

            const start = Date.now()
            while (true) {
              await wrap(new Promise(requestAnimationFrame))
              element.innerText = `Thinking ${((Date.now() - start) / 1000).toFixed(1)}s`
            }
          }, 'TurnIndicator.thinking')
        }}
        css={`
          font-family:
            'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
          width: 12em;
          padding: 8px 16px;
          border-radius: 20px;
          background: linear-gradient(
            135deg,
            rgba(30, 136, 229, 0.1),
            rgba(229, 57, 53, 0.1)
          );
          color: #546e7a;
          font-size: 0.85rem;
          font-weight: 600;
          text-align: center;
          transition: all 0.3s ease;
          border: 1px solid rgba(84, 110, 122, 0.2);
          position: relative;
          overflow: hidden;

          &::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.3),
              transparent
            );
            animation: shimmer 2s infinite;
          }

          &::after {
            content: '...';
            margin-left: 4px;
            animation: dots 1.4s infinite;
            display: inline-block;
            width: 12px;
            text-align: left;
          }
        `}
      ></div>
    </div>
  )
}

export const turnIndicatorStyles = `
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

  @keyframes thinking-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.6;
    }
  }

  @keyframes shimmer {
    0% {
      left: -100%;
    }
    100% {
      left: 100%;
    }
  }

  @keyframes dots {
    0%,
    20% {
      content: '';
    }
    40% {
      content: '.';
    }
    60% {
      content: '..';
    }
    80%,
    100% {
      content: '...';
    }
  }
`
