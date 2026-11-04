import { observeBrowserActivity } from '../browserActivity.ts'
import type { BrowserCapture, CaptureSnapshot } from '../browserCapture.ts'
type Click = {
  target: Element
  x: number
  y: number
  time: number
  wall: number
  response: boolean
  error: boolean
  selection: boolean
  scrolled: boolean
  snapshot: CaptureSnapshot
}
/** Bounded native Faro 2.13 click-burst semantics; never reads input/HTML text. */
export const installFrustration = (
  capture: BrowserCapture,
  attribute: string,
) => {
  let burst: Click[] = [],
    active = true,
    timer: ReturnType<typeof setTimeout> | undefined
  let pointer:
    | {
        time: number
        anchor: Node | null
        focus: Node | null
        anchorOffset: number
        focusOffset: number
      }
    | undefined
  let awaiting: Click[] = []
  let lastResponse = -Infinity,
    lastScroll = -Infinity
  let minute = Date.now(),
    reports = 0
  const timers = new Set<ReturnType<typeof setTimeout>>()
  const response = (scroll = false) => {
    const now = performance.now()
    lastResponse = now
    if (scroll) lastScroll = now
    awaiting = awaiting.filter((click) => now - click.time <= 100)
    for (const click of awaiting)
      if (now - click.time <= 100) {
        click.response = true
        if (scroll) click.scrolled = true
      }
  }
  const flush = (delay = 0) => {
    const clicks = burst
    burst = []
    clearTimeout(timer)
    if (timers.size >= 10) return
    const tid = setTimeout(() => {
      timers.delete(tid)
      if (!active || !capture.enabled('logs') || !clicks.length) return
      const rage =
        !clicks.some((click) => click.selection || click.scrolled) &&
        clicks.some(
          (click, index) =>
            index >= 2 && click.time - clicks[index - 2]!.time <= 1000,
        )
      const emit = (type: string, click: Click, count = 1) => {
        if (Date.now() - minute >= 60000) {
          minute = Date.now()
          reports = 0
        }
        if (reports++ >= 100) return
        let named: Element | null = click.target
        while (named && !named.hasAttribute(attribute))
          named = named.parentElement
        const name = named?.getAttribute(attribute)?.slice(0, 256)
        capture.log({
          eventName: `browser.frustration.${type}`,
          timeMs: click.wall,
          snapshot: click.snapshot,
          attributes: {
            target: click.target.tagName.toLowerCase(),
            clickCount: String(count),
            clientX: String(click.x),
            clientY: String(click.y),
            ...(name ? { userActionName: name } : {}),
            ...(type === 'rage_click'
              ? {
                  durationMs: String(
                    Math.round(clicks[clicks.length - 1]!.time - click.time),
                  ),
                }
              : {}),
          },
        })
      }
      if (rage) emit('rage_click', clicks[0]!, clicks.length)
      else
        for (const click of clicks) {
          if (click.error) emit('error_click', click)
          const target =
            (click.target.closest('label') as HTMLLabelElement | null)
              ?.control ?? click.target
          const native =
            target.closest('a[href], [contenteditable]') ||
            target instanceof HTMLTextAreaElement ||
            target instanceof HTMLSelectElement ||
            target instanceof HTMLCanvasElement ||
            (target instanceof HTMLInputElement &&
              ![
                'button',
                'checkbox',
                'radio',
                'range',
                'reset',
                'submit',
              ].includes(target.type))
          if (!clicks.some((c) => c.selection) && !click.response && !native)
            emit('dead_click', click)
        }
    }, delay)
    timers.add(tid)
  }
  const down = () => {
    const selection = window.getSelection()
    pointer = {
      time: performance.now(),
      anchor: selection?.anchorNode ?? null,
      focus: selection?.focusNode ?? null,
      anchorOffset: selection?.anchorOffset ?? 0,
      focusOffset: selection?.focusOffset ?? 0,
    }
  }
  const click = (event: MouseEvent) => {
    if (!active || !capture.enabled('logs')) return
    const target = event.composedPath()[0] ?? event.target
    if (!(target instanceof Element)) return
    const now = performance.now(),
      previous = burst[burst.length - 1],
      selection = window.getSelection()
    if (
      previous &&
      (previous.target !== target ||
        now - previous.time > 1000 ||
        Math.hypot(previous.x - event.clientX, previous.y - event.clientY) >
          100)
    )
      flush(100)
    if (burst.length >= 100) flush(100)
    const sample: Click = {
      target,
      x: event.clientX,
      y: event.clientY,
      time: now,
      wall: Date.now(),
      response: lastResponse >= (pointer?.time ?? now),
      error: false,
      selection:
        !!pointer &&
        (pointer.anchor !== selection?.anchorNode ||
          pointer.focus !== selection?.focusNode ||
          pointer.anchorOffset !== selection?.anchorOffset ||
          pointer.focusOffset !== selection?.focusOffset),
      scrolled: !!previous && lastScroll >= previous.time,
      snapshot: capture.snapshot(),
    }
    burst.push(sample)
    awaiting = awaiting.filter((click) => now - click.time <= 100).slice(-99)
    awaiting.push(sample)
    pointer = undefined
    clearTimeout(timer)
    timer = setTimeout(() => flush(), 1000)
  }
  const error = () => {
    const last = burst[burst.length - 1]
    if (last) last.error = true
  }
  const input = () => response()
  const scroll = () => response(true)
  const stopActivity = observeBrowserActivity(capture, (event) => {
    if (event.type === 'start') input()
  })
  const mutation =
    typeof MutationObserver === 'undefined'
      ? undefined
      : new MutationObserver(input)
  mutation?.observe(document, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
  })
  const listeners = [
    ['pointerdown', down],
    ['click', click],
    ['input', input],
    ['scroll', scroll],
    ['error', error],
    ['unhandledrejection', error],
  ] as const
  for (const [name, listener] of listeners)
    window.addEventListener(name, listener as EventListener, {
      capture: true,
      passive: true,
    })
  let observer: PerformanceObserver | undefined
  try {
    observer = new PerformanceObserver((list) => {
      if (
        list.getEntries().some((entry) => !capture.isTransportUrl(entry.name))
      )
        input()
    })
    observer.observe({ type: 'resource' })
  } catch {}
  return () => {
    active = false
    stopActivity()
    clearTimeout(timer)
    for (const tid of timers) clearTimeout(tid)
    timers.clear()
    burst = []
    awaiting = []
    pointer = undefined
    mutation?.disconnect()
    observer?.disconnect()
    for (const [name, listener] of listeners)
      window.removeEventListener(name, listener as EventListener, true)
  }
}
