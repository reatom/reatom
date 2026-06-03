
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

const decreaseGridColumns = () =>
  gridColumns.set((columns: number) => Math.max(columns - 1, 0))
const increaseGridColumns = () =>
  gridColumns.set((columns: number) => Math.min(columns + 1, 100))

function handleKeyDown(event: KeyboardEvent) {
  const tagName = (event.target as HTMLElement)?.tagName
  const isInputFocused =
    tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT'

  if (event.key === 'Escape') {
    if (lightboxOpen()) {
      closeLightbox()
    }
    return
  }

  if (lightboxOpen()) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      navigateLightbox(-1)
      return
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      navigateLightbox(1)
      return
    }
    if (event.key === ' ') {
      event.preventDefault()
      slideshowPlaying.toggle()
      return
    }
  }

  if (isInputFocused) return

  if (event.key === 'Delete' || event.key === 'Backspace') {
    clearSelection()
    return
  }

  if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
    event.preventDefault()
    selectAllImages()
    return
  }

  if (!lightboxOpen() && (event.key === '-' || event.key === '_')) {
    event.preventDefault()
    decreaseGridColumns()
    return
  }

  if (!lightboxOpen() && (event.key === '=' || event.key === '+')) {
    event.preventDefault()
    increaseGridColumns()
    return
  }

  if (event.key === 'f' || event.key === 'F') {
    const selected = imagesList.array().filter((m) => m.selected())
    for (const model of selected) {
      model.favorite.toggle()
    }

    return
  }

  if (event.key === 'g' || event.key === 'G') {
    const COLUMN_OPTIONS = [0, 2, 3, 4, 6, 8, 12]

    const currentIdx = COLUMN_OPTIONS.indexOf(gridColumns())
    const nextIdx = (currentIdx + 1) % COLUMN_OPTIONS.length
    gridColumns.set(COLUMN_OPTIONS[nextIdx]!)

    return
  }

  if (event.key === 't' || event.key === 'T') {
    if (theme() === 'light') {
      theme.setDark()
    } else {
      theme.setLight()
    }

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
