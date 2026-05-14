# Reatom JSX — folder music player

Small demo: pick a folder with the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API), scan it recursively for common audio extensions, and play files in a Winamp-inspired layout. State and playback are driven by [`@reatom/core`](https://github.com/reatom/reatom) and [`@reatom/jsx`](https://github.com/reatom/reatom/tree/v1001/packages/jsx).

## Run

From this directory:

```bash
pnpm install
pnpm dev
```

Then open the URL Vite prints (localhost is a secure context for file access).

## Browser support

`showDirectoryPicker` is implemented in Chromium-based browsers. Safari/Firefox may show the fallback screen instead of the player.

## Persistence

Playlist rows (including each **`FileSystemFileHandle`**), folder label, play order, current track index, shuffle/repeat, and volume are stored with **`withIndexedDb`** on the corresponding atoms in [`src/model.ts`](src/model.ts). After a reload you may need to grant read access again when playback starts. Install **`idb-keyval`** so IndexedDB is used instead of the in-memory fallback.

Runtime-only state (`audioElementHost`, `currentObjectUrl`, playback time) stays in plain atoms without persistence.

## Controls

- **OPEN** — choose a directory; audio files are listed in play order (shuffled if **S** is toggled on).
- Transport **|◀ / ▶ / ■ / ▶|** — previous, play/pause, stop, next.
- **R / R\* / R1** — repeat off, repeat all, repeat one.
- **⏏** — open another folder (same as OPEN).
- Click a playlist row to jump to that track.
- Seek bar and volume slider follow the classic compact layout.
