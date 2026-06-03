import { atom, effect, sleep, wrap } from '@reatom/core'

import { navigateLightbox, slideshowInterval, slideshowPlaying } from '../model'
import { PauseIcon, PlayIcon } from './Icons'
import { pressEvents } from './pressEvents'

const speedOptions = [
  { ms: 1000, label: '1s' },
  { ms: 3000, label: '3s' },
  { ms: 5000, label: '5s' },
  { ms: 10000, label: '10s' },
  { ms: 30000, label: '30s' },
] as const

const pillBtnCss = `
  background: var(--overlay-control);
  border: var(--border-width) var(--control-border-style) rgba(255, 255, 255, 0.12);
  color: #fff;
  padding: 4px 10px;
  border-radius: var(--radius-round);
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
  text-transform: var(--control-transform);
  &:hover { background: var(--overlay-control-hover); }
`

type SlideshowProps = {
  class?: string
  onControlPress?: () => void
}

export const Slideshow = ({
  class: className,
  onControlPress,
}: SlideshowProps = {}) => {
  const progressPercent = atom(0, 'slideshow._progress')
  const pressSlideshowControl = (action: () => void) => {
    const press = pressEvents(action)
    return {
      'on:mousedown': (event: MouseEvent) => {
        onControlPress?.()
        press['on:mousedown'](event)
      },
      'on:click': press['on:click'],
      'on:keydown': press['on:keydown'],
    }
  }

  const autoAdvance = effect(async () => {
    while (slideshowPlaying()) {
      const ms = slideshowInterval()
      const startedAt = Date.now()

      progressPercent.set(0)

      while (Date.now() - startedAt < ms) {
        await wrap(sleep(50))

        const elapsed = Date.now() - startedAt
        progressPercent.set(Math.min((elapsed / ms) * 100, 100))
      }

      navigateLightbox(1)
    }

    progressPercent.set(0)
  }, 'slideshow.autoAdvance')

  return (
    <div
      class={className}
      ref={() => autoAdvance.unsubscribe}
      css={`
        position: absolute;
        bottom: 52px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        background: var(--image-overlay);
        border: var(--border-width) var(--control-border-style)
          rgba(255, 255, 255, 0.12);
        border-radius: var(--radius-round);
        z-index: 1020;
        backdrop-filter: var(--panel-backdrop-filter);
        box-shadow: var(--glow);
      `}
    >
      <button
        {...pressSlideshowControl(slideshowPlaying.toggle)}
        type="button"
        title={() =>
          slideshowPlaying() ? 'Pause slideshow' : 'Play slideshow'
        }
        aria-label={() =>
          slideshowPlaying() ? 'Pause slideshow' : 'Play slideshow'
        }
        aria-pressed={slideshowPlaying}
        css={`
          ${pillBtnCss}
          width: 32px;
          height: 32px;
          border-radius: var(--radius-round);
          font-size: 14px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        `}
      >
        {() => (slideshowPlaying() ? <PauseIcon /> : <PlayIcon />)}
      </button>

      {speedOptions.map(({ ms, label }) => (
        <button
          {...pressSlideshowControl(() => slideshowInterval.set(ms))}
          type="button"
          title={() => `Slideshow speed ${label}`}
          aria-label={() => `Slideshow speed ${label}`}
          aria-pressed={() => slideshowInterval() === ms}
          data-active={() => slideshowInterval() === ms}
          css={`
            ${pillBtnCss}
            &[data-active='true'] {
              background: var(--accent);
              color: var(--accent-contrast);
              &:hover {
                background: var(--accent-hover);
              }
            }
          `}
        >
          {label}
        </button>
      ))}

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercent}
        aria-label="Slideshow progress"
        css={`
          width: 80px;
          height: 4px;
          background: var(--overlay-control);
          border-radius: var(--radius-round);
          overflow: hidden;
          margin-left: 4px;
        `}
      >
        <div
          style:width={() => `${progressPercent()}%`}
          css={`
            height: 100%;
            background: var(--accent);
            border-radius: var(--radius-round);
            transition: width 0.05s linear;
          `}
        />
      </div>
    </div>
  )
}
