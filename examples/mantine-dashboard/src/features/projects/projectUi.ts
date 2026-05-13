import type { ProjectPriority, ProjectStatus } from '../../shared/api/types'

export const statusColor: Record<ProjectStatus, string> = {
  planned: 'gray',
  active: 'indigo',
  blocked: 'red',
  done: 'teal',
}

export const priorityColor: Record<ProjectPriority, string> = {
  low: 'gray',
  medium: 'yellow',
  high: 'red',
}

export const humanize = (value: string) =>
  value.replace(
    /(^|_)(\w)/g,
    (_, prefix: string, letter: string) =>
      `${prefix ? ' ' : ''}${letter.toUpperCase()}`,
  )
