import { type JSXElement } from '@reatom/jsx'

interface ContainerProps {
  children: JSXElement | JSXElement[]
}

export const Container = ({ children }: ContainerProps) => {
  return (
    <div
      css={`
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        padding: 12px;
        border-radius: 16px;
        box-shadow:
          0 20px 60px rgba(0, 0, 0, 0.3),
          0 0 0 1px rgba(255, 255, 255, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.3);
        animation: fade-in-scale 0.6s ease-out;
        width: min(90vw, 500px);
        display: flex;
        flex-direction: column;
        gap: 10px;
      `}
    >
      {children}
    </div>
  )
}
