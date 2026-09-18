import { expectTypeOf, test } from 'test'

import type { OverloadParameters } from '../utils'
import { type Action, action } from './'

test('one generic action', () => {
  const a = action(<T extends string | number>(value: T): T => value)
  //    ^?

  // --- PREVIEW ---
  // @ts-expect-error
  type Params = Parameters<typeof a>
  //   ^?
  // @ts-expect-error
  type OverloadParams = OverloadParameters<typeof a>
  //   ^?
  // @ts-expect-error
  type Return = ReturnType<typeof a>
  //   ^?

  // --- TESTS ---
  expectTypeOf(a).parameters.toEqualTypeOf<[string | number]>()
  expectTypeOf(a).returns.toEqualTypeOf<string | number>()

  expectTypeOf(a(1)).toBeNumber()
  expectTypeOf(a('')).toBeString()
})

test('optional parameter inference', () => {
  const a = action((value = 1) => value)
  //    ^?

  expectTypeOf(a).toBeFunction()
  expectTypeOf(a).toExtend<Action<[(number | undefined)?], number>>()

  expectTypeOf(a).parameters.toEqualTypeOf<[number?]>()
  expectTypeOf(a).returns.toEqualTypeOf<number>()
  expectTypeOf(a).returns.not.toEqualTypeOf<any>()

  expectTypeOf(a()).toBeNumber()
  expectTypeOf(a(1)).toBeNumber()
})

test('few generics action', () => {
  let fn = <Params extends any[], Payload>(
    cb: (...params: Params) => Payload,
    ...params: Params
  ): Payload => cb(...params)
  let a = action(fn)
  //   ^?

  // --- PREVIEW ---
  // @ts-expect-error
  type Params = Parameters<typeof a>
  //   ^?
  // @ts-expect-error
  type OverloadParams = OverloadParameters<typeof a>
  //   ^?
  // @ts-expect-error
  type Return = ReturnType<typeof a>
  //   ^?

  // TODO
  // // @ts-expect-error
  // a((value: number) => value)
  // expectTypeOf(a((value: number) => value, 0)).toBeNumber()
})

test('overload action', () => {
  const testFn: {
    (num: number): number
    (str: string): string
  } = (some: any) => some

  const a = action(testFn)
  //    ^?

  // --- PREVIEW ---
  // @ts-expect-error
  type Params = Parameters<typeof a>
  //   ^?
  // @ts-expect-error
  type OverloadParams = OverloadParameters<typeof a>
  //   ^?
  // @ts-expect-error
  type Return = ReturnType<typeof a>
  //   ^?

  // --- TESTS --- TODO
  // expectTypeOf(a).parameters.toEqualTypeOf<[string | number]>()
  // expectTypeOf(a).returns.toEqualTypeOf<string | number>()

  // expectTypeOf(a(1)).toBeNumber()
  // expectTypeOf(a('')).toBeString()
})
