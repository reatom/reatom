import { clearStack, context } from '@reatom/core'
import { expect, test } from 'vitest'

import { showImageNames, themePack } from './preferences'
import { imageFit } from './view'

test.beforeEach(() => clearStack())

test('Minimal has independent defaults and remembers explicit overrides', () =>
  context.start(() => {
    themePack.setPaper()
    imageFit.setFill()
    showImageNames.setTrue()

    themePack.setMinimal()
    expect(imageFit()).toBe('contain')
    expect(showImageNames()).toBe(false)

    imageFit.setCover()
    showImageNames.toggle()
    expect(imageFit()).toBe('cover')
    expect(showImageNames()).toBe(true)

    themePack.setPaper()
    expect(imageFit()).toBe('fill')
    expect(showImageNames()).toBe(true)

    themePack.setMinimal()
    expect(imageFit()).toBe('cover')
    expect(showImageNames()).toBe(true)
    imageFit.reset()
    showImageNames.reset()
    expect(imageFit()).toBe('contain')
    expect(showImageNames()).toBe(false)
  }))
