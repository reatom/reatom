import { expectTypeOf, test } from 'test'

import type { Unsubscribe } from '../utils'
import { onEvent } from './onEvent'

// The file runs in node too, where there is no `window`.
const win = new EventTarget() as Window

test('onEvent promise form takes listener options', () => {
  expectTypeOf(
    onEvent(win, 'scroll', { capture: true, passive: true }),
  ).toEqualTypeOf<Promise<Event>>()
  expectTypeOf(onEvent(win, 'keydown')).toEqualTypeOf<Promise<KeyboardEvent>>()
})

test('onEvent callback form keeps its event type', () => {
  expectTypeOf(
    onEvent(win, 'keydown', (event) => {
      expectTypeOf(event).toEqualTypeOf<KeyboardEvent>()
    }),
  ).toEqualTypeOf<Unsubscribe>()
  expectTypeOf(
    onEvent(win, 'scroll', () => {}, { passive: true }),
  ).toEqualTypeOf<Unsubscribe>()
})
