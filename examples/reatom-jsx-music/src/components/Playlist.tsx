import {
  currentSlot,
  playOrder,
  playlist,
  selectPlayOrderSlot,
} from '../model'

export const Playlist = () => {
  return (
    <div
      css={`
        flex: 1;
        min-height: 120px;
        max-height: 220px;
        overflow: auto;
        background: #000;
        border: 1px solid #000;
        border-top: 1px solid var(--winamp-bevel-dark);
        font-family: ui-monospace, 'Courier New', monospace;
        font-size: 11px;
        line-height: 1.35;
      `}
    >
      <ol
        css={`
          margin: 0;
          padding: 4px 4px 4px 28px;
          list-style: decimal;
        `}
      >
        {() => {
          const order = playOrder()
          const tracks = playlist()
          const active = currentSlot()
          return order.map((playlistIndex, slot) => {
            const entry = tracks[playlistIndex]
            const label = entry?.relativePath ?? '?'
            const isCurrent = slot === active
            return (
              <li
                on:click={() => selectPlayOrderSlot(slot)}
                css={() =>
                  isCurrent
                    ? `
                  cursor: pointer;
                  background: #0a3a0a;
                  color: var(--winamp-led);
                  outline: 1px solid var(--winamp-led);
                `
                    : `
                  cursor: pointer;
                  color: #9a9a9a;
                `
                }
              >
                {label}
              </li>
            )
          })
        }}
      </ol>
    </div>
  )
}
