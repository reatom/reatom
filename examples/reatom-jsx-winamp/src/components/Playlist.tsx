import { action, atom, computed, effect } from '@reatom/core'

import {
  clearQueue,
  currentSlot,
  folderLabel,
  playlist,
  playOrder,
  selectPlayOrderSlot,
} from '../model'

const playlistSearch = atom('', 'playlistSearch')

const playlistViewport = atom<HTMLElement | null>(null, 'playlistViewport')

const playlistSearchInput = atom<HTMLInputElement | null>(
  null,
  'playlistSearchInput',
)

const normalizedPlaylistSearch = computed(() => {
  return playlistSearch().trim().toLowerCase()
}, 'normalizedPlaylistSearch')

const visibleQueueSlots = computed(() => {
  const query = normalizedPlaylistSearch()
  const order = playOrder()
  const tracks = playlist()

  if (!query) {
    return order.map((_, slot) => slot)
  }

  return order.flatMap((playlistIndex, slot) => {
    const entry = tracks[playlistIndex]
    if (!entry) {
      return []
    }

    const searchableText =
      `${entry.fileName} ${entry.relativePath}`.toLowerCase()
    return searchableText.includes(query) ? [slot] : []
  })
}, 'visibleQueueSlots')

export const focusPlaylistSearch = action(() => {
  const input = playlistSearchInput()
  if (!input) {
    return
  }

  input.focus()
  input.select()
}, 'focusPlaylistSearch')

const clearPlaylistSearch = action(() => {
  playlistSearch.set('')
}, 'clearPlaylistSearch')

const revealCurrentTrack = action(() => {
  const viewport = playlistViewport()
  if (!viewport) {
    return
  }

  queueMicrotask(() => {
    const activeElement = viewport.querySelector('[data-current="true"]')
    if (activeElement instanceof HTMLElement) {
      activeElement.scrollIntoView({
        block: 'nearest',
      })
    }
  })
}, 'revealCurrentTrack')

const showCurrentTrack = action(() => {
  clearPlaylistSearch()
  revealCurrentTrack()
}, 'showCurrentTrack')

effect(() => {
  currentSlot()
  playOrder()
  playlist()
  revealCurrentTrack()
}, 'playlistAutoReveal')

function splitTrackPath(relativePath: string) {
  const segments = relativePath.split('/')
  return segments.pop() ?? relativePath
}

export const Playlist = () => {
  return (
    <div
      role="region"
      aria-label="Playlist"
      css={`
        display: grid;
        gap: 4px;
        padding: 4px;
        border: 1px solid var(--skin-border-dark);
        background: linear-gradient(
          180deg,
          rgba(95, 100, 148, 0.98) 0%,
          var(--skin-panel) 26%,
          var(--skin-panel-dark) 100%
        );
        box-shadow:
          inset 1px 1px 0 var(--skin-border-light),
          inset -1px -1px 0 var(--skin-panel-inset-dark);

        &::-webkit-scrollbar {
          width: 10px;
        }

        &::-webkit-scrollbar-track {
          background: #06070d;
        }

        &::-webkit-scrollbar-thumb {
          border: 2px solid #06070d;
          background: #9da5bc;
        }
      `}
    >
      <div
        css={`
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 0 6px;
          border: 1px solid rgba(0, 0, 0, 0.55);
          background: linear-gradient(
            180deg,
            rgba(44, 49, 91, 0.95) 0%,
            rgba(28, 31, 64, 0.95) 100%
          );
          box-shadow:
            inset 1px 1px 0 rgba(255, 255, 255, 0.22),
            inset -1px -1px 0 rgba(0, 0, 0, 0.28);
          color: #f4f6ff;
          font-family: var(--pixel-font);
          font-size: 9px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        `}
      >
        <span>Winamp Playlist</span>
        <span>
          {() => {
            const totalTracks = playOrder().length
            const activeTrack = currentSlot()
            if (activeTrack < 0 || totalTracks === 0) {
              return '--/--'
            }
            return `${String(activeTrack + 1).padStart(2, '0')}/${String(totalTracks).padStart(2, '0')}`
          }}
        </span>
      </div>
      <div
        css={`
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto auto;
          gap: 4px;
          align-items: center;
        `}
      >
        <input
          ref={(element) => {
            playlistSearchInput.set(element)
          }}
          type="search"
          prop:value={() => playlistSearch()}
          placeholder="filter"
          aria-label="Search playlist"
          on:input={(event) => {
            playlistSearch.set(event.currentTarget.value)
          }}
          on:keydown={(event) => {
            if (event.key === 'Escape') {
              if (playlistSearch()) {
                event.preventDefault()
                clearPlaylistSearch()
                return
              }
              const playerShell = event.currentTarget.closest(
                '[data-player-shell="true"]',
              )
              if (playerShell instanceof HTMLDivElement) {
                playerShell.focus()
              } else {
                event.currentTarget.blur()
              }
            }
          }}
          css={`
            width: 100%;
            height: 20px;
            padding: 0 6px;
            border: 1px solid #000000;
            background:
              linear-gradient(180deg, rgba(42, 94, 50, 0.22), transparent 28%),
              linear-gradient(
                180deg,
                var(--skin-display-bg),
                var(--skin-display-dark)
              );
            box-shadow:
              inset 1px 1px 0 rgba(133, 190, 133, 0.22),
              inset -1px -1px 0 #010401;
            color: var(--skin-display-text);
            font-family: var(--pixel-font);
            font-size: 9px;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            outline: none;
          `}
        />
        <button
          type="button"
          on:click={() => showCurrentTrack()}
          prop:disabled={() => playOrder().length === 0}
          css={`
            min-width: 30px;
            height: 20px;
            padding: 0 4px;
            border: 1px solid var(--skin-border-dark);
            background: linear-gradient(
              180deg,
              var(--skin-button-top) 0%,
              var(--skin-button-face) 55%,
              var(--skin-button-bottom) 100%
            );
            box-shadow:
              inset 1px 1px 0 #ffffff,
              inset -1px -1px 0 var(--skin-button-shadow-mid);
            color: var(--skin-button-text);
            font-family: var(--pixel-font);
            font-size: 8px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            cursor: pointer;
          `}
        >
          Cur
        </button>
        <button
          type="button"
          on:click={() => clearPlaylistSearch()}
          prop:disabled={() => playlistSearch().trim().length === 0}
          css={`
            min-width: 30px;
            height: 20px;
            padding: 0 4px;
            border: 1px solid var(--skin-border-dark);
            background: linear-gradient(
              180deg,
              var(--skin-button-top) 0%,
              var(--skin-button-face) 55%,
              var(--skin-button-bottom) 100%
            );
            box-shadow:
              inset 1px 1px 0 #ffffff,
              inset -1px -1px 0 var(--skin-button-shadow-mid);
            color: var(--skin-button-text);
            font-family: var(--pixel-font);
            font-size: 8px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            cursor: pointer;
          `}
        >
          Rst
        </button>
        <button
          type="button"
          on:click={() => clearQueue()}
          prop:disabled={() => playOrder().length === 0}
          css={`
            min-width: 30px;
            height: 20px;
            padding: 0 4px;
            border: 1px solid var(--skin-border-dark);
            background: linear-gradient(
              180deg,
              var(--skin-button-top) 0%,
              var(--skin-button-face) 55%,
              var(--skin-button-bottom) 100%
            );
            box-shadow:
              inset 1px 1px 0 #ffffff,
              inset -1px -1px 0 var(--skin-button-shadow-mid);
            color: var(--skin-button-text);
            font-family: var(--pixel-font);
            font-size: 8px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            cursor: pointer;
          `}
        >
          Clr
        </button>
      </div>
      {() => {
        const order = playOrder()
        const tracks = playlist()
        const slots = visibleQueueSlots()

        if (order.length === 0) {
          return (
            <div
              css={`
                min-height: 152px;
                display: grid;
                place-items: center;
                padding: 12px;
                border: 1px solid #000000;
                background:
                  linear-gradient(
                    180deg,
                    rgba(42, 94, 50, 0.22),
                    transparent 28%
                  ),
                  linear-gradient(
                    180deg,
                    var(--skin-display-bg),
                    var(--skin-display-dark)
                  );
                box-shadow:
                  inset 1px 1px 0 rgba(133, 190, 133, 0.22),
                  inset -1px -1px 0 #010401;
                color: var(--skin-display-dim);
                font-family: var(--pixel-font);
                font-size: 10px;
                letter-spacing: 0.08em;
                text-transform: uppercase;
              `}
            >
              Queue empty
            </div>
          )
        }

        if (slots.length === 0) {
          return (
            <div
              css={`
                min-height: 152px;
                display: grid;
                place-items: center;
                padding: 12px;
                border: 1px solid #000000;
                background:
                  linear-gradient(
                    180deg,
                    rgba(42, 94, 50, 0.22),
                    transparent 28%
                  ),
                  linear-gradient(
                    180deg,
                    var(--skin-display-bg),
                    var(--skin-display-dark)
                  );
                box-shadow:
                  inset 1px 1px 0 rgba(133, 190, 133, 0.22),
                  inset -1px -1px 0 #010401;
                color: var(--skin-display-dim);
                font-family: var(--pixel-font);
                font-size: 10px;
                letter-spacing: 0.08em;
                text-transform: uppercase;
              `}
            >
              No matches
            </div>
          )
        }

        return (
          <div
            ref={(element) => {
              if (element) {
                playlistViewport.set(element)
              }
            }}
            css={`
              min-height: 152px;
              max-height: 188px;
              overflow: auto;
              border: 1px solid #000000;
              background: #020304;
              box-shadow:
                inset 1px 1px 0 rgba(133, 190, 133, 0.1),
                inset -1px -1px 0 #010401;
              scrollbar-width: thin;
              scrollbar-color: #9da5bc #06070d;
            `}
          >
            <ol
              css={`
                margin: 0;
                padding: 4px;
                list-style: none;
                display: grid;
                gap: 2px;
              `}
            >
              {slots.map((slot) => {
                const playlistIndex = order[slot]
                const entry = tracks[playlistIndex]
                if (!entry) {
                  return null
                }

                const isCurrent = slot === currentSlot()
                const fileName = splitTrackPath(entry.relativePath)

                return (
                  <li>
                    <button
                      type="button"
                      title={entry.relativePath}
                      on:click={() => selectPlayOrderSlot(slot)}
                      prop:data-current={() => (isCurrent ? 'true' : 'false')}
                      prop:aria-current={() => (isCurrent ? 'true' : null)}
                      css={() => `
                        width: 100%;
                        display: grid;
                        grid-template-columns: auto minmax(0, 1fr);
                        gap: 6px;
                        align-items: center;
                        padding: 2px 4px;
                        border: 1px solid transparent;
                        background: ${isCurrent ? 'var(--skin-list-row-current)' : 'transparent'};
                        color: inherit;
                        cursor: pointer;
                        text-align: left;
                        font-family: var(--pixel-font);
                        font-size: 11px;

                        &:hover {
                          background: ${isCurrent ? 'var(--skin-list-row-current)' : 'var(--skin-list-row-hover)'};
                        }
                      `}
                    >
                      <span
                        css={() => `
                          color: ${isCurrent ? 'var(--skin-display-warn)' : 'var(--skin-list-index-muted)'};
                        `}
                      >
                        {isCurrent ? '>' : `${slot + 1}.`}
                      </span>
                      <span
                        css={() => `
                          min-width: 0;
                          overflow: hidden;
                          text-overflow: ellipsis;
                          white-space: nowrap;
                          color: ${isCurrent ? 'var(--skin-display-warn)' : 'var(--skin-list-name-muted)'};
                        `}
                      >
                        {fileName}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>
        )
      }}
      <div
        css={`
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 4px;
        `}
      >
        <span
          css={`
            min-width: 0;
            padding: 3px 4px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            border: 1px solid #000000;
            background:
              linear-gradient(180deg, rgba(42, 94, 50, 0.22), transparent 28%),
              linear-gradient(
                180deg,
                var(--skin-display-bg),
                var(--skin-display-dark)
              );
            box-shadow:
              inset 1px 1px 0 rgba(133, 190, 133, 0.22),
              inset -1px -1px 0 #010401;
            color: var(--skin-display-dim);
            font-family: var(--pixel-font);
            font-size: 8px;
            letter-spacing: 0.06em;
            text-transform: uppercase;
          `}
        >
          {() => {
            const name = folderLabel()
            if (name) {
              return `folder ${name}`
            }
            return playOrder().length > 0 ? 'saved queue' : 'no folder'
          }}
        </span>
        <span
          css={`
            min-width: 56px;
            padding: 3px 4px;
            text-align: center;
            border: 1px solid #000000;
            background:
              linear-gradient(180deg, rgba(42, 94, 50, 0.22), transparent 28%),
              linear-gradient(
                180deg,
                var(--skin-display-bg),
                var(--skin-display-dark)
              );
            box-shadow:
              inset 1px 1px 0 rgba(133, 190, 133, 0.22),
              inset -1px -1px 0 #010401;
            color: var(--skin-display-warn);
            font-family: var(--pixel-font);
            font-size: 8px;
            letter-spacing: 0.06em;
            text-transform: uppercase;
          `}
        >
          {() => `${visibleQueueSlots().length}/${playOrder().length}`}
        </span>
      </div>
    </div>
  )
}
