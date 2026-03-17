import { AnimatedCell } from './AnimatedCell'

export const Board = () => {
  return (
    <div
      aria-label="Tic-tac-toe board"
      role="group"
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
  )
}
