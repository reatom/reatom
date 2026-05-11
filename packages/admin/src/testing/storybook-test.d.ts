export interface WaitForOptions {
  container?: HTMLElement
  interval?: number
  mutationObserverOptions?: MutationObserverInit
  onTimeout?: (error: Error) => Error
  timeout?: number
}

export type RoleNameMatcher =
  | RegExp
  | string
  | ((accessibleName: string, element: Element) => boolean)

export interface ByRoleOptions {
  busy?: boolean
  checked?: boolean
  current?: boolean | string
  description?: RoleNameMatcher
  expanded?: boolean
  hidden?: boolean
  level?: number
  name?: RoleNameMatcher
  pressed?: boolean
  queryFallbacks?: boolean
  selected?: boolean
  suggest?: boolean
  value?: {
    max?: number
    min?: number
    now?: number
    text?: string | RegExp
  }
}

export type TextMatcher =
  | RegExp
  | number
  | string
  | ((content: string, element: Element | null) => boolean)

export interface ByTextOptions {
  collapseWhitespace?: boolean
  exact?: boolean
  ignore?: boolean | string
  normalizer?: (text: string) => string
  selector?: string
  suggest?: boolean
  trim?: boolean
}

export interface Canvas {
  findAllByRole(
    role: string,
    options?: ByRoleOptions,
    waitForOptions?: WaitForOptions,
  ): Promise<HTMLElement[]>
  findAllByText(
    matcher: TextMatcher,
    options?: ByTextOptions,
    waitForOptions?: WaitForOptions,
  ): Promise<HTMLElement[]>
  findByRole(
    role: string,
    options?: ByRoleOptions,
    waitForOptions?: WaitForOptions,
  ): Promise<HTMLElement>
  findByText(
    matcher: TextMatcher,
    options?: ByTextOptions,
    waitForOptions?: WaitForOptions,
  ): Promise<HTMLElement>
  getAllByRole(role: string, options?: ByRoleOptions): HTMLElement[]
  getAllByText(matcher: TextMatcher, options?: ByTextOptions): HTMLElement[]
  getByRole(role: string, options?: ByRoleOptions): HTMLElement
  getByText(matcher: TextMatcher, options?: ByTextOptions): HTMLElement
  queryAllByRole(role: string, options?: ByRoleOptions): HTMLElement[]
  queryAllByText(matcher: TextMatcher, options?: ByTextOptions): HTMLElement[]
  queryByRole(role: string, options?: ByRoleOptions): HTMLElement | null
  queryByText(matcher: TextMatcher, options?: ByTextOptions): HTMLElement | null
}

export interface StorybookAssertion<T = unknown> {
  not: StorybookAssertion<T>
  rejects: StorybookAssertion<T>
  resolves: StorybookAssertion<T>
  toBe<E>(expected: E): void
  toBeDefined(): void
  toBeGreaterThan(expected: number): void
  toBeInTheDocument(): void
  toBeNull(): void
  toContain<E>(expected: E): void
  toEqual<E>(expected: E): void
  toHaveLength(expected: number): void
  toHaveValue(value: number | string): void
}

export interface StorybookExpect {
  <T>(actual: T, message?: string): StorybookAssertion<T>
}

export interface UserEvent {
  clear(element: Element): Promise<void>
  click(element: Element): Promise<void>
  tab(): Promise<void>
  type(
    element: Element,
    text: string,
    options?: {
      initialSelectionEnd?: number
      initialSelectionStart?: number
    },
  ): Promise<void>
}

export const expect: StorybookExpect
export const userEvent: UserEvent
export function waitFor<T>(
  callback: () => Promise<T> | T,
  options?: WaitForOptions,
): Promise<T>
export function within(element: HTMLElement): Canvas
