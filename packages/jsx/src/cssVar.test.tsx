import { atom, context, ReatomError, sleep, wrap } from '@reatom/core'
import { expect, test } from 'vitest'

import { cssVar } from './cssVar'
// eslint-disable-next-line unused-imports/no-unused-imports
import { h, instance, mount, stylesheet } from '.'

const parent = atom(() => {
  const main = instance(HTMLElement, <main />)
  window.document.body.appendChild(main)
  return main
}, 'parent')

let serial = 0
let tokenName = (label: string) => {
  serial += 1
  let entropy = Math.random().toString(36).slice(2, 8)
  return `${label}${serial}${entropy}`
}

test('property, style, container, and var emit CSS fragments', () => {
  const name = tokenName('frag')
  const token = cssVar(name, ['polaroid', 'glass'])

  expect(token.property).toBe(`--reatom-${name}`)
  expect(token.style('polaroid')).toBe(`style(--reatom-${name}: polaroid)`)
  expect(token.container('polaroid')).toBe(
    `@container style(--reatom-${name}: polaroid)`,
  )
  expect(token.container('polaroid', 'glass')).toBe(
    `@container (style(--reatom-${name}: polaroid) or style(--reatom-${name}: glass))`,
  )
  expect(token.var()).toBe(`var(--reatom-${name})`)
})

test('provide returns the css prop and the same source', () => {
  const name = tokenName('src')
  const token = cssVar(name, ['a', 'b'])
  const atomSource = atom<'a' | 'b'>('a')
  const getter = () => atomSource()

  expect(token.provide('a')).toEqual({ [`css:reatom-${name}`]: 'a' })
  expect(token.provide(atomSource)).toEqual({
    [`css:reatom-${name}`]: atomSource,
  })
  expect(token.provide(getter)).toEqual({ [`css:reatom-${name}`]: getter })
})

test('provide sets the custom property for a static value, an atom, and a getter', () =>
  context.start(async () => {
    const name = tokenName('set')
    const token = cssVar(name, ['a', 'b'])
    const atomSource = atom<'a' | 'b'>('a')
    const getterSource = atom<'a' | 'b'>('a')
    const staticEl = <div {...token.provide('b')} />
    const atomEl = <div {...token.provide(atomSource)} />
    const getterEl = <div {...token.provide(() => getterSource())} />

    mount(
      parent(),
      <div>
        {staticEl}
        {atomEl}
        {getterEl}
      </div>,
    )
    await wrap(sleep())

    expect(staticEl.style.getPropertyValue(token.property)).toBe('b')
    expect(atomEl.style.getPropertyValue(token.property)).toBe('a')
    expect(getterEl.style.getPropertyValue(token.property)).toBe('a')

    atomSource.set('b')
    getterSource.set('b')
    await wrap(sleep())

    expect(atomEl.style.getPropertyValue(token.property)).toBe('b')
    expect(getterEl.style.getPropertyValue(token.property)).toBe('b')
  }))

test('container style follows the provider atom, the nearest provider, and base styles', () =>
  context.start(async () => {
    const name = tokenName('query')
    const token = cssVar(name, ['a', 'b', 'c'])
    const outer = atom<'a' | 'b' | 'c'>('a')
    const inner = atom<'a' | 'b' | 'c'>('a')
    const rules = `
      display: none;
      ${token.container('b')} { display: inline; }
      ${token.container('c')} { display: block; }
    `
    const child = <span css={rules} />
    const orphan = <span css={rules} />
    const root = (
      <div {...token.provide(outer)}>
        <div {...token.provide(inner)}>{child}</div>
        {orphan}
      </div>
    )

    mount(parent(), root)
    await wrap(sleep())

    expect(getComputedStyle(child).display).toBe('none')
    expect(getComputedStyle(orphan).display).toBe('none')

    inner.set('b')
    await wrap(sleep())
    expect(getComputedStyle(child).display).toBe('inline')
    expect(getComputedStyle(orphan).display).toBe('none')

    outer.set('c')
    await wrap(sleep())
    expect(getComputedStyle(child).display).toBe('inline')
    expect(getComputedStyle(orphan).display).toBe('block')

    inner.set('c')
    await wrap(sleep())
    expect(getComputedStyle(child).display).toBe('block')
  }))

test('compound style queries match both tokens', () =>
  context.start(async () => {
    const pack = cssVar(tokenName('pack'), ['retroOs', 'polaroid'])
    const mode = cssVar(tokenName('mode'), ['light', 'dark'])
    const packValue = atom<'retroOs' | 'polaroid'>('retroOs')
    const modeValue = atom<'light' | 'dark'>('light')
    const child = (
      <span
        css={`
          display: none;
          @container ${pack.style('retroOs')} and ${mode.style('light')} {
            display: inline;
          }
        `}
      />
    )

    mount(
      parent(),
      <div {...pack.provide(packValue)} {...mode.provide(modeValue)}>
        {child}
      </div>,
    )
    await wrap(sleep())
    expect(getComputedStyle(child).display).toBe('inline')

    modeValue.set('dark')
    await wrap(sleep())
    expect(getComputedStyle(child).display).toBe('none')

    modeValue.set('light')
    packValue.set('polaroid')
    await wrap(sleep())
    expect(getComputedStyle(child).display).toBe('none')
  }))

test('an invalid provider value and a missing provider compute to the first value', () =>
  context.start(async () => {
    const name = tokenName('init')
    const token = cssVar(name, ['alpha', 'beta'])
    const child = <span />
    const orphan = <span />
    const provider = <div {...token.provide('typo' as 'alpha')}>{child}</div>

    mount(
      parent(),
      <div>
        {provider}
        {orphan}
      </div>,
    )
    await wrap(sleep())

    expect(
      getComputedStyle(child).getPropertyValue(token.property).trim(),
    ).toBe('alpha')
    expect(
      getComputedStyle(orphan).getPropertyValue(token.property).trim(),
    ).toBe('alpha')
  }))

test('the same values can be defined again and the second token still works', () =>
  context.start(async () => {
    const name = tokenName('same')
    const first = cssVar(name, ['a', 'b'])
    first.provide('a')
    const second = cssVar(name, ['a', 'b'])
    const element = <div {...second.provide('b')} />

    mount(parent(), element)
    await wrap(sleep())
    expect(element.style.getPropertyValue(second.property)).toBe('b')
  }))

test('a different value list throws', () => {
  const name = tokenName('clash')
  cssVar(name, ['a', 'b'])
  expect(() => cssVar(name, ['a', 'c'])).toThrow(ReatomError)
  expect(() => cssVar(name, ['a', 'c'])).toThrow(
    `cssVar "${name}" is already defined as "a | b", got "a | c". Rename it, or reload the page after changing its values.`,
  )
})

test('invalid names and values throw', () => {
  expect(() => cssVar('bad name', ['a'])).toThrow(ReatomError)
  expect(() => cssVar('bad name', ['a'])).toThrow(
    'cssVar "bad name": "bad name" is not a valid CSS identifier',
  )
  expect(() => cssVar('ok', ['inherit'])).toThrow(
    'cssVar "ok": "inherit" is not a valid CSS identifier',
  )
  expect(() => cssVar('ok', ['default'])).toThrow(
    'cssVar "ok": "default" is not a valid CSS identifier',
  )
  expect(() => cssVar('ok', ['1bad'])).toThrow(
    'cssVar "ok": "1bad" is not a valid CSS identifier',
  )
})

test('every stylesheet gets its own @property declaration', () => {
  const token = cssVar(tokenName('sheets'), ['a', 'b'])
  const isDeclaredIn = (sheet: CSSStyleSheet) =>
    [...sheet.cssRules].some(
      (rule) => rule instanceof CSSPropertyRule && rule.name === token.property,
    )

  const firstContextSheet = context.start(() => {
    token.provide('a')
    return stylesheet()
  })
  const secondContextSheet = context.start(() => {
    token.provide('a')
    return stylesheet()
  })
  const replacedSheet = context.start(() => {
    stylesheet.set(new CSSStyleSheet())
    token.provide('a')
    return stylesheet()
  })

  expect(secondContextSheet).not.toBe(firstContextSheet)
  expect(isDeclaredIn(firstContextSheet)).toBe(true)
  expect(isDeclaredIn(secondContextSheet)).toBe(true)
  expect(isDeclaredIn(replacedSheet)).toBe(true)
})

test('the first provide declares @property once', () => {
  const token = cssVar(tokenName('once'), ['a', 'b'])
  const declarations = () =>
    [...stylesheet().cssRules].filter(
      (rule) => rule instanceof CSSPropertyRule && rule.name === token.property,
    ) as CSSPropertyRule[]

  expect(declarations()).toHaveLength(0)
  token.provide('a')
  token.provide('b')

  const [declaration, ...duplicates] = declarations()
  expect(duplicates).toHaveLength(0)
  expect(declaration?.syntax).toBe('a | b')
  expect(declaration?.inherits).toBe(true)
  expect(declaration?.initialValue).toBe('a')
})
