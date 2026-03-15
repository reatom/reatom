import { context } from '@reatom/core'
import { page } from 'vitest/browser'

import { clickLogItem, getLogItems, parseLogItem, setup } from '../stories/helpers'

export function getShadowRoot(containerId: string): ShadowRoot {
  const host = document.getElementById(containerId)
  if (!host?.shadowRoot) {
    throw new Error(`Missing shadow root for ${containerId}`)
  }
  return host.shadowRoot
}

export function getRect(root: ParentNode, selector: string): DOMRect {
  const element = root.querySelector(selector)
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Missing element ${selector}`)
  }
  return element.getBoundingClientRect()
}

export function getDevtoolsSelector(containerId: string): string {
  return `#${containerId}`
}

export function getDevtoolsHost(containerId: string): HTMLElement {
  const host = document.getElementById(containerId)
  if (!(host instanceof HTMLElement)) {
    throw new Error(`Missing devtools host ${containerId}`)
  }
  return host
}

export async function navigate(root: ShadowRoot, label: string): Promise<void> {
  const button = Array.from(root.querySelectorAll('button')).find((candidate) =>
    candidate.textContent?.includes(label),
  )
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing navigation button ${label}`)
  }

  button.click()
  await delay(80)
}

export async function waitForLogName(
  root: ShadowRoot,
  name: string,
): Promise<Element> {
  await waitForDOM(root, (currentRoot) =>
    getLogItems(currentRoot).some((item) => parseLogItem(item).name === name),
  )
  const item = getLogItems(root).find((entry) => parseLogItem(entry).name === name)
  if (!item) {
    throw new Error(`Log item ${name} was not found`)
  }
  return item
}

export async function openLogFrame(
  root: ShadowRoot,
  name: string,
  contentIncludes: string,
): Promise<void> {
  await waitForDOM(root, (currentRoot) =>
    getLogItems(currentRoot).some((item) => {
      const parsed = parseLogItem(item)
      return parsed.name === name && parsed.content.includes(contentIncludes)
    }),
  )
  const item = getLogItems(root).find((entry) => {
    const parsed = parseLogItem(entry)
    return parsed.name === name && parsed.content.includes(contentIncludes)
  })
  if (!item) {
    throw new Error(`Unable to open frame ${name}`)
  }
  clickLogItem(item)
}

export async function resizeViewport(
  width: number,
  height: number,
): Promise<void> {
  await page.viewport(width, height)
}

export function runInAppContext<T>(callback: () => T): T {
  return context.start(callback)
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export async function waitForDOM(
  root: DocumentFragment | Element,
  predicate: (root: DocumentFragment | Element) => boolean,
  timeoutMs: number = 5000,
): Promise<void> {
  const start = Date.now()
  while (true) {
    if (predicate(root)) return
    if (Date.now() - start >= timeoutMs) {
      throw new Error(`waitForDOM timed out after ${timeoutMs}ms`)
    }
    await delay(16)
  }
}

export { page, setup }
