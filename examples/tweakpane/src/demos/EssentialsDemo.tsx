import {
  action,
  atom,
  effect,
  getCalls,
  reatomRoute,
  sleep,
  withParams,
} from '@reatom/core'
import { reatomFactoryComponent } from '@reatom/react'
import type { TpButtonGridEvent } from '@tweakpane/plugin-essentials/dist/types/button-grid/api/tp-button-grid-event'

import { Pre } from '../components/Pre'
import {
  reatomPaneFolder,
  reatomFpsGraph,
  withButtonGrid,
  withCubicBezier,
  withRadioGrid,
} from '../tweakpane'

const EssentialsDemo = reatomFactoryComponent(() => {
  const folder = reatomPaneFolder({ title: 'Essentials' })

  // 1. Radio Grid
  const scaleAtom = atom(20, 'scale').extend(
    withRadioGrid(
      {
        groupName: 'scale',
        size: [3, 2],
        cells: (x, y) => ({
          title: `${[10, 20, 25, 50, 75, 100][y * 3 + x]}%`,
          value: [10, 20, 25, 50, 75, 100][y * 3 + x],
        }),
        label: 'Scale',
      },
      folder,
    ),
  )

  const buttonGridTitles = [
    ['NW', 'N', 'NE'],
    ['W', '*', 'E'],
    ['SW', 'S', 'SE'],
  ]

  // 2. Button Grid
  const buttonGridAction = action((params: TpButtonGridEvent) => {
    alert(`Clicked ${buttonGridTitles[params.index[1]][params.index[0]]}`)
  }, 'directions').extend(
    withButtonGrid(
      {
        size: [3, 3],
        cells: (x, y) => ({
          title: buttonGridTitles[y][x],
          value: buttonGridTitles[y][x],
        }),
        label: 'Directions',
      },
      folder,
    ),
  )

  // 3. Cubic Bezier
  const bezierAtom = atom([0.5, 0, 0.5, 1], 'bezier').extend(
    // handling object type received in setter
    withParams((value) => ('comps_' in value ? value['comps_'] : value)),
    withCubicBezier(
      { expanded: true, label: 'Cubic Bezier', picker: 'inline' },
      folder,
    ),
  )

  // 4. FPS Graph
  const fpsGraphBlade = reatomFpsGraph({ label: 'FPS Graph', rows: 2 }, folder)

  effect(() => {
    getCalls(buttonGridAction)
  })

  effect(() => {
    const api = fpsGraphBlade()

    let frameId: number
    const render = async () => {
      api.begin()
      await sleep(Math.random() * 10)
      api.end()
      frameId = requestAnimationFrame(render)
    }
    render()

    return () => cancelAnimationFrame(frameId)
  })

  return () => (
    <section>
      <h3>Essentials</h3>
      <p>Components from the @tweakpane/plugin-essentials.</p>
      <Pre label="Radio">{scaleAtom()}</Pre>
      <Pre label="Bezier">{JSON.stringify(bezierAtom())}</Pre>
    </section>
  )
}, 'EssentialsDemo')

export const essentialsRoute = reatomRoute({
  path: 'essentials',
  render: () => <EssentialsDemo />,
})
