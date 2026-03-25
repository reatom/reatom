import { atom } from '@reatom/core'
import { stylesheet } from '@reatom/jsx'

interface DocumentPictureInPictureController {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPictureController
  }
}

export const fullscreenActive = atom(false, 'fullscreenActive')

export const pictureInPictureActive = atom(false, 'pictureInPictureActive')

let shellHostElement: HTMLElement | null = null
let shellRootElement: HTMLElement | null = null
let pictureInPictureWindow: Window | null = null
let fullscreenListenerBound = false
let hostStylesheet: CSSStyleSheet | null = null
let pictureInPictureStylesheet: CSSStyleSheet | null = null

function canUseDom() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function syncFullscreenState() {
  if (!canUseDom()) {
    return
  }

  fullscreenActive.set(Boolean(document.fullscreenElement))
}

function ensureFullscreenListener() {
  if (!canUseDom() || fullscreenListenerBound) {
    return
  }

  document.addEventListener('fullscreenchange', syncFullscreenState)
  fullscreenListenerBound = true
  syncFullscreenState()
}

function getPictureInPictureController() {
  if (!canUseDom()) {
    return null
  }

  return window.documentPictureInPicture ?? null
}

function measurePictureInPictureSize() {
  const fallbackWidth = 560
  const fallbackHeight = 620

  if (!shellRootElement) {
    return {
      width: fallbackWidth,
      height: fallbackHeight,
    }
  }

  const { width, height } = shellRootElement.getBoundingClientRect()
  const nextWidth = Math.ceil(width) + 12
  const nextHeight = Math.ceil(height) + 24

  return {
    width: Math.max(420, Math.min(960, nextWidth || fallbackWidth)),
    height: Math.max(520, Math.min(1200, nextHeight || fallbackHeight)),
  }
}

function readStylesheetRules(sourceSheet: CSSStyleSheet) {
  try {
    return Array.from(sourceSheet.cssRules, (rule) => rule.cssText)
  } catch {
    return [] as string[]
  }
}

function appendStylesheetRules(
  targetSheet: CSSStyleSheet,
  rules: readonly string[],
) {
  const knownRules = new Set(readStylesheetRules(targetSheet))

  for (const rule of rules) {
    if (knownRules.has(rule)) {
      continue
    }

    try {
      targetSheet.insertRule(rule, targetSheet.cssRules.length)
      knownRules.add(rule)
    } catch {
      // ignore
    }
  }
}

function createDocumentStylesheet(targetDocument: Document) {
  const styleElement = targetDocument.createElement('style')
  targetDocument.head.append(styleElement)
  return styleElement.sheet
}

function copyStyleElement(
  sourceStyleElement: HTMLStyleElement,
  targetDocument: Document,
  skippedSheet: CSSStyleSheet | null,
) {
  if (sourceStyleElement.sheet === skippedSheet) {
    return
  }

  const nextStyleElement = targetDocument.createElement('style')
  const sourceRules = sourceStyleElement.sheet
    ? readStylesheetRules(sourceStyleElement.sheet)
    : []

  nextStyleElement.textContent =
    sourceRules.length > 0
      ? sourceRules.join('\n')
      : (sourceStyleElement.textContent ?? '')

  targetDocument.head.append(nextStyleElement)
}

function syncHostStylesheet() {
  if (hostStylesheet && pictureInPictureStylesheet) {
    appendStylesheetRules(
      hostStylesheet,
      readStylesheetRules(pictureInPictureStylesheet),
    )
  }

  if (hostStylesheet) {
    stylesheet.set(hostStylesheet)
  }

  pictureInPictureStylesheet = null
  hostStylesheet = null
}

function copyDocumentStyles(
  targetDocument: Document,
  activeStylesheet: CSSStyleSheet,
) {
  targetDocument.head.replaceChildren()

  for (const sourceNode of document.querySelectorAll(
    'style, link[rel="stylesheet"]',
  )) {
    if (sourceNode instanceof HTMLLinkElement) {
      targetDocument.head.append(sourceNode.cloneNode(true))
      continue
    }

    if (sourceNode instanceof HTMLStyleElement) {
      copyStyleElement(sourceNode, targetDocument, activeStylesheet)
    }
  }

  try {
    targetDocument.adoptedStyleSheets = document.adoptedStyleSheets.filter(
      (sheet) => sheet !== activeStylesheet,
    )
  } catch {
    // ignore
  }

  const dynamicStylesheet = createDocumentStylesheet(targetDocument)
  if (dynamicStylesheet) {
    appendStylesheetRules(
      dynamicStylesheet,
      readStylesheetRules(activeStylesheet),
    )
  }

  targetDocument.title = document.title

  return dynamicStylesheet
}

function restoreShellToHost() {
  if (!shellHostElement || !shellRootElement) {
    return
  }

  if (shellRootElement.parentElement !== shellHostElement) {
    shellHostElement.append(shellRootElement)
  }
}

function closePictureInPictureWindow() {
  if (!pictureInPictureWindow || pictureInPictureWindow.closed) {
    pictureInPictureWindow = null
    pictureInPictureActive.set(false)
    syncHostStylesheet()
    restoreShellToHost()
    return
  }

  pictureInPictureWindow.close()
  pictureInPictureWindow = null
  pictureInPictureActive.set(false)
  syncHostStylesheet()
  restoreShellToHost()
}

export function pictureInPictureSupported() {
  return getPictureInPictureController() !== null
}

export function bindPlayerShellHost(element: HTMLElement | null) {
  shellHostElement = element

  if (shellHostElement && shellRootElement && !pictureInPictureActive()) {
    restoreShellToHost()
  }
}

export function bindPlayerShellRoot(element: HTMLElement | null) {
  shellRootElement = element

  if (shellHostElement && shellRootElement && !pictureInPictureActive()) {
    restoreShellToHost()
  }
}

export async function togglePlayerPictureInPicture() {
  const controller = getPictureInPictureController()
  if (!controller || !shellRootElement || !shellHostElement) {
    return
  }

  if (pictureInPictureWindow && !pictureInPictureWindow.closed) {
    closePictureInPictureWindow()
    return
  }

  if (document.fullscreenElement) {
    await document.exitFullscreen()
  }

  try {
    hostStylesheet = stylesheet()
    const { width, height } = measurePictureInPictureSize()
    const nextWindow = await controller.requestWindow({
      width,
      height,
    })

    pictureInPictureWindow = nextWindow
    pictureInPictureActive.set(true)

    pictureInPictureStylesheet = copyDocumentStyles(
      nextWindow.document,
      hostStylesheet,
    )

    if (pictureInPictureStylesheet) {
      stylesheet.set(pictureInPictureStylesheet)
    }

    nextWindow.document.body.replaceChildren()
    nextWindow.document.body.style.margin = '0'
    nextWindow.document.body.style.minHeight = '100vh'
    nextWindow.document.body.style.display = 'flex'
    nextWindow.document.body.style.alignItems = 'stretch'
    nextWindow.document.body.style.justifyContent = 'flex-start'
    nextWindow.document.body.style.overflow = 'hidden'
    nextWindow.document.body.style.background =
      'linear-gradient(135deg, #0b0d11 0%, #06070b 42%, #11151d 100%)'

    nextWindow.addEventListener(
      'pagehide',
      () => {
        pictureInPictureWindow = null
        pictureInPictureActive.set(false)
        syncHostStylesheet()
        restoreShellToHost()
      },
      { once: true },
    )

    nextWindow.document.body.append(shellRootElement)
  } catch {
    pictureInPictureWindow = null
    pictureInPictureActive.set(false)
    syncHostStylesheet()
    restoreShellToHost()
  }
}

export async function togglePlayerFullscreen() {
  if (!canUseDom()) {
    return
  }

  ensureFullscreenListener()

  if (pictureInPictureActive()) {
    closePictureInPictureWindow()
  }

  if (document.fullscreenElement) {
    await document.exitFullscreen()
    return
  }

  const fullscreenTarget = shellHostElement ?? document.documentElement
  await fullscreenTarget.requestFullscreen()
}

export function closePlayerPage() {
  if (!canUseDom()) {
    return
  }

  closePictureInPictureWindow()
  window.close()

  window.setTimeout(() => {
    if (!window.closed) {
      window.location.replace('about:blank')
    }
  }, 120)
}

ensureFullscreenListener()
