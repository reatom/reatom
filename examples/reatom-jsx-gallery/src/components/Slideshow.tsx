import { atom, computed, effect, wrap } from '@reatom/core'

import { navigateLightbox, slideshowInterval, slideshowPlaying } from '../model'

const speedOptions = [
  { ms: 1000, label: '1s' },
  { ms: 3000, label: '3s' },
  { ms: 5000, label: '5s' },
  { ms: 10000, label: '10s' },
  { ms: 30000, label: '30s' },
] as const

const pillBtnCss = `
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #eee;
  padding: 4px 10px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
  &:hover { background: rgba(255, 255, 255, 0.25); }
`

export const Slideshow = () => {
  const progressPercent = atom(0, 'slideshow.progress')

  const playPauseIcon = computed(
    () => (slideshowPlaying() ? '⏸' : '▶'),
    'slideshow.playPauseIcon',
  )

  let advanceTimer: ReturnType<typeof setInterval> | undefined
  let progressTimer: ReturnType<typeof setInterval> | undefined
  let advanceStartTime = 0

  const stopTimers = () => {
    if (advanceTimer !== undefined) clearInterval(advanceTimer)
    if (progressTimer !== undefined) clearInterval(progressTimer)
    advanceTimer = undefined
    progressTimer = undefined
    try {
      progressPercent.set(0)
    } catch {
      // Context may be torn down during unmount
    }
  }

  effect(() => {
    stopTimers()
    const playing = slideshowPlaying()
    const ms = slideshowInterval()
    if (!playing) return

    advanceStartTime = Date.now()

    advanceTimer = window.setInterval(
      wrap(() => {
        navigateLightbox(1)
        advanceStartTime = Date.now()
        progressPercent.set(0)
      }),
      ms,
    )

    progressTimer = window.setInterval(
      wrap(() => {
        const elapsed = Date.now() - advanceStartTime
        progressPercent.set(Math.min((elapsed / ms) * 100, 100))
      }),
      50,
    )
  }, 'slideshow.autoAdvance')

  return (
    <div
      ref={() => stopTimers}
      css={`
        position: absolute;
        bottom: 52px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        background: rgba(0, 0, 0, 0.75);
        border-radius: 20px;
        z-index: 1020;
        backdrop-filter: blur(8px);
      `}
    >
      <button
        on:click={slideshowPlaying.toggle}
        css={`
          ${pillBtnCss}
          width: 32px;
          height: 32px;
          border-radius: 50%;
          font-size: 14px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        `}
      >
        {playPauseIcon}
      </button>

      {speedOptions.map(({ ms, label }) => (
        <button
          on:click={() => slideshowInterval.set(ms)}
          data-active={() => slideshowInterval() === ms}
          css={`
            ${pillBtnCss}
            &[data-active='true'] {
              background: #e94560;
              &:hover {
                background: #d63851;
              }
            }
          `}
        >
          {label}
        </button>
      ))}

      <div
        css={`
          width: 80px;
          height: 4px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 2px;
          overflow: hidden;
          margin-left: 4px;
        `}
      >
        <div
          style:width={() => `${progressPercent()}%`}
          css={`
            height: 100%;
            background: #e94560;
            border-radius: 2px;
            transition: width 0.05s linear;
          `}
        />
      </div>
    </div>
  )
}
