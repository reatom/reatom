import { expectTypeOf, test } from 'test'

import { type Computed, computed } from './computed'


test('computed returns Computed type', () => {
  const test0 = computed(() => 0)
  expectTypeOf(test0).toExtend<Computed<number>>()
})

test('computed accepts only cb', () => {
  // @ts-expect-error
  const test0 = computed(0)
  expectTypeOf(test0).toExtend<Computed<number>>()
})
