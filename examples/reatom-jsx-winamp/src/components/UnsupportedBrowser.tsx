export const UnsupportedBrowser = () => {
  return (
    <main
      css={`
        min-height: 100dvh;
        display: grid;
        place-items: center;
        padding: 24px;
        color: #d7dde7;
      `}
    >
      <div
        css={`
          width: min(100%, 520px);
          padding: 22px 24px;
          border: 1px solid var(--winamp-frame);
          border-radius: var(--winamp-radius);
          background: linear-gradient(
            180deg,
            rgba(43, 47, 56, 0.96),
            rgba(18, 20, 25, 0.98)
          );
          box-shadow:
            0 20px 48px rgba(0, 0, 0, 0.45),
            inset 0 0 0 1px rgba(255, 255, 255, 0.06);
          text-align: center;
        `}
      >
        <div
          css={`
            margin-bottom: 12px;
            color: var(--winamp-led);
            font-family: ui-monospace, 'Courier New', monospace;
            font-size: 12px;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            text-shadow: 0 0 10px rgba(87, 255, 107, 0.28);
          `}
        >
          Winamp skin unavailable
        </div>
        <p
          css={`
            margin: 0;
            font-size: 14px;
            line-height: 1.6;
          `}
        >
          This demo needs the <strong>File System Access API</strong> (
          <code>showDirectoryPicker</code>). Use a recent Chromium-based browser
          (Chrome, Edge, Brave) on <strong>HTTPS</strong> or{' '}
          <strong>localhost</strong>.
        </p>
      </div>
    </main>
  )
}
