import { MantineProvider, ColorSchemeScript } from '@mantine/core'
import { MainAppShell } from './components/layout/AppShell'
import { SearchPage } from './components/search'

export function App() {
  return (
    <>
      <ColorSchemeScript />
      <MantineProvider>
        <MainAppShell>
          <SearchPage />
        </MainAppShell>
      </MantineProvider>
    </>
  )
}
