import { atom, reatomRoute, wrap } from '@reatom/core'
import { reatomFactoryComponent } from '@reatom/react'

import { Pre } from '../components/Pre'
import { reatomPaneFolder, withBinding } from '../tweakpane'

const SyncDemo = reatomFactoryComponent(() => {
  const syncFolder = reatomPaneFolder({ title: 'Sync' })

  const syncAtom = atom(50, 'syncAtom').extend(
    withBinding({ label: 'Shared Value' }, syncFolder),
  )

  return () => {
    const value = syncAtom()

    return (
      <section>
        <h3>Two-way Synchronization</h3>
        <p>
          Change the value using the Tweakpane slider on the right, or use the
          HTML controls below. Both stay in sync.
        </p>

        <Pre label="Current Value">{value}</Pre>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            onClick={wrap(() => syncAtom.set((v) => Math.max(0, v - 10)))}
          >
            -10
          </button>

          <input
            type="range"
            min="0"
            max="100"
            value={value}
            onChange={wrap((e) => syncAtom.set(Number(e.target.value)))}
          />
          <input
            type="number"
            min="0"
            max="100"
            value={value}
            onChange={wrap((e) => syncAtom.set(Number(e.target.value)))}
          />

          <button
            onClick={wrap(() => syncAtom.set((v) => Math.min(100, v + 10)))}
          >
            +10
          </button>

          <button onClick={wrap(() => syncAtom.set(50))}>Reset to 50</button>
        </div>
      </section>
    )
  }
}, 'SyncDemo')

export const syncRoute = reatomRoute({
  path: 'sync',
  render: () => <SyncDemo />,
})
