import { mintIdentityId } from '../ids.ts'
import { installFrustration } from './frustration.ts'
import type { BooleanAtom, Ext } from '@reatom/core'
import { featureControl } from '../feature.ts'
import {
  browserActionAttributes,
  observeBrowserActivity,
  setBrowserAction,
} from '../browserActivity.ts'
import { browserCaptureOf, setBrowserMetadata } from '../browserCapture.ts'
import type { CaptureSnapshot } from '../browserCapture.ts'
import type { BrowserTelemetry } from '../captureEngine.ts'
export interface BrowserActionsOptions {
  /** Faro rage/dead/error click signals, enabled by default. */
  frustration?: boolean
  /** Only explicitly named elements are observed. No text or HTML extraction. */
  attribute?: string
  /** Initial DOM/resource activity window, bounded to 1–1000ms; default 100ms. */
  initialActivityTimeout?: number
}
/** Explicitly named native actions, validated by DOM or resource activity. */
export const withBrowserActions =
  (
    options: BrowserActionsOptions = {},
  ): Ext<BrowserTelemetry, { browserActions: BooleanAtom }> =>
  (otel) => ({
    browserActions: featureControl(otel, 'browserActions', () => {
      const capture = browserCaptureOf(otel)!
      if (typeof window === 'undefined' || typeof document === 'undefined')
        return { dispose() {} }
      const stopFrustration =
        options.frustration === false
          ? () => {}
          : installFrustration(
              capture,
              options.attribute ?? 'data-faro-user-action-name',
            )
      let active = true,
        epoch = 0
      let installingIdentity: (() => void) | undefined
      type Pending = {
        name: string
        trigger: string
        id: string
        wall: number
        mono: number
        snapshot: CaptureSnapshot
        valid: boolean
        running: Set<symbol>
        halted: boolean
        clearIdentity: () => void
        timer: ReturnType<typeof setTimeout>
      }
      let pending: Pending | undefined
      const initial = Math.min(
        1000,
        Math.max(1, options.initialActivityTimeout ?? 100),
      )
      const finish = (force = false) => {
        const action = pending
        if (!action) return
        if (!force && action.running.size) {
          if (!action.halted) {
            action.halted = true
            action.clearIdentity()
            clearTimeout(action.timer)
            action.timer = setTimeout(() => finish(true), 10000)
          }
          return
        }
        pending = undefined
        action.clearIdentity()
        clearTimeout(action.timer)
        if (!active || !action.valid || !capture.enabled('logs') || !active)
          return
        try {
          capture.log({
            eventName: 'browser.user_action',
            timeMs: action.wall,
            snapshot: action.snapshot,
            attributes: {
              'action.name': action.name,
              'action.start_time': action.wall,
              'action.end_time': Date.now(),
              'action.duration': Math.max(0, performance.now() - action.mono),
              'action.trigger': action.trigger,
              'action.importance': 'normal',
              'action.id': action.id,
            },
          })
        } catch {
          /* Observers cannot escape native callbacks. */
        }
      }
      const activity = () => {
        if (!pending || pending.halted) return
        pending.valid = true
        clearTimeout(pending.timer)
        pending.timer = setTimeout(() => finish(), 100)
      }
      const removeMetadata = setBrowserMetadata(otel, () =>
        browserActionAttributes(capture),
      )
      const stopActivity = observeBrowserActivity(capture, (event) => {
        if (!pending) return
        if (event.type === 'start') {
          if (pending.halted) return
          pending.running.add(event.id)
          activity()
        } else if (
          pending.running.delete(event.id) &&
          pending.halted &&
          !pending.running.size
        )
          finish(true)
      })
      const mutations =
        typeof MutationObserver === 'undefined'
          ? undefined
          : new MutationObserver(activity)
      mutations?.observe(document, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
      })
      let resources: PerformanceObserver | undefined
      try {
        if (
          typeof PerformanceObserver !== 'undefined' &&
          PerformanceObserver.supportedEntryTypes.includes('resource')
        ) {
          resources = new PerformanceObserver((list) => {
            if (
              list
                .getEntries()
                .some((entry) => !capture.isTransportUrl(entry.name))
            )
              activity()
          })
          resources.observe({ type: 'resource' })
        }
      } catch {}
      const listener = (event: Event) => {
        if (!active || !capture.enabled('logs') || !active) return
        if (
          event instanceof KeyboardEvent &&
          event.key !== 'Enter' &&
          event.key !== ' '
        )
          return
        if (!(event.target instanceof Element)) return
        let element: Element | null = event.target
        const attribute = options.attribute ?? 'data-faro-user-action-name'
        while (element && !element.hasAttribute(attribute))
          element = element.parentElement
        const name = element?.getAttribute(attribute)?.slice(0, 256)
        if (!name) return
        const generation = ++epoch
        installingIdentity?.()
        installingIdentity = undefined
        finish(true)
        if (
          !active ||
          generation !== epoch ||
          !capture.enabled('logs') ||
          !active
        )
          return
        const wall = Date.now(),
          mono = performance.now()
        const identity = { id: mintIdentityId(), name }
        const clearIdentity = setBrowserAction(capture, identity)
        installingIdentity = clearIdentity
        let snapshot: CaptureSnapshot
        try {
          snapshot = capture.snapshot()
        } catch {
          clearIdentity()
          if (installingIdentity === clearIdentity)
            installingIdentity = undefined
          return
        }
        if (installingIdentity === clearIdentity) installingIdentity = undefined
        if (!active || generation !== epoch) {
          clearIdentity()
          return
        }
        pending = {
          name,
          trigger: event.type,
          id: identity.id,
          wall,
          mono,
          snapshot,
          valid: false,
          running: new Set(),
          halted: false,
          clearIdentity,
          timer: setTimeout(() => finish(), initial),
        }
      }
      window.addEventListener('pointerdown', listener)
      window.addEventListener('keydown', listener)
      const dispose = capture.attach(() => {
        active = false
        epoch++
        installingIdentity?.()
        installingIdentity = undefined
        stopFrustration()
        stopActivity()
        removeMetadata()
        pending?.clearIdentity()
        if (pending) clearTimeout(pending.timer)
        pending = undefined
        mutations?.disconnect()
        resources?.disconnect()
        window.removeEventListener('pointerdown', listener)
        window.removeEventListener('keydown', listener)
      }, 'browser-actions')
      return { dispose }
    }),
  })
