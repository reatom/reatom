import type { OtlpAttrValue } from './toOtlpValue.ts'
import type { BrowserCapture } from './browserCapture.ts'
export type BrowserActivityEvent = { type: 'start' | 'end'; id: symbol }
type State = {
  listeners: Set<(event: BrowserActivityEvent) => void>
  action?: { id: string; name: string }
}
const states = new WeakMap<BrowserCapture, State>()
const stateOf = (capture: BrowserCapture) => {
  let state = states.get(capture)
  if (!state) states.set(capture, (state = { listeners: new Set() }))
  return state
}
/** Physical native request lifecycle, excluded transports never enter here. */
export const startBrowserActivity = (capture: BrowserCapture): (() => void) => {
  const state = stateOf(capture),
    id = Symbol()
  const notify = (type: BrowserActivityEvent['type']) => {
    for (const listener of [...state.listeners]) {
      try {
        listener({ type, id })
      } catch {
        /* Optional observers cannot alter requests. */
      }
    }
  }
  notify('start')
  let active = true
  return () => {
    if (active) {
      active = false
      notify('end')
    }
  }
}
export const observeBrowserActivity = (
  capture: BrowserCapture,
  listener: (event: BrowserActivityEvent) => void,
): (() => void) => {
  const listeners = stateOf(capture).listeners
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export const browserActionAttributes = (
  capture: BrowserCapture,
): Record<string, OtlpAttrValue> => {
  const action = states.get(capture)?.action
  return action ? { 'action.id': action.id, 'action.name': action.name } : {}
}
export const setBrowserAction = (
  capture: BrowserCapture,
  action: { id: string; name: string },
): (() => void) => {
  const state = stateOf(capture)
  state.action = action
  return () => {
    if (state.action === action) state.action = undefined
  }
}
