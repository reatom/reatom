import { expect, test } from 'test'

import { atom } from '../core'
import { createMemStorage, reatomPersist } from '../persist'
import { withFromJson } from './withFromJson'
import { withToJson } from './withToJson'

test('restores atom state from json snapshot', () => {
  const createdAt = atom(new Date('2024-01-15'), 'createdAt')
    .extend(withToJson((state) => state.getTime()))
    .extend(withFromJson((json) => new Date(json as number)))

  expect(createdAt.fromJSON?.(1705276800000)).toEqual(
    new Date('2024-01-15T00:00:00.000Z'),
  )
})

test('is used by withPersist as default fromSnapshot', () => {
  const persistStorage = createMemStorage({
    name: 'withFromJson.persist',
    snapshot: {
      createdAt: 1705276800000,
    },
  })
  const withPersist = reatomPersist(persistStorage)

  const createdAt = atom(new Date(0), 'createdAt')
    .extend(withToJson((state) => state.getTime()))
    .extend(withFromJson((json) => new Date(json as number)))
    .extend(withPersist('createdAt'))

  expect(createdAt()).toEqual(new Date('2024-01-15T00:00:00.000Z'))
})
