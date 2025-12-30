import { computed } from '@reatom/core'

import { currentPlayer, draws, oWins, xWins } from '../model'

export const ScoreBoard = () => {
  const current = computed(() => currentPlayer())

  return (
    <div
      css={`
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 4px;
        margin: 5px 0;
        height: 64px;
      `}
    >
      <div
        data-active={() => current() === 'X'}
        css={`
          background: rgba(255, 255, 255, 0.95);
          border-radius: 8px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 2px solid transparent;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;

          &:not([data-active='true']) {
            opacity: 0.7;
            transform: scale(0.9);
          }

          &[data-active='true'] {
            border-color: #e53935;
            transform: scale(1.05);
            box-shadow: 0 8px 20px rgba(229, 57, 53, 0.3);
            opacity: 1;
          }
        `}
      >
        <div
          css={`
            font-size: clamp(1rem, 3vmin, 1.25rem);
            font-weight: bold;
            color: #e53935;
            line-height: 1;
            margin-bottom: 2px;
          `}
        >
          X
        </div>
        <div
          css={`
            font-size: clamp(1.25rem, 3.5vmin, 1.5rem);
            font-weight: 800;
            color: #333;
            line-height: 1;
          `}
        >
          {xWins}
        </div>
      </div>

      <div
        css={`
          background: rgba(255, 255, 255, 0.95);
          border-radius: 8px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 2px solid transparent;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          opacity: 0.7;
          transform: scale(0.9);
        `}
      >
        <div
          css={`
            font-size: clamp(1rem, 3vmin, 1.25rem);
            font-weight: bold;
            color: #757575;
            line-height: 1;
            margin-bottom: 2px;
          `}
        >
          =
        </div>
        <div
          css={`
            font-size: clamp(1.25rem, 3.5vmin, 1.5rem);
            font-weight: 800;
            color: #333;
            line-height: 1;
          `}
        >
          {draws}
        </div>
      </div>

      <div
        data-active={() => current() === 'O'}
        css={`
          background: rgba(255, 255, 255, 0.95);
          border-radius: 8px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 2px solid transparent;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;

          &:not([data-active='true']) {
            opacity: 0.7;
            transform: scale(0.9);
          }

          &[data-active='true'] {
            border-color: #1e88e5;
            transform: scale(1.05);
            box-shadow: 0 8px 20px rgba(30, 136, 229, 0.3);
            opacity: 1;
          }
        `}
      >
        <div
          css={`
            font-size: clamp(1rem, 3vmin, 1.25rem);
            font-weight: bold;
            color: #1e88e5;
            line-height: 1;
            margin-bottom: 2px;
          `}
        >
          O
        </div>
        <div
          css={`
            font-size: clamp(1.25rem, 3.5vmin, 1.5rem);
            font-weight: 800;
            color: #333;
            line-height: 1;
          `}
        >
          {oWins}
        </div>
      </div>
    </div>
  )
}
