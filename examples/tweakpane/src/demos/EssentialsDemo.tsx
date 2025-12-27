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
import { reatomPaneFolder, withBinding, withBlade } from '../tweakpane'

const EssentialsDemo = reatomFactoryComponent(() => {
  const folder = reatomPaneFolder({ title: 'Essentials' })

  // 1. Radio Grid
  const radioAtom = atom(25, 'radio').extend(
    withBinding(
      {
        view: 'radiogrid',
        groupName: 'scale',
        size: [3, 2],
        cells: (x: any, y: any) => ({
          title: `${[10, 20, 25, 50, 75, 100][y * 3 + x]}%`,
          value: [10, 20, 25, 50, 75, 100][y * 3 + x],
        }),
        label: 'Radio Grid',
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
    alert(
      `Button clicked ${buttonGridTitles[params.index[1]][params.index[0]]}`,
    )
  }, 'buttonGrid').extend(
    withBlade(
      {
        view: 'buttongrid',
        size: [3, 3],
        cells: (x: any, y: any) => ({
          title: buttonGridTitles[y][x],
          value: buttonGridTitles[y][x],
        }),
        label: 'Button Grid',
      },
      folder,
    ),
  )

  // 3. Cubic Bezier
  const bezierAtom = atom([0.5, 0, 0.5, 1], 'bezier').extend(
    // handling object type received in setter
    withParams((value) => ('comps_' in value ? value['comps_'] : value)),
    withBlade(
      {
        view: 'cubicbezier',
        value: [0.5, 0, 0.5, 1],
        expanded: true,
        label: 'Cubic Bezier',
        picker: 'inline',
      },
      folder,
    ),
  )

  // 4. FPS Graph
  const fpsGraphBlade = atom<any>(null, 'fpsGraph').extend(
    withBlade(
      {
        view: 'fpsgraph',
        label: 'FPS Graph',
        rows: 2,
      },
      folder,
    ),
  )

  effect(() => {
    getCalls(buttonGridAction)
  })

  effect(() => {
    const api = (fpsGraphBlade as any).blade()

    let frameId: number
    const render = async () => {
      if (api && api.begin) {
        api.begin()
        await sleep(Math.random() * 10)
        api.end()
      }
      frameId = requestAnimationFrame(render)
    }
    render()

    return () => cancelAnimationFrame(frameId)
  })

  return () => (
    <section>
      <h3>Essentials</h3>
      <p>Components from the @tweakpane/plugin-essentials.</p>
      <Pre label="Radio">{radioAtom()}</Pre>
      <Pre label="Button Grid">{buttonGridAction.name}</Pre>
      <Pre label="Bezier">{JSON.stringify(bezierAtom())}</Pre>
    </section>
  )
}, 'EssentialsDemo')

export const essentialsRoute = reatomRoute({
  path: 'essentials',
  render: () => <EssentialsDemo />,
})
