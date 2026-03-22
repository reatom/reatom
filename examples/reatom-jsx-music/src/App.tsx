import { isFileSystemAccessSupported } from './scanFolder'

import { GlobalStyles } from './components/GlobalStyles'
import { UnsupportedBrowser } from './components/UnsupportedBrowser'
import { WinampShell } from './components/WinampShell'

export const App = () => {
  return (
    <>
      <GlobalStyles />
      {isFileSystemAccessSupported() ? <WinampShell /> : <UnsupportedBrowser />}
    </>
  )
}
