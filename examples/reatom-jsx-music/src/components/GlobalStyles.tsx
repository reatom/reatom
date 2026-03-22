export const GlobalStyles = () => {
  return (
    <style>{`
      :root {
        --winamp-bg: #171a1f;
        --winamp-panel: #2c3038;
        --winamp-panel-alt: #20242b;
        --winamp-frame: #050608;
        --winamp-frame-inner: #5a6170;
        --winamp-bevel-light: rgba(255, 255, 255, 0.18);
        --winamp-bevel-dark: #090a0d;
        --winamp-text: #d7f5d2;
        --winamp-led: #57ff6b;
        --winamp-led-soft: rgba(87, 255, 107, 0.18);
        --winamp-accent: #f3a33f;
        --winamp-accent-soft: rgba(243, 163, 63, 0.24);
        --winamp-title: #243b63;
        --winamp-title-start: #4f77b4;
        --winamp-title-end: #111d33;
        --winamp-muted: #a1a8b3;
        --winamp-radius: 10px;
      }

      @keyframes winamp-meter {
        0% {
          transform: scaleY(0.18);
        }

        30% {
          transform: scaleY(0.52);
        }

        55% {
          transform: scaleY(1);
        }

        78% {
          transform: scaleY(0.34);
        }

        100% {
          transform: scaleY(0.84);
        }
      }

      @keyframes winamp-led-pulse {
        0%,
        100% {
          opacity: 0.62;
          filter: saturate(0.88);
        }

        50% {
          opacity: 1;
          filter: saturate(1.08);
        }
      }

      @keyframes winamp-sheen {
        0% {
          transform: translateX(-140%);
        }

        100% {
          transform: translateX(180%);
        }
      }

      html {
        color-scheme: dark;
      }

      * {
        box-sizing: border-box;
      }

      #app {
        min-height: 100dvh;
      }

      body {
        margin: 0;
        min-height: 100dvh;
        background:
          radial-gradient(circle at 16% 16%, rgba(243, 163, 63, 0.18), transparent 18%),
          radial-gradient(circle at 82% 14%, rgba(97, 146, 255, 0.22), transparent 24%),
          radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.06), transparent 28%),
          linear-gradient(135deg, #0b0d11 0%, #06070b 42%, #11151d 100%);
        font-family:
          Tahoma,
          'MS Sans Serif',
          'Segoe UI',
          sans-serif;
        font-size: 11px;
        color: #ddd;
      }

      body::before {
        content: '';
        position: fixed;
        inset: 0;
        pointer-events: none;
        opacity: 0.24;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 18%),
          linear-gradient(90deg, rgba(255, 255, 255, 0.02), transparent 16%, rgba(255, 255, 255, 0.02) 84%, transparent),
          repeating-linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.018) 0 1px,
            transparent 1px 4px
          );
      }

      body::after {
        content: '';
        position: fixed;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(circle at 50% -10%, rgba(255, 255, 255, 0.08), transparent 42%),
          radial-gradient(circle at 50% 120%, rgba(255, 160, 48, 0.06), transparent 32%);
      }

      button,
      input {
        font: inherit;
      }

      ::selection {
        background: rgba(243, 163, 63, 0.35);
        color: #fff;
      }
    `}</style>
  )
}
