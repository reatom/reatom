import { atom, reatomRoute } from '@reatom/core'
import { reatomFactoryComponent } from '@reatom/react'

import { Pre } from '../components/Pre'
import { reatomPaneFolder, withBinding } from '../tweakpane'

const NumberDemo = reatomFactoryComponent(() => {
  const numberFolder = reatomPaneFolder({ title: 'Number' })

  const speedAtom = atom(0.5, 'speed').extend(
    withBinding({ label: 'Speed' }, numberFolder),
  )

  const sliderAtom = atom(50, 'slider').extend(
    withBinding({ label: 'Range (0-100)', min: 0, max: 100 }, numberFolder),
  )

  const stepSpeedAtom = atom(0.5, 'stepSpeed').extend(
    withBinding({ label: 'Step (0.1)', step: 0.1 }, numberFolder),
  )

  const countAtom = atom(10, 'count').extend(
    withBinding(
      { label: 'Count (step 10)', step: 10, min: 0, max: 100 },
      numberFolder,
    ),
  )

  const listQualityAtom = atom(0, 'listQuality').extend(
    withBinding(
      { label: 'List', options: { low: 0, medium: 50, high: 100 } },
      numberFolder,
    ),
  )

  const formattedAtom = atom(0, 'formatted').extend(
    withBinding(
      { label: 'Formatted', format: (v) => v.toFixed(6) },
      numberFolder,
    ),
  )

  return () => {
    return (
      <section>
        <h3>Number</h3>
        <Pre label="Speed">{speedAtom()}</Pre>
        <Pre label="Slider">{sliderAtom()}</Pre>
        <Pre label="Step Speed">{stepSpeedAtom()}</Pre>
        <Pre label="Count">{countAtom()}</Pre>
        <Pre label="Quality">{listQualityAtom()}</Pre>
        <Pre label="Formatted">{formattedAtom()}</Pre>
      </section>
    )
  }
}, 'NumberDemo')

export const numberRoute = reatomRoute({
  path: 'number',
  render: () => <NumberDemo />,
})
