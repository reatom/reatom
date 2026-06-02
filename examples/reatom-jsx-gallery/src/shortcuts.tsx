import { wrap } from '@reatom/core'

import {
  clearSelection,
  closeLightbox,
  gridColumns,
  imagesList,
  lightboxOpen,
  navigateLightbox,
  selectAllImages,
  slideshowPlaying,
  theme,
} from './model'

function handleKeyDown(event: KeyboardEvent) {
  const tagName = (event.target as HTMLElement)?.tagName
  const isInputFocused =
    tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT'

  if (event.key === 'Escape') {
    if (lightboxOpen()) {
      wrap(() => closeLightbox())
    }
    return
  }

  if (lightboxOpen()) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      wrap(() => navigateLightbox(-1))
      return
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      wrap(() => navigateLightbox(1))
      return
    }
    if (event.key === ' ') {
      event.preventDefault()
      wrap(() => slideshowPlaying.toggle())
      return
    }
  }

  if (isInputFocused) return

  if (event.key === 'Delete' || event.key === 'Backspace') {
    wrap(() => clearSelection())
    return
  }

  if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
    event.preventDefault()
    wrap(() => selectAllImages())
    return
  }

  if (event.key === 'f' || event.key === 'F') {
    wrap(() => {
      const selected = imagesList.array().filter((m) => m.selected())
      for (const model of selected) {
        model.favorite.toggle()
      }
    })
    return
  }

  if (event.key === 'g' || event.key === 'G') {
    const COLUMN_OPTIONS = [0, 2, 3, 4, 6, 8, 12]
    wrap(() => {
      const currentIdx = COLUMN_OPTIONS.indexOf(gridColumns())
      const nextIdx = (currentIdx + 1) % COLUMN_OPTIONS.length
      gridColumns.set(COLUMN_OPTIONS[nextIdx]!)
    })
    return
  }

  if (event.key === 't' || event.key === 'T') {
    wrap(() => {
      theme() === 'light' ? theme.setDark() : theme.setLight()
    })
    return
  }
}

export const KeyboardShortcuts = () => {
  return (
    <div
      style={{ display: 'none' }}
      ref={() => {
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
      }}
    />
  )
}
