import { addChangeHook, atom, reatomBoolean } from '@reatom/core'
import { mount, stylesheet } from '@reatom/jsx'

import type { Admin } from '../../index'
import type { AdminOptions } from '../../index'
import { createAdmin } from '../../index'
import { ADMIN_FRAME } from '../../root'
import { colors } from '../styles'
import { AppShell } from './AppShell'

const MAX_Z = 2 ** 32 - 1
const MIN_PANEL_WIDTH = 360
const MIN_PANEL_HEIGHT = 320
const PANEL_MARGIN = 16
let devtoolsCounter = 0

export interface AdminDevtoolsOptions extends AdminOptions {
  initVisibility?: boolean
  initialWidth?: string
  initialHeight?: string
}

export interface AdminDevtools {
  admin: Admin
  containerId: string
  show: () => void
  hide: () => void
}

function parsePixelSize(value: string): number | null {
  if (!value.endsWith('px')) return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

function clampPanelWidth(value: string): string {
  const parsed = parsePixelSize(value)
  if (parsed === null) return value

  const maxWidth = Math.max(
    MIN_PANEL_WIDTH,
    window.innerWidth - PANEL_MARGIN * 2,
  )
  return `${Math.min(maxWidth, Math.max(MIN_PANEL_WIDTH, parsed))}px`
}

function clampPanelHeight(value: string): string {
  const parsed = parsePixelSize(value)
  if (parsed === null) return value

  const maxHeight = Math.max(
    MIN_PANEL_HEIGHT,
    window.innerHeight - PANEL_MARGIN * 2,
  )
  return `${Math.min(maxHeight, Math.max(MIN_PANEL_HEIGHT, parsed))}px`
}

export function createAdminDevtools(
  options: AdminDevtoolsOptions = {},
): AdminDevtools {
  const {
    initVisibility = true,
    initialWidth = '520px',
    initialHeight = '760px',
    ...adminOptions
  } = options

  const admin = createAdmin(adminOptions)

  return ADMIN_FRAME.run(() => {
    const previousStylesheet = stylesheet()
    const id = `_ReatomAdminDevtools_${++devtoolsCounter}`
    const container = globalThis.document.createElement('div')
    container.id = id
    const root = container.attachShadow({ mode: 'open' })
    const sheet = new CSSStyleSheet()
    root.adoptedStyleSheets = [sheet]

    for (const rule of Array.from(previousStylesheet.cssRules)) {
      sheet.insertRule(rule.cssText)
    }

    stylesheet.set(sheet)

    const visible = reatomBoolean(initVisibility, '_Admin.devtools.visible')
    const width = atom(clampPanelWidth(initialWidth), '_Admin.devtools.width')
    const height = atom(clampPanelHeight(initialHeight), '_Admin.devtools.height')
    let folded: { width: string; height: string } | null = null
    let moved = false

    const getPointerEvent = (event: Event): PointerEvent | null => {
      return event instanceof PointerEvent ? event : null
    }

    const handle = (
      <div
        aria-label="Reatom Admin devtools resize handle"
        tabindex={0}
        css={`
          position: absolute;
          top: 12px;
          left: 12px;
          width: 18px;
          height: 18px;
          background:
            linear-gradient(135deg, transparent 35%, ${colors.accent} 35%, ${colors.accent} 55%, transparent 55%),
            linear-gradient(135deg, transparent 55%, ${colors.textMuted} 55%, ${colors.textMuted} 70%, transparent 70%);
          border-radius: 6px;
          cursor: grab;
          z-index: ${MAX_Z};
          opacity: 0.7;
        `}
        on:pointerdown={(event: Event) => {
          const pointerEvent = getPointerEvent(event)
          if (!pointerEvent) return
          if (event.currentTarget instanceof Element) {
            event.currentTarget.setPointerCapture(pointerEvent.pointerId)
          }
        }}
        on:pointermove={(event: Event) => {
          const pointerEvent = getPointerEvent(event)
          if (!(event.currentTarget instanceof Element) || !pointerEvent) return

          if (event.currentTarget.hasPointerCapture(pointerEvent.pointerId)) {
            moved = true
            folded = null
            width.set(
              clampPanelWidth(
                `${window.innerWidth - pointerEvent.clientX}px`,
              ),
            )
            height.set(
              clampPanelHeight(
                `${window.innerHeight - pointerEvent.clientY}px`,
              ),
            )
          }
        }}
        on:lostpointercapture={() => {
          moved = false
        }}
        on:pointerup={() => {
          if (moved) return
          const rect = container.getBoundingClientRect()
          if (rect.width + rect.height < 400) {
            width.set(clampPanelWidth('560px'))
            height.set(clampPanelHeight('760px'))
          } else {
            folded = { width: width(), height: height() }
            width.set('76px')
            height.set('76px')
          }
        }}
      />
    )

    const panel = (
      <div
        data-reatom-name="DevtoolsPanel"
        css:width={width}
        css:height={height}
        css={`
          all: initial;
          position: fixed;
          inset-inline-end: 1rem;
          inset-block-end: 1rem;
          width: var(--width);
          height: var(--height);
          max-width: calc(100vw - 2rem);
          max-height: calc(100vh - 2rem);
          z-index: ${MAX_Z};
          background: ${colors.bg};
          border: 1px solid ${colors.borderStrong};
          border-radius: 24px;
          box-shadow: 0 40px 80px -36px ${colors.shadow};
          font-family: system-ui, sans-serif;
          font-size: 12px;
          box-sizing: border-box;
          overflow: hidden;
        `}
      >
        {handle}
        <div
          css={`
            height: 100%;
            min-height: 0;
            overflow: hidden;
            border-radius: inherit;
          `}
        >
          <AppShell admin={admin} />
        </div>
      </div>
    )

    const mountHost = document.createElement('div')
    root.append(mountHost)
    const mountPoint = document.createElement('div')
    mountHost.append(mountPoint)
    const { unmount: unmountPanel } = mount(mountPoint, panel)

    let bodyMount: { unmount: () => void } | null = null
    if (visible()) {
      bodyMount = mount(document.body, container)
    }

    addChangeHook(visible, (state) => {
      if (state) {
        bodyMount = mount(document.body, container)
      } else {
        bodyMount?.unmount()
        bodyMount = null
      }
    })

    return {
      admin,
      containerId: id,
      show: () => {
        ADMIN_FRAME.run(() => visible.setTrue())
      },
      hide: () => {
        ADMIN_FRAME.run(() => visible.setFalse())
      },
    }
  })
}
