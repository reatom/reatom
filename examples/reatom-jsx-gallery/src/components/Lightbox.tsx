import { atom, computed, effect, peek, sleep, wrap } from '@reatom/core'

import { copyImageAsJpegToClipboard } from '../copyImage'
import {
  closeLightbox,
  lightboxCounter,
  lightboxImage,
  lightboxOpen,
  lightboxPanX,
  lightboxPanY,
  lightboxPreloadImageUrl,
  lightboxZoom,
  navigateLightbox,
  openLightbox,
  resetLightboxPan,
  slideshowPlaying,
  thumbnailWindow,
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
import { imageInfoPanelOpen } from './ImageInfoPanel'
import { pressEvents } from './pressEvents'
import { Slideshow } from './Slideshow'

const controlBtnCss = `
  background: var(--overlay-control);
  border: var(--border-width) var(--control-border-style) rgba(255, 255, 255, 0.12);
  color: #fff;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-round);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: background 0.2s;
  backdrop-filter: blur(12px);
  box-shadow: var(--glow);
  &:hover { background: var(--overlay-control-hover); }
`

const navBtnCss = `
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: var(--overlay-control);
  border: var(--border-width) var(--control-border-style) rgba(255, 255, 255, 0.12);
  color: #fff;
  width: 48px;
  height: 48px;
  border-radius: var(--radius-round);
  cursor: pointer;
  font-size: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, opacity 0.2s;
  z-index: 1010;
  opacity: 0.7;
  backdrop-filter: blur(12px);
  box-shadow: var(--glow);
  &:hover { background: var(--overlay-control-hover); opacity: 1; }
`

const controlsFadeDelay = 2500
const fullscreenExitGuardMs = 500

const lightboxImageFrameCss = `
  display: flex;
  pointer-events: auto;
  > img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    outline: none;
    pointer-events: auto;
  }
`

const LightboxContent = () => {
  const isPanning = atom(false, 'lightbox.isPanning')
  const isFullscreen = atom(false, 'lightbox.isFullscreen')
  const controlsVisible = atom(true, 'lightbox._controlsVisible')
  const controlsActivity = atom(0, 'lightbox._controlsActivity')
  const panStartX = atom(0, 'lightbox._panStartX')
  const panStartY = atom(0, 'lightbox._panStartY')
  let lightboxElement: HTMLDivElement | null = null
  let lightboxImageElement: HTMLImageElement | null = null
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

  const setLightboxImageElement = (element: HTMLImageElement) => {
    lightboxImageElement = element
    element.tabIndex = -1
    focusLightboxImage()
  }

  const hideControlsAfterInactivity = effect(async () => {
    controlsActivity()
    controlsVisible.set(true)

    await wrap(sleep(controlsFadeDelay))

    if (!peek(isPanning)) controlsVisible.set(false)
  }, 'lightbox._hideControlsAfterInactivity')

  const displayImage = computed(() => {
    const model = lightboxImage()
    if (!model) return null
    const fullImage = model.fullImage.data()
    if (fullImage) {
      fullImage.alt = model.source.name
      fullImage.draggable = false
      setLightboxImageElement(fullImage)
      return fullImage
    }
    const thumbnailUrl = model.thumbnail.data()?.url
    if (!thumbnailUrl) return null
    return (
      <img
        src={thumbnailUrl}
        alt={model.source.name}
        draggable={false}
        tabindex={-1}
        ref={setLightboxImageElement}
      />
    )
  }, 'lightbox.displayImage')

  const imageFrameSize = computed(() => {
    const model = lightboxImage()
    const width = model?.width() ?? 0
    const height = model?.height() ?? 0

    if (width <= 0 || height <= 0) {
      return {
        width: 'max(1px, calc(100vw - 160px))',
        height: 'max(1px, calc(100vh - 180px))',
      }
    }

    const ratio = width / height
    const viewportWidth = 'max(1px, calc(100vw - 160px))'
    const viewportHeight = 'max(1px, calc(100vh - 180px))'

    return {
      width: `min(${width}px, ${viewportWidth}, calc(${viewportHeight} * ${ratio}))`,
      height: `min(${height}px, ${viewportHeight}, calc(${viewportWidth} / ${ratio}))`,
    }
  }, 'lightbox.imageFrameSize')

  const imageTransform = computed(() => {
    const zoom = lightboxZoom()
    const x = lightboxPanX()
    const y = lightboxPanY()
    return zoom === 1 && x === 0 && y === 0
      ? 'none'
      : `translate(${x}px, ${y}px) scale(${zoom})`
  }, 'lightbox.imageTransform')

  const imageCursor = computed(
    () => (isPanning() ? 'grabbing' : lightboxZoom() > 1 ? 'grab' : 'default'),
    'lightbox.imageCursor',
  )

  const zoomIn = () => lightboxZoom.set((z: number) => Math.min(z * 1.5, 10))
  const zoomOut = () => lightboxZoom.set((z: number) => Math.max(z / 1.5, 0.1))
  const zoomReset = () => {
    lightboxZoom.set(1)
    resetLightboxPan()
  }

  const showControls = () => controlsActivity.set((activity) => activity + 1)
  const pressLightboxControl = (action: () => void) =>
    pressEvents(() => {
      showControls()
      action()
    })

  const fullscreenButtonLabel = computed(
    () => (isFullscreen() ? 'Exit fullscreen' : 'Enter fullscreen'),
    'lightbox.fullscreenButtonLabel',
  )
  const detailsButtonLabel = computed(() => {
    const image = lightboxImage()
    const action = imageInfoPanelOpen() ? 'Hide' : 'Show'
    return image
      ? `${action} details for ${image.source.name}`
      : 'Image details'
  }, 'lightbox.detailsButtonLabel')

  const handlePanStart = (e: MouseEvent) => {
    showControls()
    if (peek(lightboxZoom) <= 1) return
    isPanning.set(true)
    panStartX.set(e.clientX - peek(lightboxPanX))
    panStartY.set(e.clientY - peek(lightboxPanY))
  }

  const handlePanMove = (e: MouseEvent) => {
    if (!peek(isPanning)) return
    lightboxPanX.set(e.clientX - peek(panStartX))
    lightboxPanY.set(e.clientY - peek(panStartY))
  }

  const handleMouseMove = (e: MouseEvent) => {
    showControls()
    handlePanMove(e)
  }

  const handlePanEnd = () => {
    isPanning.set(false)
    showControls()
  }

  const handleDownload = () => {
    const img = lightboxImage()
    if (!img) return
    const anchor = document.createElement('a')
    anchor.href =
      peek(img.fullImageUrl.data) ?? peek(img.thumbnail.data)?.url ?? ''
    anchor.download = img.source.name
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
  }

  const handleCopyJpeg = () => {
    const img = lightboxImage()
    if (!img) return
    void copyImageAsJpegToClipboard(img).catch((error: unknown) => {
      console.error('Failed to copy image as JPEG:', error)
    })
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
      .catch(() => {
        isFullscreen.set(document.fullscreenElement === lightboxElement)
      })
      .finally(() => {
        fullscreenTransition = null
      })
  }

  const handleFavoriteToggle = () => {
    const img = lightboxImage()
    if (img) img.favorite.toggle()
  }

  const handlePrev = () => {
    navigateLightbox(-1)
    resetLightboxPan()
  }

  const handleNext = () => {
    navigateLightbox(1)
    resetLightboxPan()
  }

  const handleBackdropClick = (
    event: MouseEvent & { currentTarget: HTMLDivElement },
  ) => {
    if (event.target === event.currentTarget) closeLightbox()
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        e.stopPropagation()
        showControls()
        closeLightbox()
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault()
        e.stopPropagation()
        showControls()
        navigateLightbox(-1)
        resetLightboxPan()
        break
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault()
        e.stopPropagation()
        showControls()
        navigateLightbox(1)
        resetLightboxPan()
        break
      case '-':
      case '_':
        e.preventDefault()
        e.stopPropagation()
        showControls()
        zoomOut()
        break
      case '=':
      case '+':
        e.preventDefault()
        e.stopPropagation()
        showControls()
        zoomIn()
        break
      case ' ':
        e.preventDefault()
        e.stopPropagation()
        showControls()
        slideshowPlaying.toggle()
        break
    }
  }

  return (
    <div
      tabindex={-1}
      ref={(el) => {
        lightboxElement = el
        const unsubscribeAutoFade = hideControlsAfterInactivity.unsubscribe
        const updateFullscreenState = () => {
          const fullscreenOpened = document.fullscreenElement === el
          isFullscreen.set(fullscreenOpened)
          if (fullscreenOpened) {
            fullscreenEnteredAt = performance.now()
            focusLightboxImage()
          }
        }

        focusLightboxImage()
        updateFullscreenState()
        document.addEventListener('fullscreenchange', updateFullscreenState)

        return () => {
          unsubscribeAutoFade()
          document.removeEventListener(
            'fullscreenchange',
            updateFullscreenState,
          )
          if (focusFrame !== null) cancelAnimationFrame(focusFrame)
          isFullscreen.set(false)
          lightboxElement = null
          lightboxImageElement = null
        }
      }}
      attr:data-controls-visible={controlsVisible}
      on:keydown={handleKeyDown}
      on:click={handleBackdropClick}
      on:mousedown={handlePanStart}
      on:mousemove={handleMouseMove}
      on:mouseup={handlePanEnd}
      on:mouseleave={handlePanEnd}
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
        .lightbox-control-layer {
          opacity: 1;
          pointer-events: auto;
          transition: opacity 0.35s ease;
        }
        &[data-controls-visible='false'] .lightbox-control-layer {
          opacity: 0;
          pointer-events: none;
        }
        &[data-controls-visible='false'] .lightbox-control-layer:focus-within {
          opacity: 1;
          pointer-events: auto;
        }
      `}
    >
      <div
        class="lightbox-control-layer"
        css={`
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
        <span css="color: #fff; font-size: 14px; font-family: monospace;">
          {() => lightboxCounter()}
        </span>
        <div
          style:margin-right={() => (imageInfoPanelOpen() ? '300px' : '0px')}
          css="display: flex; gap: 8px; align-items: center; transition: margin-right 0.3s ease;"
        >
          <button
            {...pressLightboxControl(handleFavoriteToggle)}
            type="button"
            css={controlBtnCss}
            title="Favorite"
          >
            {() => {
              const img = lightboxImage()
              return <HeartIcon filled={img?.favorite() ?? false} />
            }}
          </button>
          <button
            {...pressLightboxControl(handleDownload)}
            type="button"
            css={controlBtnCss}
            title="Download"
          >
            <DownloadIcon />
          </button>
          <button
            {...pressLightboxControl(handleCopyJpeg)}
            type="button"
            css={controlBtnCss}
            title="Copy as JPEG"
            aria-label="Copy as JPEG"
          >
            <CopyJpegIcon />
          </button>
          <button
            {...pressLightboxControl(zoomOut)}
            type="button"
            css={controlBtnCss}
            title="Zoom out"
          >
            <MinusIcon />
          </button>
          <button
            {...pressLightboxControl(zoomReset)}
            type="button"
            css={controlBtnCss}
            title="Fit"
          >
            <FitIcon />
          </button>
          <button
            {...pressLightboxControl(handleFullscreenToggle)}
            type="button"
            css={controlBtnCss}
            title={fullscreenButtonLabel}
            aria-pressed={isFullscreen}
          >
            <FullscreenIcon />
          </button>
          <button
            {...pressLightboxControl(zoomIn)}
            type="button"
            css={controlBtnCss}
            title="Zoom in"
          >
            <PlusIcon />
          </button>
          <button
            {...pressLightboxControl(imageInfoPanelOpen.toggle)}
            type="button"
            css={controlBtnCss}
            title={detailsButtonLabel}
            aria-expanded={imageInfoPanelOpen}
          >
            <InfoIcon />
          </button>
          <button
            {...pressLightboxControl(closeLightbox)}
            type="button"
            css={controlBtnCss}
            title="Close"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      <div
        style:cursor={imageCursor}
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
        {() => {
          const img = lightboxImage()
          if (!img)
            return (
              <div css="color: #fff; font-size: 18px;">No image selected</div>
            )

          return (
            <div
              style:width={() => imageFrameSize().width}
              style:height={() => imageFrameSize().height}
              style:transform={imageTransform}
              css={lightboxImageFrameCss}
            >
              {() => displayImage()}
            </div>
          )
        }}
      </div>

      {() => {
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

      <button
        class="lightbox-control-layer"
        {...pressLightboxControl(handlePrev)}
        type="button"
        css={`
          ${navBtnCss} left: 16px;
        `}
      >
        <ChevronLeftIcon />
      </button>
      <button
        class="lightbox-control-layer"
        {...pressLightboxControl(handleNext)}
        type="button"
        css={`
          ${navBtnCss} right: 16px;
        `}
      >
        <ChevronRightIcon />
      </button>

      <Slideshow class="lightbox-control-layer" onControlPress={showControls} />

      <div
        class="lightbox-control-layer"
        css={`
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
        `}
      >
        {() =>
          thumbnailWindow().map((imageNode) => (
            <button
              {...pressLightboxControl(() => openLightbox(imageNode))}
              type="button"
              data-active={() => lightboxImage()?.id === imageNode.id}
              css={`
                flex-shrink: 0;
                padding: 2px;
                border: var(--border-width) var(--control-border-style)
                  transparent;
                background: none;
                cursor: pointer;
                border-radius: var(--radius-sm);
                transition:
                  border-color 0.2s,
                  opacity 0.2s;
                opacity: 0.6;
                &[data-active='true'] {
                  border-color: var(--accent);
                  opacity: 1;
                  box-shadow: var(--glow);
                }
                &:hover {
                  opacity: 1;
                }
              `}
            >
              <img
                src={() => imageNode.thumbnail.data()?.url ?? ''}
                css={`
                  width: 60px;
                  height: 40px;
                  object-fit: cover;
                  border-radius: var(--radius-xs);
                  display: block;
                `}
                draggable={false}
              />
            </button>
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
