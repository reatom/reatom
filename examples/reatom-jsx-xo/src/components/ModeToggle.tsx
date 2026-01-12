import { playWithComputer } from '../model'

export const ModeToggle = () => {
  return (
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
              background: linear-gradient(135deg, #f64f59 0%, #c471ed 100%);
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
              transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            `}
          />
        </div>
        <span>{() => (playWithComputer() ? '🤖 vs AI' : '👥 2 Players')}</span>
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
  )
}
