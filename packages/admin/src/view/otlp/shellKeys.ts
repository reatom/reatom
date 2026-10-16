import type { Atom } from '@reatom/core'

import type { OtlpAdmin } from '../../otlp'
import { adminSettings } from '../settings'

export function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('input, textarea, select, [contenteditable="true"]') !== null
  )
}

export function handleAdminShellKey(
  shell: HTMLElement,
  event: KeyboardEvent,
  admin: OtlpAdmin,
  helpOpen: Atom<boolean>,
): void {
  if (isEditableTarget(event.target)) return
  if (event.key === 'Escape') return
  if (
    event.target instanceof Element &&
    event.target.closest('[role="tablist"]')
  ) {
    return
  }
  if (event.key === '?') {
    event.preventDefault()
    helpOpen.set(true)
    return
  }
  if (event.key === '/') {
    event.preventDefault()
    shell.querySelector<HTMLElement>('[data-testid="filter-name"]')?.focus()
    return
  }
  const plainKey = !event.metaKey && !event.ctrlKey && !event.altKey
  if (plainKey && (event.key === 'i' || event.key === 'I')) {
    event.preventDefault()
    adminSettings().icons.toggle()
    return
  }
  if (plainKey && (event.key === 'c' || event.key === 'C')) {
    event.preventDefault()
    adminSettings().colors.toggle()
    return
  }
  if (event.altKey && event.key === 'ArrowLeft') {
    event.preventDefault()
    admin.selectionBack()
    return
  }
  if (event.altKey && event.key === 'ArrowRight') {
    event.preventDefault()
    admin.selectionForward()
    return
  }
  const pathsUnit =
    admin.view() === 'timeline' && admin.timelineUnit() === 'paths'
  const paths = admin.analytics.paths
  if (event.key === 'ArrowDown' || event.key === 'j' || event.key === 'J') {
    event.preventDefault()
    if (pathsUnit) paths.moveSelection(1)
    else admin.ganttSelection.move(1)
    return
  }
  if (event.key === 'ArrowUp' || event.key === 'k' || event.key === 'K') {
    event.preventDefault()
    if (pathsUnit) paths.moveSelection(-1)
    else admin.ganttSelection.move(-1)
    return
  }
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    if (pathsUnit) {
      const selected = paths.selected()
      if (!selected) return
      event.preventDefault()
      if (event.key === 'ArrowRight') paths.expand(selected)
      else paths.collapse(selected)
      return
    }
    const selected = admin.gantt.selected()
    if (!selected) return
    event.preventDefault()
    if (event.key === 'ArrowRight') admin.gantt.expand(selected)
    else admin.gantt.collapse(selected)
    return
  }
  if (event.key !== 'Enter') return
  if (
    event.target instanceof Element &&
    event.target.closest('button, a, [role="tab"]')
  ) {
    return
  }
  event.preventDefault()
  if (pathsUnit) {
    if (paths.selected() === null) paths.moveSelection(1)
    if (paths.selected() !== null) admin.cardOpen.setTrue()
    return
  }
  if (admin.selectedRecord() === null) admin.ganttSelection.move(1)
  if (admin.selectedRecord() !== null) admin.cardOpen.setTrue()
}
