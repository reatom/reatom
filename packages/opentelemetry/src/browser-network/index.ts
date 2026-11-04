import type { BooleanAtom, Ext } from '@reatom/core'
import { assertFeature, featureControl } from '../feature.ts'
import type { BrowserTelemetry } from '../captureEngine.ts'
import { browserCaptureOf, type BrowserCapture } from '../browserCapture.ts'
import {
  startBrowserActivity,
  browserActionAttributes,
} from '../browserActivity.ts'
import { isObserving } from '../observation.ts'
export type BrowserNetworkOptions = {
  ignoreUrl?: (url: URL) => boolean
  propagateTraceparent?: readonly string[] | ((url: URL) => boolean)
}
type Sub = {
  capture: BrowserCapture
  options: BrowserNetworkOptions
  active: boolean
  activities: Set<() => void>
  pending: Set<NonNullable<ReturnType<BrowserCapture['span']>>>
}
type Patch = { subscribers: Set<Sub>; restore(): void }
const key = Symbol.for('@reatom/opentelemetry/browser-network')
const propagates = (sub: Sub, url: URL) => {
  try {
    if (!sub.active) return false
    const allow = sub.options.propagateTraceparent
    const allowed =
      typeof allow === 'function'
        ? allow(new URL(url.href))
        : allow?.includes(url.origin)
    return sub.active && allowed
  } catch {
    return false
  }
}
const installBrowserNetwork = (
  otel: BrowserTelemetry,
  options: BrowserNetworkOptions = {},
) => {
  const sink = browserCaptureOf(otel)
  if (!sink || typeof window === 'undefined') return { dispose() {} }
  const host = globalThis as typeof globalThis & { [key]?: Patch }
  let patch = host[key]
  if (!patch) {
    const subscribers = new Set<Sub>()
    const start = (raw: string, method: string) => {
      if (isObserving()) return []
      let url: URL
      try {
        url = new URL(raw, document.baseURI)
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return []
      } catch {
        return []
      }
      const publicUrl = new URL(url.href, document.baseURI)
      publicUrl.search = ''
      publicUrl.hash = ''
      publicUrl.username = ''
      publicUrl.password = ''
      return [...subscribers].flatMap((sub) => {
        const capture = sub.capture
        let skip = false
        try {
          skip = sub.options.ignoreUrl?.(new URL(url.href)) === true
        } catch {
          skip = true
        }
        if (
          !sub.active ||
          skip ||
          (!capture?.enabled('traces') && !capture?.enabled('logs')) ||
          capture.isTransportUrl(raw) ||
          !sub.active
        )
          return []
        const startTimeMs = Date.now()
        const snapshot = capture.snapshot()
        const actionAttributes = browserActionAttributes(capture)
        if (!sub.active) return []
        const stopActivity = startBrowserActivity(capture)
        const endActivity = () => {
          sub.activities.delete(endActivity)
          stopActivity()
        }
        sub.activities.add(endActivity)
        if (!sub.active) {
          endActivity()
          return []
        }
        let span: ReturnType<BrowserCapture['span']>
        try {
          span = capture.enabled('traces')
            ? capture.span({
                name: method,
                kind: 'client',
                startTimeMs,
                attributes: {
                  ...actionAttributes,
                  'http.request.method': method,
                  'url.full': publicUrl.href,
                },
                snapshot,
              })
            : undefined
        } catch {
          endActivity()
          return []
        }
        if (!sub.active) {
          span?.cancel()
          endActivity()
          return []
        }
        if (span) sub.pending.add(span)
        return [{ sub, span, url, startTimeMs, method, endActivity }]
      })
    }
    const finish = (
      started: ReturnType<typeof start>,
      status: number,
      error = false,
    ) => {
      const now = Date.now()
      for (const item of started) {
        item.endActivity()
        if (item.span) item.sub.pending.delete(item.span)
        if (item.sub.active)
          item.span?.finish({
            endTimeMs: now,
            name: item.method,
            error: error || status >= 400,
            attributes: {
              'http.request.method': item.method,
              'http.response.status_code': status,
              'http.request.duration': now - item.startTimeMs,
            },
          })
        else item.span?.cancel()
      }
    }
    const NativeRequest = globalThis.Request
    const nativeFetch = globalThis.fetch
    const wrappedFetch: typeof fetch = function (
      this: typeof globalThis,
      input,
      init,
    ) {
      if (arguments.length === 0 || (this != null && this !== globalThis))
        return Reflect.apply(nativeFetch, this, Array.from(arguments))
      let request: Request
      try {
        request = new NativeRequest(input, init)
      } catch (error) {
        return Promise.reject(error)
      }
      let started: ReturnType<typeof start> = []
      try {
        started = start(request.url, request.method)
        const propagate = started.find(
          ({ sub, span, url }) => span && propagates(sub, url),
        )
        if (propagate && !request.headers.has('traceparent'))
          request.headers.set('traceparent', propagate.span!.traceparent)
      } catch {}
      let result: Promise<Response>
      try {
        result = Reflect.apply(nativeFetch, this, [request])
      } catch (error) {
        finish(started, 0, true)
        throw error
      }
      return result.then(
        (response) => {
          finish(started, response.status)
          return response
        },
        (error) => {
          finish(started, 0, true)
          throw error
        },
      )
    }
    globalThis.fetch = wrappedFetch
    const proto = XMLHttpRequest.prototype
    const nativeOpen = proto.open,
      nativeSend = proto.send,
      nativeHeader = proto.setRequestHeader
    const readyStateGetter = Object.getOwnPropertyDescriptor(
      proto,
      'readyState',
    )!.get!
    const byteString = (value: unknown) => {
      const converted = `${value}`
      for (let i = 0; i < converted.length; i++)
        if (converted.charCodeAt(i) > 255)
          throw new TypeError('Value is not a ByteString')
      return converted
    }
    const state = new WeakMap<
      XMLHttpRequest,
      { url: string; method: string; traceparent: boolean; cancel?: () => void }
    >()
    const wrappedOpen = function (
      this: XMLHttpRequest,
      ...args: [
        string,
        string | URL,
        boolean?,
        (string | null)?,
        (string | null)?,
      ]
    ) {
      if (!(this instanceof XMLHttpRequest) || args.length < 2)
        return Reflect.apply(nativeOpen, this, args)
      Reflect.apply(readyStateGetter, this, [])
      const method = byteString(args[0])
      const url = `${args[1]}`
      const nativeArgs: unknown[] = [method, url]
      if (args.length > 2) nativeArgs.push(Boolean(args[2]))
      const username = args.length > 3 && args[3] != null ? `${args[3]}` : null
      if (args.length > 3) nativeArgs.push(username)
      const password = args.length > 4 && args[4] != null ? `${args[4]}` : null
      if (args.length > 4) nativeArgs.push(password)
      const previous = state.get(this)
      let absoluteUrl: string
      let policyUrl: URL
      try {
        const anchor = document.createElement('a')
        anchor.href = url
        absoluteUrl = anchor.href
        policyUrl = new URL(absoluteUrl)
        if (username !== null) policyUrl.username = username
        if (password !== null) policyUrl.password = password
      } catch {
        return Reflect.apply(nativeOpen, this, nativeArgs)
      }
      nativeArgs[1] = absoluteUrl
      const next = { method, url: policyUrl.href, traceparent: false }
      // OPENED is synchronous: application handlers may send or open again.
      state.set(this, next)
      try {
        const result = Reflect.apply(nativeOpen, this, nativeArgs)
        previous?.cancel?.()
        return result
      } catch (error) {
        if (state.get(this) === next) {
          if (previous) state.set(this, previous)
          else state.delete(this)
        }
        throw error
      }
    }
    const wrappedHeader: typeof proto.setRequestHeader = function (
      this: XMLHttpRequest,
      name,
      value,
    ) {
      Reflect.apply(readyStateGetter, this, [])
      if (arguments.length < 2)
        return Reflect.apply(nativeHeader, this, Array.from(arguments))
      const headerName = byteString(name)
      const headerValue = byteString(value)
      const result = Reflect.apply(nativeHeader, this, [
        headerName,
        headerValue,
      ])
      if (headerName.toLowerCase() === 'traceparent') {
        const entry = state.get(this)
        if (entry) entry.traceparent = true
      }
      return result
    }
    const wrappedSend: typeof proto.send = function (
      this: XMLHttpRequest,
      body,
    ) {
      const entry = state.get(this)
      const started = entry ? start(entry.url, entry.method) : []
      let settled = false
      const cleanup = () => {
        this.removeEventListener('readystatechange', changed, true)
        this.removeEventListener('loadend', ended, true)
      }
      const complete = () => {
        if (settled || state.get(this) !== entry) return
        settled = true
        const status = this.status
        cleanup()
        finish(started, status, status === 0)
      }
      const previousCancel = entry?.cancel
      const cancel = () => {
        if (settled) return
        settled = true
        cleanup()
        for (const { sub, span, endActivity } of started) {
          endActivity()
          if (span) sub.pending.delete(span)
          span?.cancel()
        }
      }
      if (entry) entry.cancel = cancel
      // Capture DONE before application completion handlers can reuse this XHR.
      const changed = () => {
        if (this.readyState === 4) complete()
      }
      const ended = () => {
        if (this.readyState === 4) complete()
      }
      this.addEventListener('readystatechange', changed, true)
      this.addEventListener('loadend', ended, true)
      try {
        if (entry && !entry.traceparent) {
          const item = started.find(
            ({ sub, span, url }) => span && propagates(sub, url),
          )
          if (item)
            Reflect.apply(nativeHeader, this, [
              'traceparent',
              item.span!.traceparent,
            ])
        }
        return Reflect.apply(nativeSend, this, [body])
      } catch (error) {
        settled = true
        cleanup()
        if (entry && state.get(this) === entry && entry.cancel === cancel)
          entry.cancel = previousCancel
        finish(started, 0, true)
        throw error
      }
    }
    proto.open = wrappedOpen
    proto.send = wrappedSend
    proto.setRequestHeader = wrappedHeader
    patch = host[key] = {
      subscribers,
      restore() {
        if (globalThis.fetch === wrappedFetch) globalThis.fetch = nativeFetch
        if (proto.open === wrappedOpen) proto.open = nativeOpen
        if (proto.send === wrappedSend) proto.send = nativeSend
        if (proto.setRequestHeader === wrappedHeader)
          proto.setRequestHeader = nativeHeader
        if (host[key] === this) delete host[key]
      },
    }
  }
  const sub: Sub = {
    capture: sink,
    options,
    active: true,
    pending: new Set(),
    activities: new Set(),
  }
  patch.subscribers.add(sub)
  const dispose = () => {
    if (!sub.active) return
    sub.active = false
    for (const stop of sub.activities) stop()
    sub.activities.clear()
    for (const pending of sub.pending) pending.cancel()
    sub.pending.clear()
    patch.subscribers.delete(sub)
    if (!patch.subscribers.size) patch.restore()
  }
  const detach = sink.attach(dispose, 'browser-network')
  return {
    dispose() {
      dispose()
      detach()
    },
  }
}

/** Eager optional capture controlled by its assigned requested-enable atom. */
export const withBrowserNetworkMonkeypatch =
  (
    options: BrowserNetworkOptions = {},
  ): Ext<BrowserTelemetry, { browserNetwork: BooleanAtom }> =>
  (otel) => {
    assertFeature(otel, 'browserNetwork')
    return {
      browserNetwork: featureControl(otel, 'browserNetwork', () =>
        installBrowserNetwork(otel, options),
      ),
    }
  }
