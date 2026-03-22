import { GlobalStyles } from './components/GlobalStyles'
import { UnsupportedBrowser } from './components/UnsupportedBrowser'
import { WinampShell } from './components/WinampShell'
import { isFileSystemAccessSupported } from './scanFolder'

export const App = () => {
  return (
    <>
      <GlobalStyles />
      {isFileSystemAccessSupported() ? <WinampShell /> : <UnsupportedBrowser />}
    </>
  )
}
