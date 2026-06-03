import { atom, computed, peek } from '@reatom/core'

import {
  closeLightbox,
  lightboxCounter,
  lightboxImage,
  lightboxOpen,
  lightboxPanX,
  lightboxPanY,
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
  DownloadIcon,
  FitIcon,
  HeartIcon,
  MinusIcon,
  PlusIcon,
} from './Icons'
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

const lightboxImageFrameCss = `
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  pointer-events: none;
  > img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`

const LightboxContent = () => {
  const isPanning = atom(false, 'lightbox.isPanning')
  const panStartX = atom(0, 'lightbox.panStartX')
  const panStartY = atom(0, 'lightbox.panStartY')

  const displayImage = computed(() => {
    const model = lightboxImage()
    if (!model) return null
    const fullImage = model.fullImage.data()
    if (fullImage) {
      fullImage.alt = model.source.name
      fullImage.draggable = false
      return fullImage
    }
    const thumbnailUrl = model.thumbnail.data()?.url
    if (!thumbnailUrl) return null
    return <img src={thumbnailUrl} alt={model.source.name} draggable={false} />
  }, 'lightbox.displayImage')

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

  const handlePanStart = (e: MouseEvent) => {
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

  const handlePanEnd = () => isPanning.set(false)

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

  const handleFavoriteToggle = () => {
    const img = lightboxImage()
    if (img) img.favorite.toggle()
  }

  const handlePrev = (e: MouseEvent) => {
    e.stopPropagation()
    navigateLightbox(-1)
    resetLightboxPan()
  }

  const handleNext = (e: MouseEvent) => {
    e.stopPropagation()
    navigateLightbox(1)
    resetLightboxPan()
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        closeLightbox()
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        navigateLightbox(-1)
        resetLightboxPan()
        break
      case 'ArrowRight':
      case 'ArrowDown':
        navigateLightbox(1)
        resetLightboxPan()
        break
      case '-':
      case '_':
        e.preventDefault()
        zoomOut()
        break
      case '=':
      case '+':
        e.preventDefault()
        zoomIn()
        break
      case ' ':
        e.preventDefault()
        slideshowPlaying.toggle()
        break
    }
  }

  return (
    <div
      tabindex={-1}
      ref={(el) => el.focus()}
      on:keydown={handleKeyDown}
      on:mousedown={handlePanStart}
      on:mousemove={handlePanMove}
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
      `}
    >
      <div
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
        <div css="display: flex; gap: 8px; align-items: center;">
          <button
            on:click={handleFavoriteToggle}
            css={controlBtnCss}
            title="Favorite"
          >
            {() => {
              const img = lightboxImage()
              return <HeartIcon filled={img?.favorite() ?? false} />
            }}
          </button>
          <button
            on:click={handleDownload}
            css={controlBtnCss}
            title="Download"
          >
            <DownloadIcon />
          </button>
          <button on:click={zoomOut} css={controlBtnCss} title="Zoom out">
            <MinusIcon />
          </button>
          <button on:click={zoomReset} css={controlBtnCss} title="Fit">
            <FitIcon />
          </button>
          <button on:click={zoomIn} css={controlBtnCss} title="Zoom in">
            <PlusIcon />
          </button>
          <button on:click={closeLightbox} css={controlBtnCss} title="Close">
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
        `}
      >
        {() => {
          const img = lightboxImage()
          if (!img)
            return (
              <div css="color: #fff; font-size: 18px;">No image selected</div>
            )

          return (
            <div style:transform={imageTransform} css={lightboxImageFrameCss}>
              {() => displayImage()}
            </div>
          )
        }}
      </div>

      <button
        on:click={handlePrev}
        css={`
          ${navBtnCss} left: 16px;
        `}
      >
        <ChevronLeftIcon />
      </button>
      <button
        on:click={handleNext}
        css={`
          ${navBtnCss} right: 16px;
        `}
      >
        <ChevronRightIcon />
      </button>

      <Slideshow />

      <div
        css={`
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          gap: 4px;
          padding: 8px 16px 12px;
          background: linear-gradient(to top, var(--image-overlay), transparent);
          z-index: 1010;
          overflow-x: auto;
        `}
      >
        {() =>
          thumbnailWindow().map((imageNode) => (
            <button
              on:click={() => openLightbox(imageNode)}
              data-active={() => lightboxImage()?.id === imageNode.id}
              css={`
                flex-shrink: 0;
                padding: 2px;
                border: var(--border-width) var(--control-border-style) transparent;
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
