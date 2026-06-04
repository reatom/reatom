import { within } from '@testing-library/dom'
import { expect } from 'storybook/test'

export type Canvas = ReturnType<typeof within>

export type Locator = (
  canvas: Canvas,
) => HTMLElement | null | Promise<HTMLElement | null>

export type DefiniteLocator = (
  canvas: Canvas,
) => HTMLElement | Promise<HTMLElement>

export type ArrayLocator = (
  canvas: Canvas,
) => HTMLElement[] | Promise<HTMLElement[]>

export type StoryContext = {
  canvas?: Canvas
  canvasElement?: HTMLElement
  userEvent?: unknown
}

const baseActor = {
  async see(locator: Locator): Promise<HTMLElement> {
    const el = await this.resolveLocator(locator)
    if (!el) throw new Error('Expected element to be in document')
    await expect(el).toBeInTheDocument()
    return el
  },

  async dontSee(locator: Locator): Promise<void> {
    const el = await this.resolveLocator(locator)
    if (el) {
      await expect(el).not.toBeInTheDocument()
    }
  },

  async seeText(locator: Locator, text: string | RegExp): Promise<void> {
    const el = await this.see(locator)
    if (typeof text === 'string') {
      await expect(el).toHaveTextContent(text)
    } else {
      await expect(el.textContent).toMatch(text)
    }
  },

  async seeInField(
    locator: DefiniteLocator,
    value: string | number,
  ): Promise<void> {
    const el = await this.resolveLocator(locator)
    await expect(el).toHaveValue(String(value))
  },

  async click(locator: DefiniteLocator): Promise<void> {
    const el = await this.resolveLocator(locator)
    el.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, button: 0 }),
    )
    el.click()
  },

  async fill(locator: DefiniteLocator, value: string): Promise<void> {
    const el = await this.resolveLocator(locator)
    const input = el as HTMLInputElement
    input.focus()
    input.value = value
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.blur()
  },

  async clear(locator: DefiniteLocator): Promise<void> {
    const el = await this.resolveLocator(locator)
    const input = el as HTMLInputElement
    input.focus()
    input.value = ''
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.blur()
  },

  async selectOption(
    locator: DefiniteLocator,
    value: string | RegExp,
  ): Promise<void> {
    const el = await this.resolveLocator(locator)
    const select = el as HTMLSelectElement
    const option = Array.from(select.options).find((opt) =>
      typeof value === 'string'
        ? opt.value === value
        : value.test(opt.textContent ?? ''),
    )
    if (option) {
      select.value = option.value
      select.dispatchEvent(new Event('change', { bubbles: true }))
    }
  },

  async resolveLocator<T extends Locator | DefiniteLocator>(
    locator: T,
  ): Promise<Awaited<ReturnType<T>>> {
    const canvas = (this as unknown as { _canvas: Canvas | null })._canvas
    if (!canvas)
      throw new Error('Actor not initialized: call I.init(ctx) first')
    const result = locator(canvas)
    return result as Promise<Awaited<ReturnType<T>>>
  },
} as const

type BaseActor = typeof baseActor & {
  _canvas: Canvas | null
  _canvasElement: HTMLElement | null
  init(ctx: StoryContext): void
}

export function createMyself<
  T extends Record<string, (...args: never[]) => unknown>,
>(extend?: (base: BaseActor) => T): BaseActor & T {
  const actor: BaseActor & T = {
    ...baseActor,
    _canvas: null as Canvas | null,
    _canvasElement: null as HTMLElement | null,

    init(ctx: StoryContext): void {
      const canvas =
        ctx.canvas ?? (ctx.canvasElement ? within(ctx.canvasElement) : null)
      if (!canvas)
        throw new Error('Story context must have canvas or canvasElement')
      actor._canvas = canvas
      actor._canvasElement = ctx.canvasElement ?? null
    },
  } as BaseActor & T

  if (extend) {
    Object.assign(actor, extend(actor as BaseActor))
  }

  return actor
}
