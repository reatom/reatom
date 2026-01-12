import { resetGame } from '../model'

export const ResetButton = () => {
  return (
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
  )
}
