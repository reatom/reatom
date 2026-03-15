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
    const id = `_ReatomAdminDevtools_${++devtoolsCounter}`
    const container = globalThis.document.createElement('div')
    container.id = id
    const root = container.attachShadow({ mode: 'open' })
    const sheet = new CSSStyleSheet()
    root.adoptedStyleSheets = [sheet]
    stylesheet.set(sheet)

    const visible = reatomBoolean(initVisibility, '_Admin.devtools.visible')
    const width = atom('320px', '_Admin.devtools.width')
    const height = atom('400px', '_Admin.devtools.height')
    let folded: { width: string; height: string } | null = null
    let moved = false

    const handle = (
      <div
        aria-label="Reatom Admin devtools resize handle"
        tabindex={0}
        css={`
          position: absolute;
          top: -24px;
          left: -24px;
          width: 48px;
          height: 48px;
          background: ${colors.accent};
          border-radius: 8px;
          cursor: grab;
          z-index: ${MAX_Z};
        `}
        on:pointerdown={(e) => {
          ;(e.currentTarget as Element).setPointerCapture(
            (e as PointerEvent).pointerId,
          )
        }}
        on:pointermove={(e) => {
          const el = e.currentTarget as Element
          if (el.hasPointerCapture((e as PointerEvent).pointerId)) {
            moved = true
            folded = null
            width.set(
              `${Math.min(window.innerWidth * 0.95, window.innerWidth - (e as PointerEvent).clientX)}px`,
            )
            height.set(
              `${Math.min(window.innerHeight * 0.95, window.innerHeight - (e as PointerEvent).clientY)}px`,
            )
          }
        }}
        on:lostpointercapture={() => {
          moved = false
        }}
        on:pointerup={() => {
          if (moved) return
          if (folded) {
            width.set(folded.width)
            height.set(folded.height)
            folded = null
            return
          }
          const rect = container.getBoundingClientRect()
          if (rect.width + rect.height < 400) {
            width.set(`${Math.min(window.innerWidth * 0.8, 800)}px`)
            height.set(`${window.innerHeight + 40}px`)
          } else {
            folded = { width: width(), height: height() }
            width.set('0px')
            height.set('0px')
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
          bottom: 0;
          right: 0;
          width: var(--width);
          height: var(--height);
          z-index: ${MAX_Z};
          background: ${colors.bg};
          font-family: system-ui, sans-serif;
          font-size: 12px;
          box-sizing: border-box;
          overflow: hidden;
        `}
      >
        {handle}
        <div css="height: 100%; overflow: auto;">
          <AppShell admin={admin} />
        </div>
      </div>
    )

    const mountHost = document.createElement('div')
    root.append(mountHost)
    const mountPoint = document.createElement('div')
    mountHost.append(mountPoint)
    mount(mountPoint, panel)

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
      show: () => visible.setTrue(),
      hide: () => visible.setFalse(),
    }
  })
}
