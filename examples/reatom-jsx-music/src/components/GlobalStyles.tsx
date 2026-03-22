export const GlobalStyles = () => {
  return (
    <style>{`
      :root {
        --winamp-bg: #1a1a1a;
        --winamp-panel: #2d2d2d;
        --winamp-bevel-light: #5a5a5a;
        --winamp-bevel-dark: #0a0a0a;
        --winamp-text: #c8ffc8;
        --winamp-led: #38f238;
        --winamp-accent: #e89a3c;
        --winamp-title: #283d5e;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100dvh;
        background: #0d0d0d;
        font-family:
          Tahoma,
          'MS Sans Serif',
          'Segoe UI',
          sans-serif;
        font-size: 11px;
        color: #ddd;
      }
    `}</style>
  )
}
