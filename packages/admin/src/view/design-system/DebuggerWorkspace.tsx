import { atom, bind, peek, type Atom } from '@reatom/core'

import { Drawer } from './Drawer'
import { isEditableField } from './layer'
import { SplitPane } from './SplitPane'
import { tokens } from './tokens'

/** Shell inline size at which the frame card sits beside the main view. */
export const DEBUGGER_WORKSPACE_SIDE_MIN = 680

const DEBUGGER_WORKSPACE_MIN_MAIN = 280
const DEBUGGER_WORKSPACE_MIN_INSPECTOR = 240
const DEBUGGER_WORKSPACE_DEFAULT_RATIO = 0.62

let workspaceCounter = 0

export interface DebuggerWorkspaceProps {
  header: Element
  filter: Element
  /**
   * The main view element. The shell reparents this node when the frame card
   * opens, closes, or the shell crosses 680px. Keep view state in atoms.
   */
  main: Element
  /**
   * Builds the frame card. Called when the card is shown, and again when the
   * shell crosses 680px. Pass null when there is nothing to inspect. Keep card
   * state in atoms.
   */
  inspector: (() => Element) | null
  /**
   * Dialog name when the card is a drawer, and the side region name when it is
   * beside the view.
   */
  inspectorLabel: string | (() => string)
  inspectorOpen: Atom<boolean>
  /** The owner sets `inspectorOpen` false and returns focus to the selected row. */
  onInspectorClose: () => void
  status: Element
}

/**
 * Header, filters, main view, frame card, and status. The frame card is a side
 * pane at 680px and wider, and a bottom drawer below that. The switch uses the
 * shell's width, not the viewport.
 */
export const DebuggerWorkspace = ({
  header,
  filter,
  main,
  inspector,
  inspectorLabel,
  inspectorOpen,
  onInspectorClose,
  status,
}: DebuggerWorkspaceProps) => {
  const workspaceId = ++workspaceCounter
  const narrow = atom(false, `_Admin.debuggerWorkspace.narrow.${workspaceId}`)
  const ratio = atom(
    DEBUGGER_WORKSPACE_DEFAULT_RATIO,
    `_Admin.debuggerWorkspace.ratio.${workspaceId}`,
  )
  const setNarrow = bind((value: boolean) => narrow.set(value))
  const closeInspector = bind(onInspectorClose)
  const mainPane = (
    <main
      css={`
        height: 100%;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
      `}
    >
      {main}
    </main>
  )

  const readLabel = () =>
    typeof inspectorLabel === 'function' ? inspectorLabel() : inspectorLabel
  const placement = () => {
    if (!inspectorOpen() || inspector === null) return 'closed' as const
    return narrow() ? ('drawer' as const) : ('side' as const)
  }

  return (
    <div
      data-reatom-name="DebuggerWorkspace"
      css={`
        container: admin-shell / inline-size;
        display: grid;
        grid-template-rows: auto auto minmax(0, 1fr) auto;
        height: 100%;
        min-height: 0;
        min-width: 0;
        position: relative;
        background: ${tokens.canvas};
        color: ${tokens.text1};
      `}
      ref={(shell) => {
        const syncWidth = () => {
          const width = shell.clientWidth
          if (width === 0) return
          setNarrow(width < DEBUGGER_WORKSPACE_SIDE_MIN)
        }
        syncWidth()
        const observer = new ResizeObserver(syncWidth)
        observer.observe(shell)
        const onKeyDown = (event: Event) => {
          if (!(event instanceof KeyboardEvent)) return
          if (event.key !== 'Escape') return
          if (inspector === null || !peek(inspectorOpen) || peek(narrow)) return
          if (isEditableField(event.target)) return
          event.preventDefault()
          event.stopPropagation()
          closeInspector()
        }
        shell.addEventListener('keydown', onKeyDown)
        return () => {
          observer.disconnect()
          shell.removeEventListener('keydown', onKeyDown)
        }
      }}
    >
      <header
        css={`
          min-width: 0;
          padding: var(--admin-space-8);
          border-bottom: 1px solid ${tokens.border1};
        `}
      >
        {header}
      </header>
      <section
        aria-label="Filters"
        css={`
          min-width: 0;
          padding: var(--admin-space-8);
          border-bottom: 1px solid ${tokens.border1};
        `}
      >
        {filter}
      </section>
      <div
        css={`
          min-height: 0;
          min-width: 0;
          position: relative;
        `}
      >
        {() => {
          const mode = placement()
          if (mode === 'side' && inspector) {
            return (
              <SplitPane
                ratio={ratio}
                left={mainPane}
                right={
                  <aside
                    aria-label={readLabel}
                    css={`
                      height: 100%;
                      min-width: 0;
                      min-height: 0;
                      overflow: hidden;
                    `}
                  >
                    {inspector()}
                  </aside>
                }
                minLeft={DEBUGGER_WORKSPACE_MIN_MAIN}
                minRight={DEBUGGER_WORKSPACE_MIN_INSPECTOR}
                defaultRatio={DEBUGGER_WORKSPACE_DEFAULT_RATIO}
              />
            )
          }
          return (
            <div
              css={`
                height: 100%;
                min-height: 0;
                min-width: 0;
              `}
            >
              {mainPane}
              {mode === 'drawer' && inspector ? (
                <Drawer
                  open={inspectorOpen}
                  label={readLabel}
                  onClose={onInspectorClose}
                >
                  {inspector()}
                </Drawer>
              ) : null}
            </div>
          )
        }}
      </div>
      <div
        css={`
          min-width: 0;
        `}
      >
        {status}
      </div>
    </div>
  )
}
