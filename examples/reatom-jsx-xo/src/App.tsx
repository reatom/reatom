import { AnimatedCell, cellStyles } from './components/AnimatedCell'
import { ScoreBoard } from './components/ScoreBoard'
import { TurnIndicator, turnIndicatorStyles } from './components/TurnIndicator'
import {
  VictoryOverlay,
  victoryOverlayStyles,
} from './components/VictoryOverlay'
import { playWithComputer, resetGame } from './model'

export const App = () => {
  return (
    <>
      <style>{`body {margin: 0;}`}</style>
      <style>{cellStyles}</style>
      <style>{turnIndicatorStyles}</style>
      <style>{victoryOverlayStyles}</style>

      <main
        css={`
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100dvh;
          width: 100%;
          font-family:
            system-ui,
            -apple-system,
            'Segoe UI',
            Roboto,
            sans-serif;
          background: linear-gradient(
            135deg,
            #667eea 0%,
            #764ba2 50%,
            #f64f59 100%
          );
          background-size: 200% 200%;
          animation: gradient-shift 15s ease infinite;
          padding: 10px;
          box-sizing: border-box;
          overflow: hidden;
          display: grid;
          place-items: center;
        `}
      >
        <div
          css={`
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            padding: 12px;
            border-radius: 16px;
            box-shadow:
              0 20px 60px rgba(0, 0, 0, 0.3),
              0 0 0 1px rgba(255, 255, 255, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.3);
            animation: fade-in-scale 0.6s ease-out;
            width: min(90vw, 500px);
            display: flex;
            flex-direction: column;
            gap: 10px;
          `}
        >
          {/* Header */}
          <h1
            css={`
              text-align: center;
              margin: 0;
              font-size: clamp(1.25rem, 4vmin, 1.75rem);
              line-height: 1.2;
              font-weight: 900;
              background: linear-gradient(135deg, #fff 0%, #f0f0f0 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              text-shadow: 0 2px 20px rgba(255, 255, 255, 0.2);
              letter-spacing: -1px;
            `}
          >
            ✨ Tic-Tac-Toe ✨
          </h1>

          {/* Game Mode Toggle */}
          <div
            css={`
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              padding: 10px;
              background: rgba(255, 255, 255, 0.2);
              border-radius: 8px;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

              &:hover {
                background: rgba(255, 255, 255, 0.25);
              }
            `}
          >
            <label
              css={`
                display: flex;
                align-items: center;
                gap: 6px;
                cursor: pointer;
                font-size: clamp(0.75rem, 2vmin, 0.875rem);
                font-weight: 600;
                color: white;
                user-select: none;
              `}
            >
              <div
                data-active={playWithComputer}
                css={`
                  position: relative;
                  width: 40px;
                  height: 22px;
                  background: rgba(0, 0, 0, 0.3);
                  border-radius: 11px;
                  transition: background 0.3s;
                  flex-shrink: 0;

                  &[data-active='true'] {
                    background: linear-gradient(
                      135deg,
                      #f64f59 0%,
                      #c471ed 100%
                    );
                  }
                `}
              >
                <div
                  style:transform={() =>
                    playWithComputer() ? 'translateX(18px)' : 'translateX(0)'
                  }
                  css={`
                    position: absolute;
                    top: 2px;
                    left: 2px;
                    width: 18px;
                    height: 18px;
                    background: white;
                    border-radius: 50%;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                    transition: transform 0.3s
                      cubic-bezier(0.68, -0.55, 0.265, 1.55);
                  `}
                />
              </div>
              <span>
                {() => (playWithComputer() ? '🤖 vs AI' : '👥 2 Players')}
              </span>
              <input
                type="checkbox"
                model:checked={playWithComputer}
                css={`
                  position: absolute;
                  opacity: 0;
                  width: 0;
                  height: 0;
                `}
              />
            </label>
          </div>

          {/* Score Board */}
          <ScoreBoard />

          {/* Turn Indicator */}
          <TurnIndicator />

          {/* Game Board */}
          <div
            css={`
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 12px;
              box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.1);
              aspect-ratio: 1;
              width: 100%;
            `}
          >
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
              <AnimatedCell index={index} />
            ))}
          </div>

          {/* Reset Button */}
          <button
            on:click={() => resetGame()}
            css={`
              width: 100%;
              margin: 5px 0;
              padding: 10px;
              font-size: clamp(0.8125rem, 2.25vmin, 0.9375rem);
              font-weight: 700;
              color: white;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border: none;
              border-radius: 8px;
              cursor: pointer;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              box-shadow:
                0 4px 12px rgba(0, 0, 0, 0.2),
                0 0 0 1px rgba(255, 255, 255, 0.1);
              text-transform: uppercase;
              letter-spacing: 1px;
              position: relative;
              overflow: hidden;

              &::before {
                content: '';
                position: absolute;
                inset: 0;
                background: linear-gradient(
                  135deg,
                  rgba(255, 255, 255, 0.2) 0%,
                  transparent 100%
                );
                opacity: 0;
                transition: opacity 0.3s;
              }

              &:hover {
                transform: translateY(-1px);
                box-shadow:
                  0 6px 16px rgba(0, 0, 0, 0.3),
                  0 0 0 1px rgba(255, 255, 255, 0.2);

                &::before {
                  opacity: 1;
                }
              }

              &:active {
                transform: translateY(0);
              }
            `}
          >
            🔄 New Game
          </button>

          {/* Footer */}
          <div
            css={`
              color: rgba(255, 255, 255, 0.7);
              font-size: clamp(0.625rem, 1.5vmin, 0.6875rem);
              text-align: center;
              animation: fade-in 0.6s ease-out 0.4s both;
              padding-bottom: 2px;
              line-height: 1;
            `}
          >
            Made with 💜 using Reatom
          </div>
        </div>
      </main>

      {/* Victory Overlay */}
      <VictoryOverlay />

      <style>{`
        @keyframes gradient-shift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        @keyframes fade-in-scale {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </>
  )
}
