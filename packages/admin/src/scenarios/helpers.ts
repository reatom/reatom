import { context, sleep, wrap } from '@reatom/core'
import { page } from 'vitest/browser'

import { clickLogItem, getLogItems, parseLogItem, setup, waitForDOM } from '../stories/helpers'

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

export async function navigate(root: ShadowRoot, label: string): Promise<void> {
  void root
  const button = Array.from(root.querySelectorAll('button')).find((candidate) =>
    candidate.textContent?.includes(label),
  )
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing navigation button ${label}`)
  }

  button.click()
  await wrap(sleep(80))
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

export async function resizeViewport(width: number, height: number): Promise<void> {
  await wrap(page.viewport(width, height))
}

export function runInAppContext<T>(callback: () => T): T {
  return context.start(callback)
}

export { page, setup, waitForDOM }
