import { atom, reatomRoute } from '@reatom/core'
import { reatomFactoryComponent } from '@reatom/react'

import { Pre } from '../components/Pre'
import { reatomPaneFolder, withBinding } from '../tweakpane'

const StringDemo = reatomFactoryComponent(() => {
  const stringFolder = reatomPaneFolder({ title: 'String' })

  const messageAtom = atom('hello, world', 'message').extend(
    withBinding({ label: 'Message' }, stringFolder),
  )

  const themeAtom = atom<string>('', 'theme').extend(
    withBinding(
      {
        label: 'Theme List',
        options: {
          none: '',
          dark: 'dark-theme.json',
          light: 'light-theme.json',
        },
      },
      stringFolder,
    ),
  )

  return () => {
    return (
      <section>
        <h3>String</h3>
        <Pre label="Message">{messageAtom()}</Pre>
        <Pre label="Theme">{themeAtom()}</Pre>
      </section>
    )
  }
}, 'StringDemo')

export const stringRoute = reatomRoute({
  path: 'string',
  render: () => <StringDemo />,
})
