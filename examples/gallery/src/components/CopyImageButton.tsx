import { atom, effect, sleep, wrap } from '@reatom/core'

import { IconButton } from '../design-system'
import {
  copyLightboxImageAsJpeg,
  lightboxCopyState,
  lightboxImage,
  lightboxOpen,
  lightboxShowControlsFromPointer,
} from '../model'
import { CheckIcon, CopyJpegIcon } from './Icons'

const copy4KLongEdge = 3840
const largeImageLongEdge = 6000

export const CopyImageButton = () => {
  const expanded = atom(false, 'lightbox.copyResolutionExpanded')
  const touchOptionsVisible = !window.matchMedia('(hover: hover)').matches
  const largeImage = () => {
    const image = lightboxImage()
    return (
      !!image && Math.max(image.width(), image.height()) >= largeImageLongEdge
    )
  }
  const disabled = () =>
    copyLightboxImageAsJpeg.pending() > 0 ||
    (lightboxImage()?.thumbnailMeta.pending() ?? 0) > 0
  const label = () => {
    const state = lightboxCopyState()
    if (state === 'pending') return 'Copying image…'
    if (state === 'success') return 'Copied! Copy again'
    if (state === 'error') return 'Copy failed. Try again'
    return 'Copy as JPEG'
  }
  const copy = (maxLongEdge?: number) => {
    void copyLightboxImageAsJpeg(maxLongEdge).catch(() => {})
  }
  let trigger: HTMLButtonElement

  return (
    <div
      aria-busy={() => copyLightboxImageAsJpeg.pending() > 0}
      attr:data-copy-options-open={() => largeImage() && expanded()}
      on:mousedown={(event: MouseEvent) => event.stopPropagation()}
      on:mouseenter={() => expanded.set(true)}
      on:mouseleave={(
        event: MouseEvent & { currentTarget: HTMLDivElement },
      ) => {
        const focused = document.activeElement
        if (
          !focused?.matches(':focus-visible') ||
          !event.currentTarget.contains(focused)
        ) {
          expanded.set(false)
        }
      }}
      on:focusin={() => expanded.set(true)}
      on:focusout={(event: FocusEvent & { currentTarget: HTMLDivElement }) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          expanded.set(false)
        }
      }}
      on:keydown={(event: KeyboardEvent) => {
        if (event.key === 'Escape' && largeImage() && expanded()) {
          event.preventDefault()
          event.stopPropagation()
          trigger.focus({ preventScroll: true })
          expanded.set(false)
        }
      }}
      ref={() => {
        const reset = effect(() => {
          lightboxImage()
          lightboxOpen()
          expanded.set(false)
          copyLightboxImageAsJpeg.status.reset()
        }, 'lightbox.resetCopyResolution')
        const resetSuccess = effect(async () => {
          if (lightboxCopyState() !== 'success') return
          await wrap(sleep(3000))
          copyLightboxImageAsJpeg.status.reset()
        }, 'lightbox.resetCopySuccess')
        return () => {
          reset.unsubscribe()
          resetSuccess.unsubscribe()
        }
      }}
      css="position: relative; display: flex; align-items: center;"
    >
      <IconButton
        surface="viewer"
        stopPropagation
        onBefore={lightboxShowControlsFromPointer}
        label={label}
        title=""
        disabled={disabled}
        ref={(element) => {
          trigger = element
        }}
        onClick={() => copy()}
      >
        {() => {
          const state = lightboxCopyState()
          if (state === 'success') return <CheckIcon />
          if (state !== 'pending') return <CopyJpegIcon />
          return (
            <span
              aria-hidden="true"
              css={`
                width: 18px;
                height: 18px;
                border: 2px solid currentColor;
                border-right-color: transparent;
                border-radius: 50%;
                animation: copy-image-spin 0.8s linear infinite;
                @keyframes copy-image-spin {
                  to {
                    transform: rotate(360deg);
                  }
                }
                @media (prefers-reduced-motion: reduce) {
                  animation: none;
                }
              `}
            />
          )
        }}
      </IconButton>
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        css={`
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip-path: inset(50%);
          white-space: nowrap;
        `}
      >
        {() => {
          const state = lightboxCopyState()
          if (state === 'pending') return 'Copying image…'
          if (state === 'success') return 'Image copied'
          if (state === 'error') return 'Copy failed. Try again.'
          return ''
        }}
      </span>
      {() =>
        lightboxCopyState() === 'error' && (
          <span
            css={`
              position: absolute;
              top: calc(100% + 6px);
              right: calc(100% + 6px);
              white-space: nowrap;
              font-size: 12px;
              color: var(--text);
              background: var(--panel-bg);
              border-radius: var(--radius-sm);
              padding: 4px 8px;
              pointer-events: none;
            `}
          >
            Copy failed. Try again.
          </span>
        )
      }
      <div
        role="group"
        aria-label="Copy resized image"
        style:display={() =>
          largeImage() && (expanded() || touchOptionsVisible) ? 'flex' : 'none'
        }
        css={`
          position: absolute;
          top: 100%;
          left: 0;
          padding-top: 6px;
        `}
      >
        <IconButton
          surface="viewer"
          stopPropagation
          onBefore={lightboxShowControlsFromPointer}
          label="Copy at 4K"
          title=""
          disabled={disabled}
          onClick={() => copy(copy4KLongEdge)}
          css="font-size: 12px; font-weight: 700;"
        >
          4K
        </IconButton>
      </div>
    </div>
  )
}
