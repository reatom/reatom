import {
  Article,
  Bridge,
  Controls,
  GlobalStyles,
  Header,
  Readout,
  Sheet,
} from './components'

export const App = () => (
  <div
    css={`
      min-height: 100dvh;
      display: grid;
      grid-template-rows: auto 1fr auto;
      gap: 1.25rem;
      padding: clamp(1rem, 2.5vmin, 2rem) clamp(1rem, 3vmin, 2.5rem);
    `}
  >
    <GlobalStyles />
    <Bridge />
    <Header />

    <main
      css={`
        display: grid;
        grid-template-columns: minmax(0, 22.5rem) minmax(0, 1fr);
        grid-template-rows: auto 1fr;
        align-items: start;
        gap: 1.25rem;

        & > aside {
          grid-row: 1 / span 2;
        }

        @media (max-width: 1000px) {
          grid-template-columns: minmax(0, 1fr);
          grid-template-rows: none;

          & > aside {
            grid-row: auto;
            order: 1;
          }
        }
      `}
    >
      <Controls />
      <Sheet />
      <Readout />
    </main>

    <Article />
  </div>
)
