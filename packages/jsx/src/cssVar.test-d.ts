import { atom } from '@reatom/core'
import { expectTypeOf, test } from 'vitest'

import { cssVar } from './cssVar'
import type { JSX } from './jsx'

test('property is the literal custom property name', () => {
  const pack = cssVar('theme-pack', ['minimal', 'polaroid', 'retroOs', 'glass'])
  expectTypeOf(pack.property).toEqualTypeOf<'--reatom-theme-pack'>()
})

test('style and container reject values outside the list', () => {
  const pack = cssVar('theme-pack', ['minimal', 'polaroid', 'retroOs', 'glass'])

  pack.style('polaroid')
  pack.container('polaroid')
  pack.container('minimal', 'polaroid')
  // @ts-expect-error typo is not a pack
  pack.style('polariod')
  // @ts-expect-error typo is not a pack
  pack.container('polariod')
})

test('provide types the css prop key and rejects unknown values', () => {
  const pack = cssVar('theme-pack', ['minimal', 'polaroid', 'retroOs', 'glass'])

  const themePack = atom<'minimal' | 'polaroid'>('minimal')
  const polaroidPack = atom('polaroid' as const)
  const themePackGetter = () => themePack()

  expectTypeOf(() =>
    // @ts-expect-error typo is not a pack
    pack.provide('polariod'),
  ).toBeFunction()

  expectTypeOf(pack.provide<'polaroid'>).returns.toHaveProperty(
    'css:reatom-theme-pack',
  )
  expectTypeOf(pack.provide<'polaroid'>).returns.toMatchTypeOf<
    JSX.IntrinsicElements['div']
  >()
  expectTypeOf(pack.provide<typeof themePack>).returns.toMatchTypeOf<
    JSX.IntrinsicElements['div']
  >()
  expectTypeOf(pack.provide<typeof polaroidPack>).returns.toMatchTypeOf<
    JSX.IntrinsicElements['div']
  >()
  expectTypeOf(pack.provide<typeof themePackGetter>).returns.toMatchTypeOf<
    JSX.IntrinsicElements['div']
  >()
})
