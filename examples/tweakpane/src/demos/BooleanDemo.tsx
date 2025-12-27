import { atom, reatomRoute } from '@reatom/core'
import { reatomFactoryComponent } from '@reatom/react'

import { Pre } from '../components/Pre'
import { reatomPaneFolder, withBinding } from '../tweakpane'

const BooleanDemo = reatomFactoryComponent(() => {
  const booleanFolder = reatomPaneFolder({ title: 'Boolean' })

  const enabledAtom = atom(false, 'enabled') //
    .extend(withBinding({ label: 'Enabled' }, booleanFolder))

  const dependentAtom = atom(true, 'dependent') //
    .extend(withBinding({ label: 'Dependent' }, booleanFolder))

  return () => {
    return (
      <section>
        <h3>Boolean</h3>
        <p>
          Dependent atom tweakpane binding would appear only if its atom has
          subscription
        </p>
        <Pre label="Enabled">{enabledAtom().toString()}</Pre>
        {enabledAtom() && (
          <Pre label="Dependent">{dependentAtom().toString()}</Pre>
        )}
      </section>
    )
  }
}, 'BooleanDemo')

export const booleanRoute = reatomRoute({
  path: 'boolean',
  render: () => <BooleanDemo />,
})
