import { addChangeHook, atom, reatomBoolean } from '@reatom/core'
import { mount, stylesheet } from '@reatom/jsx'

import type { Admin } from '../../index'
import type { AdminOptions } from '../../index'
import { createAdmin } from '../../index'
import { ADMIN_FRAME } from '../../root'
import { colors } from '../styles'
import { AppShell } from './AppShell'

const MAX_Z = 2 ** 32 - 1
let devtoolsCounter = 0

export interface AdminDevtoolsOptions extends AdminOptions {
  initVisibility?: boolean
}

export interface AdminDevtools {
  admin: Admin
  containerId: string
  show: () => void
  hide: () => void
}

export function createAdminDevtools(
  options: AdminDevtoolsOptions = {},
): AdminDevtools {
  const { initVisibility = true, ...adminOptions } = options

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
    const width = atom('520px', '_Admin.devtools.width')
    const height = atom('760px', '_Admin.devtools.height')
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
              `${Math.min(window.innerWidth * 0.95, window.innerWidth - pointerEvent.clientX)}px`,
            )
            height.set(
              `${Math.min(window.innerHeight * 0.95, window.innerHeight - pointerEvent.clientY)}px`,
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
            width.set(`${Math.min(window.innerWidth * 0.8, 800)}px`)
            height.set(`${Math.min(window.innerHeight * 0.92, 920)}px`)
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
        css:width={width}
        css:height={height}
        css={`
          all: initial;
          position: fixed;
          bottom: 1rem;
          right: 1rem;
          width: var(--width);
          height: var(--height);
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
            overflow: auto;
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
