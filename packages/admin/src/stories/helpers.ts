/*
General notes:
- Do NOT use `notify` in tests.
- Run (read / write / call) admin code only in ADMIN_FRAME, run example apps code (fixtures) in the main context of the test, NOT in ADMIN_FRAME
*/

import { sleep, urlAtom, wrap } from '@reatom/core'

import { ADMIN_FRAME } from '../root'
import { createAdminDevtools } from '../view'

export const SETTLE_MS = 50

export function getLogItems(root: DocumentFragment | Element): Element[] {
  return Array.from(root.querySelectorAll('[data-reatom-name="LogItem"]'))
}

export function getLogText(root: DocumentFragment | Element): string {
  return getLogItems(root)
    .map((el) => el.textContent ?? '')
    .join('\n')
}

export interface ParsedLogItem {
  name: string
  content: string
  timestamp: string
}

function normalizePreviewText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s*([\[\]\{\}:,])\s*/g, '$1')
    .trim()
}

export function parseLogItem(el: Element): ParsedLogItem {
  const timestamp = el.querySelector(':scope > span')?.textContent ?? ''
  const name =
    el.querySelector(':scope > div strong, :scope > div > span')?.textContent ??
    ''
  const content = Array.from(el.querySelectorAll(':scope > span'))
    .map((span) => span.textContent ?? '')
    .find((text) => text !== timestamp && !text.startsWith('#'))
    ?? ''
  return { timestamp, name, content: normalizePreviewText(content) }
}

export function getLogItemsByName(
  root: DocumentFragment | Element,
  name: string,
): Element[] {
  return getLogItems(root).filter((el) => parseLogItem(el).name === name)
}

export function findLogItem(
  root: DocumentFragment | Element,
  name: string,
  contentIncludes: string,
): Element | null {
  return (
    getLogItemsByName(root, name).find((el) =>
      parseLogItem(el).content.includes(contentIncludes),
    ) ?? null
  )
}

export function clickLogItem(el: Element): void {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

export function getFrameDetail(
  root: DocumentFragment | Element,
): Element | null {
  return root.querySelector('[data-reatom-name="FrameDetail"]')
}

export interface ParsedFrameDetail {
  atomName: string
  json: Record<string, unknown>
  causeChainNames: string[]
  hasError: boolean
}

export function parseFrameDetail(
  root: DocumentFragment | Element,
): ParsedFrameDetail | null {
  const detail = getFrameDetail(root)
  if (!detail) return null
  const h3 = detail.querySelector('h3')
  const atomName = h3?.textContent?.trim() ?? ''
  const jsonDiv = Array.from(detail.querySelectorAll('[data-reatom-name="JsonInspector"], details, div')).find(
    (element) =>
      element.textContent?.includes('state') ||
      element.textContent?.includes('payload') ||
      element.textContent?.includes('params'),
  )
  let json: Record<string, unknown> = {}
  if (jsonDiv?.textContent) {
    const normalizedText = normalizePreviewText(
      jsonDiv.textContent.replace(/value\s*/g, ''),
    )
    json = {
      raw: normalizedText,
    }
  }
  const causeChainDiv = Array.from(detail.querySelectorAll('section, div')).find(
    (element) => element.textContent?.includes('Cause chain'),
  )
  const causeChainButtons = causeChainDiv?.querySelectorAll('button') ?? []
  const causeChainNames = Array.from(causeChainButtons).map(
    (b) => b.textContent ?? '',
  )
  const errorDiv = Array.from(detail.querySelectorAll('div')).find(
    (element) =>
      element.textContent !== null &&
      element.textContent.length > 0 &&
      element.textContent.includes('Captured error'),
  )
  const hasError = errorDiv !== undefined
  return { atomName, json, causeChainNames, hasError }
}

export function getNavBadgeCount(root: DocumentFragment | Element): number {
  return getLogItems(root).length
}

export function typeInSearch(
  root: DocumentFragment | Element,
  query: string,
): void {
  const input = root.querySelector('input[type="search"]')
  if (!(input instanceof HTMLInputElement)) return
  input.value = query
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

export function getAllParsedLogs(
  root: DocumentFragment | Element,
): ParsedLogItem[] {
  return getLogItems(root).map(parseLogItem)
}

export function waitForLogItem(
  root: DocumentFragment | Element,
  name: string,
  contentIncludes?: string,
  timeoutMs: number = 5000,
): Promise<Element | null> {
  const predicate =
    contentIncludes !== undefined
      ? (r: DocumentFragment | Element) =>
          findLogItem(r, name, contentIncludes) !== null
      : (r: DocumentFragment | Element) =>
          getLogItemsByName(r, name).length >= 1
  return waitForDOM(root, predicate, timeoutMs).then(() =>
    contentIncludes !== undefined
      ? findLogItem(root, name, contentIncludes)
      : (getLogItemsByName(root, name)[0] ?? null),
  )
}

export function assertLogOrder(
  root: DocumentFragment | Element,
  expectedNames: string[],
): void {
  const items = getLogItems(root)
  const actualNames = items.map((el) => parseLogItem(el).name)
  let expectedIndex = 0
  for (const actual of actualNames) {
    if (expectedIndex >= expectedNames.length) break
    if (actual === expectedNames[expectedIndex]) {
      expectedIndex++
    }
  }
  if (expectedIndex < expectedNames.length) {
    throw new Error(
      `Expected log order to contain [${expectedNames.join(', ')}] in sequence, ` +
        `but got names [${actualNames.join(', ')}]. ` +
        `Missing: ${expectedNames.slice(expectedIndex).join(', ')}`,
    )
  }
}

export function assertExactLogNames(
  root: DocumentFragment | Element,
  expectedNames: string[],
): void {
  const actualNames = getLogItems(root).map((el) => parseLogItem(el).name)
  if (actualNames.length !== expectedNames.length) {
    throw new Error(
      `Expected exact log count ${expectedNames.length}, got ${actualNames.length}. ` +
        `Actual names: [${actualNames.join(', ')}]`,
    )
  }
  for (let index = 0; index < expectedNames.length; index++) {
    const expectedName = expectedNames[index]
    const actualName = actualNames[index]
    if (actualName !== expectedName) {
      throw new Error(
        `Expected exact log name "${expectedName}" at index ${index}, got "${actualName}". ` +
          `Actual names: [${actualNames.join(', ')}]`,
      )
    }
  }
}

const POLL_INTERVAL_MS = 16

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
    await wrap(sleep(POLL_INTERVAL_MS))
  }
}

export type AdminDevtoolsInstance = ReturnType<typeof createAdminDevtools>

export let currentDevtools: AdminDevtoolsInstance | null = null

export function clearCurrentDevtools(): void {
  currentDevtools = null
}

export function setCurrentDevtools(
  devtools: AdminDevtoolsInstance | null,
): void {
  currentDevtools = devtools
}

export function setup(): {
  shadowRoot: ShadowRoot
  admin: AdminDevtoolsInstance['admin']
  devtools: AdminDevtoolsInstance
  teardown: () => void
} {
  const devtools = createAdminDevtools()
  currentDevtools = devtools
  const { admin, containerId } = devtools

  ADMIN_FRAME.run(() => urlAtom.go('/'))

  const shadowRoot = document.getElementById(containerId)!.shadowRoot!

  const teardown = () => {
    ADMIN_FRAME.run(() => devtools.hide())
    admin.dispose()
    currentDevtools = null
  }

  return { shadowRoot, admin, devtools, teardown }
}

export { ADMIN_FRAME } from '../root'
