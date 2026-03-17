import { assert } from '@reatom/core'
import {
  expect,
  userEvent,
  waitFor,
  within as withinElement,
} from 'storybook/test'

import type {
  AnyLocator,
  Canvas,
  DefiniteLocator,
  FluentLocator,
  WithinScope,
} from './loc'

export { assert, waitFor }

type RefinedLocator = AnyLocator & { __within?: WithinScope }
type ActorContext = {
  canvas: Canvas
  canvasElement: HTMLElement
}

// Inspired by codecept.js
function createBase(ctx: () => ActorContext) {
  const scopeStack: HTMLElement[] = []

  function rootCanvas(): Canvas {
    return withinElement(ctx().canvasElement.ownerDocument.body)
  }

  function activeCanvas(): Canvas {
    if (scopeStack.length > 0) {
      return withinElement(scopeStack[scopeStack.length - 1]!)
    }

    return ctx().canvas
  }

  async function resolveScopeLocator(
    scopeLocator: DefiniteLocator,
    resolvingScopes: Set<DefiniteLocator>,
  ): Promise<HTMLElement> {
    if (resolvingScopes.has(scopeLocator)) {
      throw new Error('Circular locator scope detected in .within(...)')
    }

    resolvingScopes.add(scopeLocator)
    try {
      const result = await resolveLocator(scopeLocator, resolvingScopes)
      assert(
        result instanceof HTMLElement,
        'Expected .within(locator) to resolve to an HTMLElement',
      )
      return result
    } finally {
      resolvingScopes.delete(scopeLocator)
    }
  }

  async function canvasFor(
    locator: AnyLocator,
    resolvingScopes: Set<DefiniteLocator>,
  ): Promise<Canvas> {
    const explicitScope = (locator as RefinedLocator).__within
    if (!explicitScope) return activeCanvas()
    if (explicitScope === 'global') return rootCanvas()
    if (explicitScope instanceof HTMLElement)
      return withinElement(explicitScope)
    return withinElement(
      await resolveScopeLocator(explicitScope, resolvingScopes),
    )
  }

  async function resolveLocator(
    locator: AnyLocator,
    resolvingScopes: Set<DefiniteLocator> = new Set(),
  ) {
    return await locator(await canvasFor(locator, resolvingScopes))
  }

  const click = async (locator: DefiniteLocator) => {
    const el = await resolveLocator(locator)
    assert(
      el instanceof HTMLElement,
      'Expected locator to resolve to an HTMLElement',
    )
    await userEvent.click(el)
  }

  return {
    resolveLocator,
    see: async (locator: AnyLocator) => {
      const result = await resolveLocator(locator)
      const el = Array.isArray(result) ? result[0] : result
      expect(el).toBeInTheDocument()
      assert(
        el instanceof HTMLElement,
        'Expected locator to resolve to an HTMLElement',
      )
      return el
    },
    dontSee: async (locator: FluentLocator) => {
      expect(await resolveLocator(locator.maybe())).toBeNull()
    },
    waitExit: async (locator: FluentLocator) => {
      await waitFor(
        async () =>
          void expect(await resolveLocator(locator.maybe())).toBeNull(),
      )
    },
    seeInField: async (locator: DefiniteLocator, value: string | number) => {
      const el = await resolveLocator(locator)
      assert(
        el instanceof HTMLElement,
        'Expected locator to resolve to an HTMLElement',
      )
      expect(el).toHaveValue(value)
    },
    click,
    fill: async (locator: DefiniteLocator, value: string) => {
      await waitFor(async () => {
        const el = await resolveLocator(locator)
        assert(
          el instanceof HTMLInputElement,
          'Expected locator to resolve to an HTMLInputElement',
        )
        await userEvent.click(el)
        await userEvent.type(el, value, {
          initialSelectionStart: 0,
          initialSelectionEnd: el.value.length,
        })
        expect(el.value).toBe(value)
      })
      await userEvent.tab()
    },
    selectOption: async (locator: DefiniteLocator, value: string | RegExp) => {
      const rootCanvas = withinElement(ctx().canvasElement.ownerDocument.body)
      await click(locator)
      await click((_canvas) => rootCanvas.getByRole('option', { name: value }))
    },
    clear: async (locator: DefiniteLocator) => {
      await waitFor(async () => {
        const el = await resolveLocator(locator)
        assert(
          el instanceof HTMLInputElement,
          'Expected locator to resolve to an HTMLInputElement',
        )
        await userEvent.click(el)
        await userEvent.clear(el)
        expect(el.value).toBe('')
      })
    },
    scope: async (locator: DefiniteLocator, callback: () => Promise<void>) => {
      const element = await resolveLocator(locator)
      assert(
        element instanceof HTMLElement,
        'Expected scope locator to resolve to an HTMLElement',
      )
      scopeStack.push(element)
      try {
        await callback()
      } finally {
        scopeStack.pop()
      }
    },
  }
}

export type BaseActor = ReturnType<typeof createBase>

type Actor<T extends Record<string, unknown>> = BaseActor &
  T & {
    init: (context: ActorContext) => void
    extend: <U extends Record<string, unknown>>(
      extension: (current: BaseActor & T) => U,
    ) => Actor<T & U>
  }

export const createActor = () => {
  let _ctx: ActorContext | null = null

  function ctx() {
    assert(_ctx !== null, 'I.init(ctx) must be called before using I methods')
    return _ctx
  }

  function makeActor<M extends Record<string, unknown>>(
    methods: BaseActor & M,
  ): Actor<M> {
    return Object.assign({}, methods, {
      init: (context: ActorContext) => {
        _ctx = context
      },
      extend: <U extends Record<string, unknown>>(
        ext: (current: BaseActor & M) => U,
      ): Actor<M & U> => {
        const extra = ext(methods)
        return makeActor<M & U>({ ...methods, ...extra } as BaseActor & (M & U))
      },
    })
  }

  return makeActor(createBase(ctx))
}
