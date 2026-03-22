export const UnsupportedBrowser = () => {
  return (
    <main
      css={`
        min-height: 100dvh;
        display: grid;
        place-items: center;
        padding: 24px;
        background: #111;
        color: #ccc;
        font-family: system-ui, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        text-align: center;
        max-width: 36rem;
        margin: 0 auto;
      `}
    >
      <p>
        This demo needs the{' '}
        <strong>File System Access API</strong> (
        <code>showDirectoryPicker</code>). Use a recent Chromium-based browser
        (Chrome, Edge, Brave) on <strong>HTTPS</strong> or{' '}
        <strong>localhost</strong>.
      </p>
    </main>
  )
}
