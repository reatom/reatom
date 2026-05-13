import { ColorSchemeScript, MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { reatomComponent } from '@reatom/react'

import {
  colorSchemeAtom,
  densityAtom,
} from '../features/settings/settingsModel'
import { rootRoute } from './routes'

export const App = reatomComponent(() => {
  const colorScheme = colorSchemeAtom()
  const density = densityAtom()
  const route = rootRoute.render()

  return (
    <>
      <ColorSchemeScript defaultColorScheme={colorScheme} />
      <MantineProvider
        forceColorScheme={colorScheme}
        theme={{
          primaryColor: 'indigo',
          defaultRadius: density === 'compact' ? 'sm' : 'md',
        }}
      >
        <Notifications position="top-right" />
        {route}
      </MantineProvider>
    </>
  )
}, 'App')
