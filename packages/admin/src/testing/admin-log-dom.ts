export interface ParsedLogItem {
  name: string
  content: string
  timestamp: string
  badges: Array<string>
  isError: boolean
}

export interface ParsedFrameDetail {
  atomName: string
  bodyText: string
  causeChainNames: Array<string>
  hasError: boolean
}

function normalizePreviewText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s*([\[\]\{\}:,])\s*/g, '$1')
    .trim()
}

export function getLogItems(root: ParentNode): Array<HTMLElement> {
  return Array.from(root.querySelectorAll('[data-frame-id]')).filter(
    (element): element is HTMLElement => element instanceof HTMLElement,
  )
}

export function parseLogItem(element: Element): ParsedLogItem {
  const timestamp =
    element.querySelector('[data-testid="log-item-timestamp"]')?.textContent ??
    ''
  const name =
    element.querySelector(':scope > div strong, :scope > div > span')
      ?.textContent ?? ''
  const badges = Array.from(element.querySelectorAll(':scope > div div span'))
    .map((badge) => normalizePreviewText(badge.textContent ?? ''))
    .filter((badge) => badge.length > 0)
  const content =
    Array.from(element.querySelectorAll(':scope > span'))
      .map((span) => span.textContent ?? '')
      .find((text) => text !== timestamp && !text.startsWith('#')) ?? ''

  return {
    timestamp,
    name,
    content: normalizePreviewText(content),
    badges,
    isError: badges.includes('error'),
  }
}

export function getLogItemsByName(
  root: ParentNode,
  name: string,
): Array<HTMLElement> {
  return getLogItems(root).filter((item) => parseLogItem(item).name === name)
}

export function getLastLogItemByName(
  root: ParentNode,
  name: string,
): HTMLElement | null {
  return getLogItemsByName(root, name).at(-1) ?? null
}

export function getLastLogItemMatching(
  root: ParentNode,
  predicate: (logItem: ParsedLogItem) => boolean,
): HTMLElement | null {
  return (
    getLogItems(root)
      .filter((item) => predicate(parseLogItem(item)))
      .at(-1) ?? null
  )
}

export function parseFrameDetail(root: ParentNode): ParsedFrameDetail | null {
  const detail = root.querySelector('[data-reatom-name="FrameDetail"]')
  if (!(detail instanceof HTMLElement)) return null

  const atomName = detail.querySelector('h3')?.textContent?.trim() ?? ''
  const causeChainSection = Array.from(detail.querySelectorAll('section')).find(
    (section) => section.textContent?.includes('Cause chain'),
  )
  const causeChainNames = Array.from(
    causeChainSection?.querySelectorAll('button') ?? [],
  ).map((button) => button.textContent?.trim() ?? '')

  return {
    atomName,
    bodyText: normalizePreviewText(detail.textContent ?? ''),
    causeChainNames,
    hasError:
      detail.querySelector('[data-testid="frame-error-panel"]') !== null,
  }
}
