import { MantineProvider, ColorSchemeScript } from '@mantine/core'
import { MainAppShell } from './components/layout/AppShell'
import { SearchPage } from './components/search'
import IssuePage from './components/issue/IssuePage'
import { currentPageAtom } from './navigation/model'
import { reatomComponent } from '@reatom/react'

export const App = reatomComponent(() => {
  const currentPage = currentPageAtom()
  return (
    <>
      <ColorSchemeScript />
      <MantineProvider>
        <MainAppShell>
          {currentPage === 'search' && <SearchPage />}
          {currentPage === 'issueDetail' && <IssuePage />}
        </MainAppShell>
      </MantineProvider>
    </>
  )
})
