import {
  Board,
  Container,
  Footer,
  GlobalStyles,
  Header,
  MainLayout,
  ModeToggle,
  ResetButton,
  ScoreBoard,
  TurnIndicator,
  VictoryOverlay,
} from './components'

export const App = () => {
  return (
    <>
      <GlobalStyles />

      <MainLayout>
        <Container>
          {/* Header */}
          <Header />

          {/* Game Mode Toggle */}
          <ModeToggle />

          {/* Score Board */}
          <ScoreBoard />

          {/* Turn Indicator */}
          <TurnIndicator />

          {/* Game Board */}
          <Board />

          {/* Reset Button */}
          <ResetButton />

          {/* Footer */}
          <Footer />
        </Container>
      </MainLayout>

      {/* Victory Overlay */}
      <VictoryOverlay />
    </>
  )
}
