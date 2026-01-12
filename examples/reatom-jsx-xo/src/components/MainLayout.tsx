import { type JSXElement } from '@reatom/jsx'

interface MainLayoutProps {
  children: JSXElement | JSXElement[]
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <main
      css={`
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
      {children}
    </main>
  )
}
