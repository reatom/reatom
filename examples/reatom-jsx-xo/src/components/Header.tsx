export const Header = () => {
  return (
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
  )
}
