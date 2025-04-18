import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { clearStack, context } from '@reatom/core';
import { reatomContext } from '@reatom/react';
import { MainAppShell } from './components/layout/AppShell';
import { SearchPage } from './components/search';
import { theme } from './theme';

clearStack()

export function App() {
  return (
    <>
      <ColorSchemeScript />
      <MantineProvider theme={theme}>
        <reatomContext.Provider value={context.start()}>
          <MainAppShell>
            <SearchPage />
          </MainAppShell>
        </reatomContext.Provider>
      </MantineProvider>
    </>
  );
}
