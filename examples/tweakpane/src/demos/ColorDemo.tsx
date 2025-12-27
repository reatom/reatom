import { atom, reatomRoute } from '@reatom/core'
import { reatomFactoryComponent } from '@reatom/react'

import { Pre } from '../components/Pre'
import { reatomPaneFolder, withBinding } from '../tweakpane'

const ColorDemo = reatomFactoryComponent(() => {
  const colorFolder = reatomPaneFolder({ title: 'Color' })

  const colorRgbAtom = atom({ r: 255, g: 0, b: 55 }, 'colorRgb').extend(
    withBinding({ label: 'RGB' }, colorFolder),
  )

  const colorRgbaAtom = atom(
    { r: 0, g: 255, b: 214, a: 0.5 },
    'colorRgba',
  ).extend(withBinding({ label: 'RGBA' }, colorFolder))

  const colorFloatAtom = atom({ r: 1, g: 0, b: 0.33 }, 'colorFloat').extend(
    withBinding({ label: 'Float', color: { type: 'float' } }, colorFolder),
  )

  const colorStringAtom = atom('#f05', 'colorStringPrimary').extend(
    withBinding({ label: 'String (Hex)' }, colorFolder),
  )

  const colorRgbStringAtom = atom(
    'rgb(0, 255, 214)',
    'colorStringSecondary',
  ).extend(withBinding({ label: 'String (rgb)' }, colorFolder))

  // Note: Tweakpane usually infers color from 0x... numbers if view: 'color' is passed
  const colorHexNumAtom = atom(0xff0055, 'colorHexNum').extend(
    withBinding({ label: 'Hex Number', view: 'color' }, colorFolder),
  )

  const colorAlphaNumAtom = atom(0x00ffd644, 'colorAlphaNum').extend(
    withBinding(
      { label: 'Hex + Alpha', view: 'color', color: { alpha: true } },
      colorFolder,
    ),
  )

  const colorTextAtom = atom('#0088ff', 'colorText').extend(
    withBinding({ label: 'Force Text', view: 'text' }, colorFolder),
  )

  const colorInlineAtom = atom('#ff0055ff', 'colorInline').extend(
    withBinding(
      { label: 'Inline Picker', picker: 'inline', expanded: true },
      colorFolder,
    ),
  )

  return () => {
    return (
      <section>
        <h3>Color</h3>
        <Pre label="RGB">{JSON.stringify(colorRgbAtom())}</Pre>
        <Pre label="RGBA">{JSON.stringify(colorRgbaAtom())}</Pre>
        <Pre label="Float">{JSON.stringify(colorFloatAtom())}</Pre>
        <Pre label="String (Hex)">{colorStringAtom()}</Pre>
        <Pre label="String (rgb)">{colorRgbStringAtom()}</Pre>
        <Pre label="Hex Num">{colorHexNumAtom().toString(16)}</Pre>
        <Pre label="Hex Alpha">{colorAlphaNumAtom().toString(16)}</Pre>
        <Pre label="Text View">{colorTextAtom()}</Pre>
        <Pre label="Inline">{colorInlineAtom()}</Pre>
      </section>
    )
  }
}, 'ColorDemo')

export const colorRoute = reatomRoute({
  path: 'color',
  render: () => <ColorDemo />,
})
