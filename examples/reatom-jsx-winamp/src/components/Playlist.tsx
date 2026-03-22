import { currentSlot, playlist, playOrder, selectPlayOrderSlot } from '../model'

export const Playlist = () => {
  return (
    <div
      role="region"
      aria-label="Playlist"
      css={`
        flex: 1;
        min-height: 160px;
        max-height: 280px;
        overflow: auto;
        padding: 10px;
        background:
          linear-gradient(180deg, rgba(5, 6, 7, 0.98), rgba(9, 11, 12, 1)),
          repeating-linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.015) 0 1px,
            transparent 1px 4px
          );
        border: 1px solid var(--winamp-frame);
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        border-bottom-left-radius: var(--winamp-radius);
        border-bottom-right-radius: var(--winamp-radius);
        font-family: ui-monospace, 'Courier New', monospace;
        font-size: 11px;
        line-height: 1.45;
        scrollbar-width: thin;
        scrollbar-color: #6f7682 #0a0b0d;

        &::-webkit-scrollbar {
          width: 10px;
        }

        &::-webkit-scrollbar-track {
          background: #08090c;
        }

        &::-webkit-scrollbar-thumb {
          border: 2px solid #08090c;
          border-radius: 999px;
          background: linear-gradient(180deg, #707784, #3b3f46);
        }
      `}
    >
      <div
        css={`
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 0 0 8px;
          color: var(--winamp-muted);
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        `}
      >
        {() => {
          const order = playOrder()
          const active = currentSlot()
          const currentLabel =
            active >= 0 && order.length > 0
              ? `${String(active + 1).padStart(2, '0')}/${String(order.length).padStart(2, '0')}`
              : '--/--'

          return (
            <>
              <span>Playlist editor</span>
              <div
                css={`
                  display: flex;
                  gap: 6px;
                  align-items: center;
                `}
              >
                <span
                  css={`
                    padding: 3px 7px;
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    border-radius: 999px;
                    background: rgba(255, 255, 255, 0.04);
                  `}
                >
                  {`${order.length} files`}
                </span>
                <span
                  css={`
                    padding: 3px 7px;
                    border: 1px solid rgba(135, 255, 145, 0.16);
                    border-radius: 999px;
                    color: rgba(191, 255, 198, 0.8);
                    background: rgba(87, 255, 107, 0.06);
                  `}
                >
                  {currentLabel}
                </span>
              </div>
            </>
          )
        }}
      </div>
      {() => {
        const order = playOrder()
        const tracks = playlist()

        if (order.length === 0) {
          return (
            <div
              css={`
                min-height: 180px;
                display: grid;
                place-items: center;
                padding: 8px 4px 4px;
              `}
            >
              <div
                css={`
                  width: min(100%, 300px);
                  padding: 16px 18px;
                  text-align: center;
                  border: 1px solid #071109;
                  border-radius: 10px;
                  background:
                    linear-gradient(180deg, rgba(13, 38, 18, 0.98), rgba(7, 19, 10, 0.98)),
                    repeating-linear-gradient(
                      180deg,
                      rgba(255, 255, 255, 0.025) 0 1px,
                      transparent 1px 4px
                    );
                  box-shadow:
                    inset 0 0 0 1px rgba(135, 255, 145, 0.08),
                    0 0 18px rgba(87, 255, 107, 0.08);
                `}
              >
                <div
                  css={`
                    color: rgba(191, 255, 198, 0.74);
                    font-size: 10px;
                    letter-spacing: 0.14em;
                    text-transform: uppercase;
                  `}
                >
                  Queue empty
                </div>
                <div
                  css={`
                    margin-top: 8px;
                    color: var(--winamp-text);
                    font-family: ui-monospace, 'Courier New', monospace;
                    font-size: 13px;
                    text-shadow: 0 0 12px rgba(87, 255, 107, 0.24);
                  `}
                >
                  Press OPEN and point the player to a music folder.
                </div>
              </div>
            </div>
          )
        }

        return (
          <ol
            css={`
              margin: 0;
              padding: 0 0 0 28px;
              list-style: decimal;
            `}
          >
            {order.map((playlistIndex, slot) => {
              const entry = tracks[playlistIndex]
              const label = entry?.relativePath ?? '?'
              const isCurrent = slot === currentSlot()
              return (
                <li
                  on:click={() => selectPlayOrderSlot(slot)}
                  prop:aria-current={() => (isCurrent ? 'true' : null)}
                  css={() =>
                    isCurrent
                      ? `
                    cursor: pointer;
                    padding: 6px 8px;
                    border-radius: 7px;
                    background: linear-gradient(
                      180deg,
                      rgba(16, 80, 27, 0.94),
                      rgba(9, 50, 18, 0.94)
                    );
                    color: var(--winamp-led);
                    box-shadow:
                      inset 0 0 0 1px rgba(135, 255, 145, 0.38),
                      0 0 14px rgba(87, 255, 107, 0.14);
                    text-shadow: 0 0 10px rgba(87, 255, 107, 0.22);
                  `
                      : `
                    cursor: pointer;
                    padding: 6px 8px;
                    border-radius: 7px;
                    color: #9ea79e;

                    &:hover {
                      color: #d4d9d1;
                      background: rgba(255, 255, 255, 0.06);
                    }
                  `
                  }
                >
                  {label}
                </li>
              )
            })}
          </ol>
        )
      }}
    </div>
  )
}
