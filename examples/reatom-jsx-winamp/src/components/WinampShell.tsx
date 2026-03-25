import { nextTrack, openFolder, prevTrack, toggleMute, togglePlay } from '../model'
import {
  bindPlayerShellHost,
  bindPlayerShellRoot,
  pictureInPictureActive,
} from '../windowControls'
import { AudioHost } from './AudioHost'
import { Playlist, focusPlaylistSearch } from './Playlist'
import { TitleBar } from './TitleBar'
import { Transport } from './Transport'
import { Visualizer } from './Visualizer'
import { VolumeSlider } from './VolumeSlider'

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target.isContentEditable) {
    return true
  }

  const tagName = target.tagName
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT'
}

function isShortcutBlockedTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (isEditableTarget(target)) {
    return true
  }

  return (
    target.closest('button') !== null ||
    target.closest('a') !== null ||
    target.closest('summary') !== null
  )
}

function bindShellRoot(element: HTMLElement | null) {
  bindPlayerShellRoot(element)

  if (element) {
    if (element.ownerDocument.activeElement === element.ownerDocument.body) {
      queueMicrotask(() => {
        element.focus()
      })
    }

    return () => {
      bindPlayerShellRoot(null)
    }
  }
}

function handleShellKeyDown(event: KeyboardEvent & { currentTarget: HTMLDivElement }) {
  if (event.repeat || isShortcutBlockedTarget(event.target)) {
    return
  }

  const key = event.key
  const normalizedKey = key.toLowerCase()

  if ((event.metaKey || event.ctrlKey) && normalizedKey === 'o') {
    event.preventDefault()
    if (openFolder.ready()) {
      void openFolder()
    }
    return
  }

  if (key === ' ') {
    event.preventDefault()
    void togglePlay()
    return
  }

  if (normalizedKey === '/') {
    event.preventDefault()
    focusPlaylistSearch()
    return
  }

  if (normalizedKey === 'm') {
    event.preventDefault()
    toggleMute()
    return
  }

  if (key === 'ArrowRight') {
    event.preventDefault()
    nextTrack()
    return
  }

  if (key === 'ArrowLeft') {
    event.preventDefault()
    prevTrack()
  }
}

function handleShellPointerDown(
  event: PointerEvent & { currentTarget: HTMLDivElement },
) {
  if (!isShortcutBlockedTarget(event.target)) {
    event.currentTarget.focus()
  }
}

export const WinampShell = () => {
  return (
    <>
      <AudioHost />
      <main
        ref={(element) => bindPlayerShellHost(element)}
        aria-label="Folder music player"
        css={`
          min-height: 100dvh;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: clamp(16px, 4vw, 32px) 12px;
        `}
      >
        <div
          ref={(element) => bindShellRoot(element)}
          data-player-shell="true"
          tabindex={0}
          on:keydown={(event) => handleShellKeyDown(event)}
          on:pointerdown={(event) => handleShellPointerDown(event)}
          css={() => `
            width: 100%;
            max-width: ${pictureInPictureActive() ? 'none' : 'var(--player-width)'};
            display: grid;
            gap: 6px;
            padding: ${pictureInPictureActive() ? '0' : '6px'};
            border-radius: 0;
            overflow: visible;
            background: ${pictureInPictureActive()
              ? 'transparent'
              : 'linear-gradient(180deg, var(--skin-chassis-top), var(--skin-chassis) 40%, var(--skin-chassis-bottom))'};
            border: ${pictureInPictureActive() ? 'none' : '1px solid var(--skin-border-dark)'};
            box-shadow:
              ${pictureInPictureActive() ? 'none' : 'var(--skin-shadow),'}
              inset 1px 1px 0 var(--skin-border-light),
              inset -1px -1px 0 #0f1230;
            outline: none;
          `}
        >
          {() => !pictureInPictureActive() && <TitleBar />}
          <Transport />
          <div
            css={`
              display: grid;
              grid-template-columns: minmax(0, 1fr) 78px;
              gap: 6px;
              align-items: stretch;
            `}
          >
            <Visualizer />
            <VolumeSlider />
          </div>
          <Playlist />
        </div>
      </main>
    </>
  )
}
