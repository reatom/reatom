import type { Admin } from '../../index'
import type { AdminAtom, AdminFrame, AdminSession } from '../../types'
import { buttonBase, buttonGhost, colors, flex, flexWrap, gap } from '../styles'

export interface SessionControlsProps {
  admin: Admin
}

interface ImportedSessionPayload {
  session: AdminSession
  atoms: Record<string, AdminAtom>
  frames: Array<AdminFrame>
}

let importInputCounter = 0

function downloadJson(filename: string, data: unknown): void {
  const serialized = JSON.stringify(data, null, 2)
  const blob = new Blob([serialized], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function isImportedSessionPayload(
  value: unknown,
): value is ImportedSessionPayload {
  if (!value || typeof value !== 'object') return false

  if (!('session' in value) || !('atoms' in value) || !('frames' in value)) {
    return false
  }

  const session = value.session
  const atoms = value.atoms
  const frames = value.frames

  return (
    !!session &&
    typeof session === 'object' &&
    typeof session.id === 'string' &&
    typeof session.startedAt === 'number' &&
    !!atoms &&
    typeof atoms === 'object' &&
    Array.isArray(frames)
  )
}

export const SessionControls = ({ admin }: SessionControlsProps) => {
  const inputId = `admin-import-session-${++importInputCounter}`

  return (
    <div
      css={`
        ${flex}
        ${gap(2)}
        ${flexWrap}
        align-items: center;
      `}
    >
      <button
        type="button"
        css={buttonBase}
        on:click={() => {
          if (admin.reporter.paused()) {
            admin.reporter.paused.setFalse()
            return
          }
          admin.reporter.paused.setTrue()
        }}
      >
        {() => (admin.reporter.paused() ? 'Resume capture' : 'Pause capture')}
      </button>

      <button
        type="button"
        css={buttonGhost}
        on:click={() => {
          admin.reporter.clear()
          admin.store.clear()
        }}
      >
        Clear workspace
      </button>

      <button
        type="button"
        css={buttonGhost}
        on:click={() => {
          admin.session.start()
          admin.reporter.clear()
          admin.store.clear()
        }}
      >
        Start fresh session
      </button>

      <button
        type="button"
        css={buttonGhost}
        on:click={() => {
          const session = admin.store.exportSession()
          downloadJson(`reatom-admin-session-${session.session.id}.json`, session)
        }}
      >
        Export session
      </button>

      <label
        for={inputId}
        css={`
          ${buttonGhost}
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: ${colors.text};
        `}
      >
        Import replay
      </label>
      <input
        id={inputId}
        type="file"
        accept="application/json"
        css={`
          position: absolute;
          opacity: 0;
          pointer-events: none;
          width: 1px;
          height: 1px;
        `}
        on:change={(event: Event) => {
          const target = event.currentTarget
          if (!(target instanceof HTMLInputElement)) return
          const file = target.files?.[0]
          if (!file) return

          const reader = new FileReader()
          reader.onload = () => {
            if (typeof reader.result !== 'string') return
            const parsed: unknown = JSON.parse(reader.result)
            if (!isImportedSessionPayload(parsed)) return
            admin.store.importSession(parsed)
          }
          reader.readAsText(file)
          target.value = ''
        }}
      />
    </div>
  )
}
