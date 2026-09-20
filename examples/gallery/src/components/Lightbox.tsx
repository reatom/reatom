import { onEvent, wrap } from '@reatom/core'

import { ChoiceButton, IconButton } from '../design-system'
import { registerGlassSurface } from '../glassSurfaces'
import { resolveImageOrientationStyle } from '../image-engine/orientation'
import {
  bindLightboxDisplayTargetDebouncer,
  bindLightboxHideControlsAfterInactivity,
  bindLightboxResetSessionOnClose,
  bindLightboxSizedImageWindowSync,
  closeLightbox,
  copyLightboxImageAsJpeg,
  downloadLightboxImage,
  endLightboxPan,
  type GalleryImageModel,
  handleLightboxKeyDown,
  ignoreExifOrientation,
  lightboxControlsVisible,
  lightboxCounter,
  lightboxDetailsButtonLabel,
  lightboxDialogLabel,
  lightboxDisplayOrientationStyle,
  lightboxFavoriteButtonLabel,
  lightboxFullscreenButtonLabel,
  lightboxImage,
  lightboxImageCursor,
  lightboxImageFrameSize,
  lightboxImageTransform,
  lightboxIsFullscreen,
  lightboxOpen,
  lightboxPreloadImageElement,
  lightboxPreloadImageUrl,
  lightboxScrubberMax,
  lightboxScrubberValue,
  lightboxShowControlsFromPointer,
  lightboxZoomIn,
  lightboxZoomOut,
  lightboxZoomReset,
  moveLightboxPan,
  navigateLightbox,
  openLightboxAtVisibleIndex,
  resetLightboxSession,
  showLightboxScrubber,
  startLightboxPan,
  thumbnailWindow,
  toggleLightboxImageFavorite,
  visibleImages,
  visibleIndexMap,
} from '../model'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  CopyJpegIcon,
  DownloadIcon,
  FitIcon,
  FullscreenIcon,
  HeartIcon,
  InfoIcon,
  MinusIcon,
  PlusIcon,
} from './Icons'
import { lightboxChromeCss } from './lightboxChrome'
import { imageInfoPanelOpen } from './panelState'
import { Slideshow } from './Slideshow'

const navLayoutCss = `
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  z-index: 1010;
  font-size: 28px;
`

const fullscreenExitGuardMs = 500

const lightboxImageFrameCss = `
  display: flex;
  pointer-events: auto;
  > img,
  > canvas {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    outline: none;
    pointer-events: auto;
  }
`

const prepareFullImageElement = (
  model: GalleryImageModel,
  image: HTMLImageElement,
) => {
  image.alt = model.source.name
  image.draggable = false
  const orientationStyle = resolveImageOrientationStyle(
    model.meta.data()?.exif,
    ignoreExifOrientation(),
  )
  if (orientationStyle) {
    image.style.imageOrientation = orientationStyle
  } else {
    image.style.removeProperty('image-orientation')
  }
  return image
}

const prepareRawImageElement = (image: HTMLImageElement, name: string) => {
  image.alt = name
  image.draggable = false
  const orientationStyle = lightboxDisplayOrientationStyle()
  if (orientationStyle) {
    image.style.imageOrientation = orientationStyle
  } else {
    image.style.removeProperty('image-orientation')
  }
  return image
}

const LightboxThumbnailPreview = ({
  model,
  thumbnailUrl,
  onImageElement,
}: {
  model: GalleryImageModel
  thumbnailUrl: string
  onImageElement: (element: HTMLElement) => void
}) => (
  <img
    src={thumbnailUrl}
    alt={model.source.name}
    draggable={false}
    tabindex={-1}
    ref={onImageElement}
    style:image-orientation={lightboxDisplayOrientationStyle}
  />
)

const LightboxImageFrame = ({
  onImageElement,
}: {
  onImageElement: (element: HTMLElement) => void
}) => (
  <>
    {() => {
      const model = lightboxImage()
      if (!model) {
        return <div css="color: #fff; font-size: 18px;">No image selected</div>
      }

      return (
        <div
          id="lightbox-print"
          attr:data-caption={() => model.source.name}
          style:width={() => lightboxImageFrameSize().width}
          style:height={() => lightboxImageFrameSize().height}
          style:transform={lightboxImageTransform}
          css={lightboxImageFrameCss}
        >
          {() => {
            const thumbnailUrl = model.thumbnail.data()?.url

            // Subscribe to async data to keep the decode pipeline alive, but paint
            // from the artifact: disconnect wipes the canvas in place while
            // `.data()` can still hold that blank node until the next fulfill.
            model.sizedImage.data()
            const sizedCanvas = model.sizedImageArtifact()
            if (
              sizedCanvas &&
              sizedCanvas.width > 0 &&
              sizedCanvas.height > 0
            ) {
              sizedCanvas.setAttribute('role', 'img')
              sizedCanvas.setAttribute('aria-label', model.source.name)
              sizedCanvas.style.pointerEvents = 'auto'
              onImageElement(sizedCanvas)
              return sizedCanvas
            }

            // While sized decode is in flight, keep the loaded preview on screen.
            // Skip fullImage here — a preloaded undecoded <img> would blank the
            // frame until paint-size decode finishes.
            if (model.sizedImage.pending() > 0) {
              const rawDevelopedImage = model.rawDevelopedImage.data()
              if (rawDevelopedImage) {
                onImageElement(
                  prepareRawImageElement(rawDevelopedImage, model.source.name),
                )
                return rawDevelopedImage
              }

              const rawEmbeddedPreview = model.rawEmbeddedPreviewImage.data()
              if (rawEmbeddedPreview) {
                onImageElement(
                  prepareRawImageElement(rawEmbeddedPreview, model.source.name),
                )
                return rawEmbeddedPreview
              }

              if (!thumbnailUrl) return null
              return (
                <LightboxThumbnailPreview
                  model={model}
                  thumbnailUrl={thumbnailUrl}
                  onImageElement={onImageElement}
                />
              )
            }

            const fullImage = model.fullImage.data()
            if (fullImage) {
              onImageElement(prepareFullImageElement(model, fullImage))
              return fullImage
            }

            const rawDevelopedImage = model.rawDevelopedImage.data()
            if (rawDevelopedImage) {
              onImageElement(
                prepareRawImageElement(rawDevelopedImage, model.source.name),
              )
              return rawDevelopedImage
            }

            const rawEmbeddedPreview = model.rawEmbeddedPreviewImage.data()
            if (rawEmbeddedPreview) {
              onImageElement(
                prepareRawImageElement(rawEmbeddedPreview, model.source.name),
              )
              return rawEmbeddedPreview
            }

            if (!thumbnailUrl) return null
            return (
              <LightboxThumbnailPreview
                model={model}
                thumbnailUrl={thumbnailUrl}
                onImageElement={onImageElement}
              />
            )
          }}
        </div>
      )
    }}
  </>
)

const LightboxContent = () => {
  let lightboxElement: HTMLDivElement | null = null
  let lightboxImageElement: HTMLElement | null = null
  let focusFrame: number | null = null
  let fullscreenTransition: Promise<void> | null = null
  let fullscreenEnteredAt = 0

  const focusLightboxImage = () => {
    if (focusFrame !== null) cancelAnimationFrame(focusFrame)
    focusFrame = requestAnimationFrame(() => {
      focusFrame = null
      lightboxImageElement?.focus({ preventScroll: true })
    })
  }

  const setLightboxImageElement = (element: HTMLElement) => {
    lightboxImageElement = element
    element.tabIndex = -1
    focusLightboxImage()
  }

  const lightboxActivation = {
    activation: 'press' as const,
    stopPropagation: true,
    onBefore: lightboxShowControlsFromPointer,
    surface: 'viewer' as const,
  }

  const handleFullscreenToggle = () => {
    if (fullscreenTransition) return

    const fullscreenOpened = document.fullscreenElement === lightboxElement
    if (
      fullscreenOpened &&
      performance.now() - fullscreenEnteredAt < fullscreenExitGuardMs
    ) {
      return
    }

    const fullscreenPromise = fullscreenOpened
      ? document.exitFullscreen()
      : lightboxElement?.requestFullscreen()

    if (!fullscreenPromise) return

    fullscreenTransition = fullscreenPromise
    fullscreenPromise
      .catch(
        wrap(() => {
          lightboxIsFullscreen.set(
            document.fullscreenElement === lightboxElement,
          )
        }),
      )
      .finally(() => {
        fullscreenTransition = null
      })
  }

  return (
    <div
      id="gallery-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={lightboxDialogLabel}
      tabindex={-1}
      ref={(el) => {
        lightboxElement = el
        const stopHideControls = bindLightboxHideControlsAfterInactivity()
        const stopSessionReset = bindLightboxResetSessionOnClose()
        const stopDisplayTargetDebouncer = bindLightboxDisplayTargetDebouncer()
        const stopSizedImageWindowSync = bindLightboxSizedImageWindowSync()
        const updateFullscreenState = wrap(() => {
          const fullscreenOpened = document.fullscreenElement === el
          lightboxIsFullscreen.set(fullscreenOpened)
          if (fullscreenOpened) {
            fullscreenEnteredAt = performance.now()
            focusLightboxImage()
          }
        })

        el.focus({ preventScroll: true })
        focusLightboxImage()
        updateFullscreenState()
        const stopFullscreenListener = onEvent(
          document,
          'fullscreenchange',
          updateFullscreenState,
        )

        return () => {
          stopHideControls()
          stopSessionReset()
          stopDisplayTargetDebouncer()
          stopSizedImageWindowSync()
          stopFullscreenListener()
          if (focusFrame !== null) cancelAnimationFrame(focusFrame)
          resetLightboxSession()
          lightboxIsFullscreen.set(false)
          lightboxElement = null
          lightboxImageElement = null
        }
      }}
      attr:data-controls-visible={lightboxControlsVisible}
      on:keydown={handleLightboxKeyDown}
      on:click={(event: MouseEvent & { currentTarget: HTMLDivElement }) => {
        if (event.target === event.currentTarget) closeLightbox()
      }}
      on:mousedown={(event: MouseEvent) =>
        startLightboxPan(event.clientX, event.clientY)
      }
      on:mousemove={(event: MouseEvent) => {
        lightboxShowControlsFromPointer()
        moveLightboxPan(event.clientX, event.clientY)
      }}
      on:mouseup={endLightboxPan}
      on:mouseleave={endLightboxPan}
      css={`
        position: fixed;
        inset: 0;
        z-index: 1000;
        background: var(--overlay-bg);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        outline: none;
        user-select: none;
        --control-opacity: 1;
        --control-pointer: auto;
        &[data-controls-visible='false'] {
          --control-opacity: 0;
          --control-pointer: none;
        }
        @media (prefers-reduced-motion: reduce) {
          --control-opacity: 1;
          --control-pointer: auto;
        }
      `}
    >
      <div
        id="lightbox-toolbar"
        ref={registerGlassSurface('viewer')}
        css={`
          ${lightboxChromeCss}
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          z-index: 1010;
          background: linear-gradient(
            to bottom,
            var(--image-overlay),
            transparent
          );
        `}
      >
        <span
          aria-live="polite"
          aria-atomic="true"
          css="color: #fff; font-size: 14px; font-family: monospace;"
        >
          {() => lightboxCounter()}
        </span>
        <div
          style:margin-right={() => (imageInfoPanelOpen() ? '300px' : '0px')}
          css="display: flex; gap: 8px; align-items: center; transition: margin-right 0.3s ease;"
        >
          <IconButton
            {...lightboxActivation}
            label={lightboxFavoriteButtonLabel}
            title={lightboxFavoriteButtonLabel}
            selected={() => lightboxImage()?.favorite() ?? false}
            onClick={toggleLightboxImageFavorite}
          >
            {() => {
              const img = lightboxImage()
              return <HeartIcon filled={img?.favorite() ?? false} />
            }}
          </IconButton>
          <IconButton
            {...lightboxActivation}
            label="Download image"
            onClick={downloadLightboxImage}
          >
            <DownloadIcon />
          </IconButton>
          <IconButton
            {...lightboxActivation}
            label="Copy as JPEG"
            onClick={copyLightboxImageAsJpeg}
          >
            <CopyJpegIcon />
          </IconButton>
          <IconButton
            {...lightboxActivation}
            label="Zoom out"
            onClick={lightboxZoomOut}
          >
            <MinusIcon />
          </IconButton>
          <IconButton
            {...lightboxActivation}
            label="Reset zoom"
            onClick={lightboxZoomReset}
          >
            <FitIcon />
          </IconButton>
          <IconButton
            {...lightboxActivation}
            label={lightboxFullscreenButtonLabel}
            title={lightboxFullscreenButtonLabel}
            selected={lightboxIsFullscreen}
            onClick={handleFullscreenToggle}
          >
            <FullscreenIcon />
          </IconButton>
          <IconButton
            {...lightboxActivation}
            label="Zoom in"
            onClick={lightboxZoomIn}
          >
            <PlusIcon />
          </IconButton>
          <IconButton
            {...lightboxActivation}
            label={lightboxDetailsButtonLabel}
            title={lightboxDetailsButtonLabel}
            expanded={imageInfoPanelOpen}
            onClick={imageInfoPanelOpen.toggle}
          >
            <InfoIcon />
          </IconButton>
          <IconButton
            {...lightboxActivation}
            label="Close preview"
            onClick={closeLightbox}
          >
            <CloseIcon />
          </IconButton>
        </div>
      </div>

      <div
        id="lightbox-stage"
        style:cursor={lightboxImageCursor}
        css={`
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          overflow: hidden;
          padding: 60px 80px 120px;
          pointer-events: none;
        `}
      >
        <LightboxImageFrame onImageElement={setLightboxImageElement} />
      </div>

      {() => {
        lightboxPreloadImageElement()
        const preloadUrl = lightboxPreloadImageUrl()
        if (!preloadUrl) return null

        return (
          <img
            src={preloadUrl}
            alt=""
            aria-hidden="true"
            loading="eager"
            decoding="async"
            draggable={false}
            css="position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none;"
          />
        )
      }}

      <IconButton
        {...lightboxActivation}
        ref={registerGlassSurface('viewer')}
        label="Previous image"
        onClick={() => navigateLightbox(-1)}
        css={`
          ${lightboxChromeCss}
          ${navLayoutCss} left: 16px;
        `}
      >
        <ChevronLeftIcon />
      </IconButton>
      <IconButton
        {...lightboxActivation}
        ref={registerGlassSurface('viewer')}
        label="Next image"
        onClick={() => navigateLightbox(1)}
        css={`
          ${lightboxChromeCss}
          ${navLayoutCss} right: 16px;
        `}
      >
        <ChevronRightIcon />
      </IconButton>

      <Slideshow onControlPress={lightboxShowControlsFromPointer} />

      {() => {
        if (!showLightboxScrubber() || visibleImages().length <= 1) return null

        return (
          <label
            id="lightbox-scrubber"
            ref={registerGlassSurface('viewer')}
            css={`
              ${lightboxChromeCss}
              position: absolute;
              right: max(16px, calc(16px + var(--shadow-clearance, 0px)));
              bottom: 58px;
              display: grid;
              gap: 4px;
              min-width: min(260px, calc(100vw - 32px));
              padding: 8px 12px;
              border: var(--border-width) var(--control-border-style)
                rgba(255, 255, 255, 0.12);
              border-radius: var(--radius-md);
              background: var(--image-overlay);
              color: #fff;
              font-size: 11px;
              z-index: 1020;
              backdrop-filter: var(--panel-backdrop-filter);
              box-shadow: var(--glow);
            `}
          >
            <span>Folder position</span>
            <input
              type="range"
              min="0"
              max={lightboxScrubberMax}
              step="1"
              aria-label="Folder position"
              prop:value={lightboxScrubberValue}
              on:input={(event: Event) => {
                if (event.currentTarget instanceof HTMLInputElement) {
                  openLightboxAtVisibleIndex(event.currentTarget.valueAsNumber)
                }
              }}
              css="accent-color: var(--accent);"
            />
          </label>
        )
      }}

      <div
        id="lightbox-filmstrip"
        ref={registerGlassSurface('viewer')}
        css={`
          ${lightboxChromeCss}
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          gap: 4px;
          padding: 8px 16px 12px;
          background: linear-gradient(
            to top,
            var(--image-overlay),
            transparent
          );
          z-index: 1010;
          overflow-x: auto;
          [data-ui='button'] {
            border-radius: min(var(--radius-xs), 8px);
          }
        `}
      >
        {() =>
          thumbnailWindow().map((imageNode) => (
            <ChoiceButton
              {...lightboxActivation}
              selection="current"
              label={() => `View ${imageNode.source.name}`}
              title={() => `View ${imageNode.source.name}`}
              selected={() => lightboxImage()?.id === imageNode.id}
              onClick={() => {
                const index = visibleIndexMap().get(imageNode)
                if (index === undefined) return
                openLightboxAtVisibleIndex(index)
              }}
              css={`
                flex-shrink: 0;
                padding: 2px;
                overflow: hidden;
                opacity: 0.6;
                &[data-ui-selected='true'] {
                  opacity: 1;
                }
                @media (hover: hover) and (pointer: fine) {
                  &:hover {
                    opacity: 1;
                  }
                }
              `}
            >
              {/* Thumbnail only: falling back to `fullImage.data()` would
                  subscribe it and trigger a full-resolution decode for every
                  strip entry whose thumbnail is still loading. */}
              <img
                src={() => imageNode.thumbnail.data()?.url ?? ''}
                alt=""
                css={`
                  width: 60px;
                  height: 40px;
                  object-fit: cover;
                  border-radius: inherit;
                  display: block;
                `}
                draggable={false}
              />
            </ChoiceButton>
          ))
        }
      </div>
    </div>
  )
}

export const Lightbox = () => (
  <div css="display: contents;">
    {() => (lightboxOpen() ? <LightboxContent /> : null)}
  </div>
)
