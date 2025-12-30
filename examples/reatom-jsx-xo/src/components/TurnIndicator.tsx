import { currentPlayer, isComputerThinking, playWithComputer } from '../model'

export const TurnIndicator = () => {
  return (
    <div
      css={`
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        height: 50px;
        margin: 5px 0;
        padding: 6px 12px;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      `}
    >
      <span
        css={`
          font-size: clamp(0.75rem, 2vmin, 0.875rem);
          font-weight: 600;
          color: #666;
        `}
      >
        {() => (playWithComputer() ? "It's" : 'Turn:')}
      </span>

      <div
        data-player={currentPlayer}
        data-thinking={isComputerThinking}
        css={`
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: clamp(1rem, 3vmin, 1.25rem);
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 8px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: rgba(229, 57, 53, 0.1);
          color: #e53935;
          animation: glow-red 2s ease-in-out infinite;

          &[data-player='O'] {
            background: rgba(30, 136, 229, 0.1);
            color: #1e88e5;
            animation: glow-blue 2s ease-in-out infinite;
          }

          &[data-thinking='true'] {
            animation: thinking-pulse 1s ease-in-out infinite;
          }
        `}
      >
        {() =>
          playWithComputer() && currentPlayer() === 'O'
            ? isComputerThinking()
              ? '🤖 Thinking'
              : '🤖 '
            : ''
        }
        {() =>
          !isComputerThinking() || currentPlayer() !== 'O'
            ? `${currentPlayer()}'s turn`
            : ''
        }
        {() => (isComputerThinking() && currentPlayer() === 'O' ? '...' : '')}
      </div>
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

  @keyframes glow-red {
    0%,
    100% {
      box-shadow: 0 0 10px rgba(229, 57, 53, 0.3);
    }
    50% {
      box-shadow: 0 0 25px rgba(229, 57, 53, 0.5);
    }
  }

  @keyframes glow-blue {
    0%,
    100% {
      box-shadow: 0 0 10px rgba(30, 136, 229, 0.3);
    }
    50% {
      box-shadow: 0 0 25px rgba(30, 136, 229, 0.5);
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
`
