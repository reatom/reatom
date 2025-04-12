  import { action } from './'
  import { expectTypeOf, test } from 'test'
  import { OverloadParameters } from '../utils'

  test('generic action', () => {
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
