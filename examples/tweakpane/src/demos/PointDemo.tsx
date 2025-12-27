import { atom, reatomRoute } from '@reatom/core'
import { reatomFactoryComponent } from '@reatom/react'
import { reatomPaneFolder, withBinding } from '../tweakpane'
import { Pre } from '../components/Pre'

const PointDemo = reatomFactoryComponent(() => {
  const pointFolder = reatomPaneFolder({ title: 'Point' })

  const point2dAtom = atom({ x: 50, y: 25 }, 'point2d').extend(
    withBinding({ label: 'Point 2D' }, pointFolder),
  )

  const point2dConstrainedAtom = atom(
    { x: 20, y: 30 },
    'point2dConstrained',
  ).extend(
    withBinding(
      {
        label: '2D Constrained',
        x: { step: 20 },
        y: { min: 0, max: 100 },
      },
      pointFolder,
    ),
  )

  const point2dInvertedAtom = atom({ x: 50, y: 50 }, 'point2dInverted').extend(
    withBinding(
      {
        label: '2D Inverted Y',
        y: { inverted: true },
      },
      pointFolder,
    ),
  )

  const point2dInlineAtom = atom({ x: 50, y: 50 }, 'point2dInline').extend(
    withBinding(
      {
        label: '2D Inline',
        picker: 'inline',
        expanded: true,
      },
      pointFolder,
    ),
  )

  const point3dAtom = atom({ x: 0, y: 20, z: -10 }, 'point3d').extend(
    withBinding(
      {
        label: 'Point 3D',
        y: { step: 10 },
        z: { max: 0 },
      },
      pointFolder,
    ),
  )

  const point4dAtom = atom({ x: 0, y: 0, z: 0, w: 1 }, 'point4d').extend(
    withBinding(
      {
        label: 'Point 4D',
        x: { min: 0, max: 1 },
        y: { min: 0, max: 1 },
        z: { min: 0, max: 1 },
        w: { min: 0, max: 1 },
      },
      pointFolder,
    ),
  )

  return () => {
    return (
      <section>
        <h3>Point</h3>
        <Pre label="2D">{JSON.stringify(point2dAtom())}</Pre>
        <Pre label="2D Constrained">
          {JSON.stringify(point2dConstrainedAtom())}
        </Pre>
        <Pre label="2D Inverted">{JSON.stringify(point2dInvertedAtom())}</Pre>
        <Pre label="2D Inline">{JSON.stringify(point2dInlineAtom())}</Pre>
        <Pre label="3D">{JSON.stringify(point3dAtom())}</Pre>
        <Pre label="4D">{JSON.stringify(point4dAtom())}</Pre>
      </section>
    )
  }
}, 'PointDemo')

export const pointRoute = reatomRoute({
  path: 'point',
  render: () => <PointDemo />,
})
