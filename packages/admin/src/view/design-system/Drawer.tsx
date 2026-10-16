import { bind } from '@reatom/core'

import { Button } from './Button'
import { activeElementOf, focusableIn } from './layer'
import { focusVisible, reducedMotion, scrollable } from './mixins'
import { soft, tokens, type } from './tokens'

let drawerCounter = 0

export interface DrawerProps {
  /** Atom that is true while the drawer is open. */
  open: () => boolean
  /**
   * Accessible name of the dialog. Also shown as the panel heading. A function
   * is read as a reactive child, so the heading updates without remounting.
   */
  label: string | (() => string)
  /** Called for Escape, Dismiss, and Close. The owner sets `open` false. */
  onClose: () => void
  children?: Element | Array<Element | string | null>
}

/**
 * Bottom dialog that stays in the mounted tree, including a shadow root. Place
 * it inside a positioned shell such as DebuggerWorkspace.
 */
export const Drawer = ({ open, label, onClose, children }: DrawerProps) => {
  const titleId = `_AdminDrawerTitle${++drawerCounter}`
  const close = bind(onClose)

  return (
    <div data-reatom-name="Drawer" css="display: contents;">
      {() =>
        open() ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            css={`
              position: absolute;
              inset: 0;
              z-index: 2;
              display: grid;
              align-items: end;
            `}
            ref={(dialog) => {
              const previous = activeElementOf(dialog)
              const restore =
                previous instanceof HTMLElement && !dialog.contains(previous)
                  ? previous
                  : null
              dialog.querySelector<HTMLElement>('[aria-label="Close"]')?.focus()

              const onKeyDown = (event: Event) => {
                if (!(event instanceof KeyboardEvent)) return
                if (event.key !== 'Escape' && event.defaultPrevented) return
                if (event.key === 'Escape') {
                  event.preventDefault()
                  event.stopPropagation()
                  close()
                  return
                }
                if (event.key !== 'Tab') return
                const items = focusableIn(dialog)
                if (items.length === 0) return
                const active = activeElementOf(dialog)
                const first = items[0]
                const last = items[items.length - 1]
                if (!first || !last) return
                if (event.shiftKey && active === first) {
                  event.preventDefault()
                  last.focus()
                } else if (!event.shiftKey && active === last) {
                  event.preventDefault()
                  first.focus()
                }
              }
              dialog.addEventListener('keydown', onKeyDown)
              return () => {
                dialog.removeEventListener('keydown', onKeyDown)
                if (restore?.isConnected) restore.focus()
              }
            }}
          >
            <button
              type="button"
              tabindex={-1}
              aria-label="Dismiss"
              css={`
                ${focusVisible}
                position: absolute;
                inset: 0;
                border: 0;
                padding: 0;
                background: ${soft(tokens.canvas, 55)};
                cursor: pointer;
              `}
              on:click={close}
            />
            <div
              css={`
                ${scrollable}
                ${reducedMotion}
                position: relative;
                z-index: 1;
                max-height: 70%;
                padding: var(--admin-space-12);
                background: ${tokens.surface1};
                border-top: 1px solid ${tokens.border1};
                color: ${tokens.text1};
                box-shadow: none;
                transition: transform var(--admin-motion-overlay) ease;
              `}
              on:click={(event: Event) => event.stopPropagation()}
            >
              <div
                css={`
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  gap: var(--admin-space-8);
                  margin-bottom: var(--admin-space-8);
                `}
              >
                <h2
                  id={titleId}
                  css={`
                    ${type.title}
                    margin: 0;
                  `}
                >
                  {label}
                </h2>
                <Button variant="ghost" label="Close" onClick={close} />
              </div>
              {children}
            </div>
          </div>
        ) : null
      }
    </div>
  )
}
