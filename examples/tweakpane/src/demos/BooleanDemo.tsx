import { atom, reatomRoute } from '@reatom/core'
import { reatomFactoryComponent } from '@reatom/react'

import { Pre } from '../components/Pre'
import { reatomPaneFolder, withBinding } from '../tweakpane'

const BooleanDemo = reatomFactoryComponent(() => {
  const booleanFolder = reatomPaneFolder({ title: 'Boolean Controls' })

  const enabledAtom = atom(false, 'enabled').extend(
    withBinding({ label: 'Enabled' }, booleanFolder),
  )

  const checkedAtom = atom(true, 'checked').extend(
    withBinding({ label: 'Checked' }, booleanFolder),
  )

  return () => {
    return (
      <section>
        <h3>Boolean</h3>
        <p>Boolean controls display as checkboxes in Tweakpane.</p>
        <Pre label="Enabled">{enabledAtom().toString()}</Pre>
        <Pre label="Checked">{checkedAtom().toString()}</Pre>
      </section>
    )
  }
}, 'BooleanDemo')

export const booleanRoute = reatomRoute({
  path: 'boolean',
  render: () => <BooleanDemo />,
})
