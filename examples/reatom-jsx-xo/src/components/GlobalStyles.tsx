import { cellStyles } from './AnimatedCell'
import { turnIndicatorStyles } from './TurnIndicator'
import { victoryOverlayStyles } from './VictoryOverlay'

export const animationStyles = `
  @keyframes gradient-shift {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }

  @keyframes fade-in-scale {
    from {
      opacity: 0;
      transform: scale(0.9) translateY(20px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`

export const GlobalStyles = () => {
  return (
    <>
      <style>{`body {margin: 0;}`}</style>
      <style>{cellStyles}</style>
      <style>{turnIndicatorStyles}</style>
      <style>{victoryOverlayStyles}</style>
      <style>{animationStyles}</style>
    </>
  )
}
