import { atom, computed, peek, wrap } from '@reatom/core'

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
import { Slideshow } from './Slideshow'

const controlBtnCss = `
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #eee;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: background 0.2s;
  &:hover { background: rgba(255, 255, 255, 0.25); }
`

const navBtnCss = `
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #eee;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, opacity 0.2s;
  z-index: 1010;
  opacity: 0.7;
  &:hover { background: rgba(255, 255, 255, 0.25); opacity: 1; }
`

const LightboxContent = () => {
  const isPanning = atom(false, 'lightbox.isPanning')
  const panStartX = atom(0, 'lightbox.panStartX')
  const panStartY = atom(0, 'lightbox.panStartY')

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

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
    lightboxZoom.set((z: number) => Math.max(0.1, Math.min(10, z * factor)))
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
    anchor.href = peek(img.fullImageUrl.data) ?? peek(img.thumbnail.data)?.url ?? ''
    anchor.download = img.name
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

  return (
    <div
      tabindex={-1}
      ref={(el) => {
        el.focus()

        const onKeyDown = wrap((e: KeyboardEvent) => {
          switch (e.key) {
            case 'Escape':
              closeLightbox()
              break
            case 'ArrowLeft':
              navigateLightbox(-1)
              resetLightboxPan()
              break
            case 'ArrowRight':
              navigateLightbox(1)
              resetLightboxPan()
              break
            case ' ':
              e.preventDefault()
              slideshowPlaying.toggle()
              break
          }
        })

        document.addEventListener('keydown', onKeyDown)
        el.addEventListener('wheel', handleWheel, { passive: false })

        return () => {
          document.removeEventListener('keydown', onKeyDown)
          el.removeEventListener('wheel', handleWheel)
        }
      }}
      on:mousedown={handlePanStart}
      on:mousemove={handlePanMove}
      on:mouseup={handlePanEnd}
      on:mouseleave={handlePanEnd}
      css={`
        position: fixed;
        inset: 0;
        z-index: 1000;
        background: rgba(0, 0, 0, 0.92);
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
            rgba(0, 0, 0, 0.6),
            transparent
          );
        `}
      >
        <span css="color: #eee; font-size: 14px; font-family: monospace;">
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
              return img?.favorite() ? '❤' : '♡'
            }}
          </button>
          <button
            on:click={handleDownload}
            css={controlBtnCss}
            title="Download"
          >
            ↓
          </button>
          <button on:click={zoomOut} css={controlBtnCss} title="Zoom out">
            −
          </button>
          <button on:click={zoomReset} css={controlBtnCss} title="Fit">
            1:1
          </button>
          <button on:click={zoomIn} css={controlBtnCss} title="Zoom in">
            +
          </button>
          <button on:click={closeLightbox} css={controlBtnCss} title="Close">
            ✕
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
              <div css="color: #eee; font-size: 18px;">No image selected</div>
            )
          return (
            <img
              src={() => img.fullImageUrl.data() ?? img.thumbnail.data()?.url ?? ''}
              alt={img.name}
              style:transform={imageTransform}
              css={`
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                transition: transform 0.15s ease-out;
                pointer-events: none;
              `}
              draggable={false}
            />
          )
        }}
      </div>

      <button
        on:click={handlePrev}
        css={`
          ${navBtnCss} left: 16px;
        `}
      >
        ‹
      </button>
      <button
        on:click={handleNext}
        css={`
          ${navBtnCss} right: 16px;
        `}
      >
        ›
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
          background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
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
                border: 2px solid transparent;
                background: none;
                cursor: pointer;
                border-radius: 4px;
                transition:
                  border-color 0.2s,
                  opacity 0.2s;
                opacity: 0.6;
                &[data-active='true'] {
                  border-color: #e94560;
                  opacity: 1;
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
                  border-radius: 2px;
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
