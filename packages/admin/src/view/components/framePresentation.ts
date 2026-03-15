import type { AdminAtom, AdminFrame } from '../../types'

export type FrameKind = 'atom' | 'action'
export type VisibleFieldName = 'state' | 'params' | 'payload'

export interface VisibleField {
  name: VisibleFieldName
  label: string
  value: unknown
  text: string
}

export interface FramePresentation {
  kind: FrameKind
  badgeLabel: string
  fields: Array<VisibleField>
  hasError: boolean
  error: unknown | null
  errorText: string | null
}

function stringifyValue(value: unknown, indent?: number): string {
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return JSON.stringify(value)
  try {
    const serialized = JSON.stringify(value, null, indent)
    return serialized ?? 'undefined'
  } catch {
    return String(value)
  }
}

export function getFrameKind(
  frame: AdminFrame,
  atom: AdminAtom | undefined,
): FrameKind {
  if (atom) {
    return atom.isReactive ? 'atom' : 'action'
  }

  if (frame.params !== undefined || frame.payload !== undefined) {
    return 'action'
  }

  return 'atom'
}

export function getFramePresentation(
  frame: AdminFrame,
  atom: AdminAtom | undefined,
): FramePresentation {
  const kind = getFrameKind(frame, atom)
  const hasError = frame.error !== null
  const fields: Array<VisibleField> =
    kind === 'atom'
      ? [
          {
            name: 'state',
            label: 'State',
            value: frame.state,
            text: stringifyValue(frame.state, 2),
          },
        ]
      : [
          {
            name: 'params',
            label: 'Params',
            value: frame.params ?? [],
            text: stringifyValue(frame.params ?? [], 2),
          },
          ...(frame.payload !== undefined
            ? [
                {
                  name: 'payload' as const,
                  label: 'Payload',
                  value: frame.payload,
                  text: stringifyValue(frame.payload, 2),
                },
              ]
            : []),
        ]

  return {
    kind,
    badgeLabel: kind === 'atom' ? 'atom' : 'action',
    fields,
    hasError,
    error: frame.error,
    errorText: hasError ? stringifyValue(frame.error, 2) : null,
  }
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toTimeString().slice(0, 8)
}

export function formatCompactValue(value: unknown, maxLength: number): string {
  const compactText = stringifyValue(value)
  return compactText.length > maxLength
    ? compactText.slice(0, maxLength - 1) + '…'
    : compactText
}

export function getCompactFieldPreviews(
  presentation: FramePresentation,
  maxLength: number,
): Array<{ name: VisibleFieldName; label: string; valueText: string }> {
  return presentation.fields.map((field) => ({
    name: field.name,
    label: field.label,
    valueText: formatCompactValue(field.value, maxLength),
  }))
}
