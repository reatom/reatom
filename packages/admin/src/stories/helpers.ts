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
  kind: string
  previews: Record<string, string>
}

export function parseLogItem(el: Element): ParsedLogItem {
  const timestamp =
    el.querySelector('[data-slot="timestamp"]')?.textContent?.trim() ?? ''
  const name = el.querySelector('[data-slot="name"]')?.textContent?.trim() ?? ''
  const kind = el.querySelector('[data-slot="kind"]')?.textContent?.trim() ?? ''
  const previewElements = Array.from(
    el.querySelectorAll('[data-log-preview-field]'),
  )
  const previews = Object.fromEntries(
    previewElements.map((previewEl) => {
      const fieldName = previewEl.getAttribute('data-log-preview-field') ?? ''
      const fieldValue =
        previewEl
          .querySelector('[data-log-preview-value]')
          ?.textContent?.trim() ?? ''
      return [fieldName, fieldValue]
    }),
  )
  const content = Object.entries(previews)
    .map(([fieldName, value]) => `${fieldName}: ${value}`)
    .join(' | ')

  return { timestamp, name, content, kind, previews }
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
  kind: string
  openSections: string[]
}

function parseValueText(text: string): unknown {
  const normalizedText = text.trim()
  if (!normalizedText) return ''

  try {
    return JSON.parse(normalizedText) as unknown
  } catch {
    return normalizedText
  }
}

export function parseFrameDetail(
  root: DocumentFragment | Element,
): ParsedFrameDetail | null {
  const detail = getFrameDetail(root)
  if (!detail) return null
  const h3 = detail.querySelector('h3')
  const atomName = h3?.textContent?.trim() ?? ''
  const kind = detail.getAttribute('data-frame-kind') ?? ''
  const fieldElements = Array.from(
    detail.querySelectorAll('[data-frame-field]'),
  )
  const json = Object.fromEntries(
    fieldElements.map((fieldEl) => {
      const fieldName = fieldEl.getAttribute('data-frame-field') ?? ''
      const fieldValue =
        fieldEl.querySelector('[data-frame-field-value]')?.textContent ?? ''
      return [fieldName, parseValueText(fieldValue)]
    }),
  )
  const causeChainDiv = Array.from(detail.querySelectorAll('div')).find((d) =>
    d.textContent?.includes('Cause chain:'),
  )
  const causeChainButtons = causeChainDiv?.querySelectorAll('button') ?? []
  const causeChainNames = Array.from(causeChainButtons).map(
    (b) => b.textContent ?? '',
  )
  const hasError = fieldElements.some(
    (fieldEl) => fieldEl.getAttribute('data-frame-field') === 'error',
  )
  const openSections = Array.from(
    detail.querySelectorAll('[data-frame-section][open]'),
  ).map((sectionEl) => sectionEl.getAttribute('data-frame-section') ?? '')

  return { atomName, json, causeChainNames, hasError, kind, openSections }
}

export function getNavBadgeCount(root: DocumentFragment | Element): number {
  const nav = root.querySelector('[data-reatom-name="Nav"]')
  if (!nav) return 0
  const logButton = Array.from(nav.querySelectorAll('button')).find((btn) =>
    btn.textContent?.includes('Log'),
  )
  if (!logButton) return 0
  const spans = logButton.querySelectorAll('span')
  const badgeSpan = spans[spans.length - 1]
  if (!badgeSpan) return 0
  const num = Number.parseInt(badgeSpan.textContent ?? '0', 10)
  return Number.isNaN(num) ? 0 : num
}

export function typeInSearch(
  root: DocumentFragment | Element,
  query: string,
): void {
  const input = root.querySelector(
    'input[type="search"]',
  ) as HTMLInputElement | null
  if (!input) return
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
    devtools.hide()
    admin.dispose()
    currentDevtools = null
  }

  return { shadowRoot, admin, devtools, teardown }
}

export { ADMIN_FRAME } from '../root'
