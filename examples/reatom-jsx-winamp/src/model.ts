import type { GenericExt } from '@reatom/core'
import {
  action,
  atom,
  computed,
  effect,
  reatomEnum,
  withAsync,
  withChangeHook,
  withIndexedDb,
  withLocalStorage,
  wrap,
} from '@reatom/core'

import { ensureAudioGraph, resumeAudioGraph } from './audioGraph'
import { pickMusicFolder, type PlaylistEntry } from './scanFolder'
import { PLAYER_THEME_IDS } from './themes'

export type { PlaylistEntry }

const idb: GenericExt = (target) =>
  target.extend(withIndexedDb({ key: target.name, version: 1 }))

export const folderLabel = atom('', 'folderLabel').extend(idb)

export const playlist = atom<PlaylistEntry[]>([], 'playlist').extend(idb)

export const playOrder = atom<number[]>([], 'playOrder').extend(idb)

export const currentSlot = atom(-1, 'currentSlot').extend(idb)

export const shuffleEnabled = atom(false, 'shuffleEnabled').extend(idb)

export const repeatMode = reatomEnum(
  ['none', 'all', 'one'],
  'repeatMode',
).extend(idb)

export const volume = atom(0.75, 'volume').extend(idb)

export const playerTheme = reatomEnum(PLAYER_THEME_IDS, {
  name: 'playerTheme',
  initState: 'classic',
}).extend(
  withLocalStorage('playerTheme'),
  withChangeHook((value) => {
    if (value === 'classic') {
      delete document.documentElement.dataset.playerTheme
    } else {
      document.documentElement.dataset.playerTheme = value
    }
  }),
)

export const isPlaying = atom(false, 'isPlaying')

export const positionSec = atom(0, 'positionSec')

export const durationSec = atom(0, 'durationSec')

export const audioElementHost = atom<HTMLAudioElement | null>(
  null,
  'audioElementHost',
)

export const currentObjectUrl = atom<string | null>(null, 'currentObjectUrl')

export const lastAudibleVolume = atom(0.75, 'lastAudibleVolume')

export const currentEntry = computed(() => {
  const slot = currentSlot()
  const order = playOrder()
  const list = playlist()
  if (slot < 0 || slot >= order.length || list.length === 0) {
    return null
  }
  return list[order[slot]!] ?? null
}, 'currentEntry')

export const trackCount = computed(() => playOrder().length, 'trackCount')

export const nowPlayingTitle = computed(() => {
  return currentEntry()?.relativePath ?? 'Nothing queued'
}, 'nowPlayingTitle')

function folderPathLabel(relativePath: string) {
  const lastSlash = relativePath.lastIndexOf('/')
  if (lastSlash === -1) {
    return 'Root folder'
  }
  return relativePath.slice(0, lastSlash).split('/').join(' / ')
}

export const nowPlayingFileName = computed(() => {
  return currentEntry()?.fileName ?? 'Nothing queued'
}, 'nowPlayingFileName')

export const nowPlayingContext = computed(() => {
  const entry = currentEntry()
  if (!entry) {
    return 'Open a folder to turn local files into a playable queue.'
  }
  return folderPathLabel(entry.relativePath)
}, 'nowPlayingContext')

function shuffledIndices(length: number): number[] {
  const indices = Array.from({ length }, (_, index) => index)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = indices[i]
    indices[i] = indices[j]!
    indices[j] = tmp!
  }
  return indices
}

function revokeObjectUrlAtom() {
  const url = currentObjectUrl()
  if (url) {
    URL.revokeObjectURL(url)
    currentObjectUrl.set(null)
  }
}

function clearMediaElementSource() {
  const mediaElement = audioElementHost()
  if (!mediaElement) {
    return
  }
  mediaElement.pause()
  mediaElement.removeAttribute('src')
  mediaElement.load()
}

function resetPlaybackState() {
  revokeObjectUrlAtom()
  clearMediaElementSource()
  isPlaying.set(false)
  positionSec.set(0)
  durationSec.set(0)
}

async function ensureFileReadAccess(handle: FileSystemFileHandle) {
  const readMode = { mode: 'read' as const }
  let allowed = (await handle.queryPermission(readMode)) === 'granted'
  if (!allowed) {
    allowed = (await handle.requestPermission(readMode)) === 'granted'
  }
  return allowed
}

function handleTrackEnded() {
  const el = audioElementHost()
  const mode = repeatMode()
  if (mode === 'one') {
    if (el) {
      el.currentTime = 0
      void wrap(el.play())
    }
    return
  }

  const order = playOrder()
  const lastIndex = order.length - 1
  const slot = currentSlot()
  if (lastIndex < 0) {
    return
  }
  if (slot < lastIndex) {
    currentSlot.set(slot + 1)
    void loadCurrentTrack()
  } else if (mode === 'all') {
    currentSlot.set(0)
    void loadCurrentTrack()
  } else {
    isPlaying.set(false)
  }
}

export const loadCurrentTrack = action(async () => {
  const el = audioElementHost()
  if (!el) {
    return
  }
  const slot = currentSlot()
  const order = playOrder()
  const list = playlist()
  if (slot < 0 || slot >= order.length) {
    return
  }
  const entry = list[order[slot]!]
  if (!entry) {
    return
  }
  const canRead = await wrap(ensureFileReadAccess(entry.handle))
  if (!canRead) {
    resetPlaybackState()
    return
  }
  revokeObjectUrlAtom()
  const file = await wrap(entry.handle.getFile())
  const url = URL.createObjectURL(file)
  currentObjectUrl.set(url)
  positionSec.set(0)
  durationSec.set(0)
  el.src = url
  await resumeAudioGraph()
  await wrap(el.play())
}, 'loadCurrentTrack').extend(withAsync())

function applyScannedTracks(folderName: string, tracks: PlaylistEntry[]) {
  folderLabel.set(folderName)
  playlist.set(tracks)
  const trackCount = tracks.length
  if (trackCount === 0) {
    playOrder.set([])
    currentSlot.set(-1)
    resetPlaybackState()
    return
  }
  const order = shuffleEnabled()
    ? shuffledIndices(trackCount)
    : Array.from({ length: trackCount }, (_, index) => index)
  playOrder.set(order)
  currentSlot.set(0)
  void loadCurrentTrack()
}

export const openFolder = action(async () => {
  const picked = await wrap(pickMusicFolder())
  if (!picked) {
    return
  }
  applyScannedTracks(picked.name, picked.tracks)
}, 'openFolder').extend(withAsync())

export const clearQueue = action(() => {
  folderLabel.set('')
  playlist.set([])
  playOrder.set([])
  currentSlot.set(-1)
  resetPlaybackState()
}, 'clearQueue')

// TODO remove (need withIndexedDb fix)
effect(() => {
  const list = playlist()
  const order = playOrder()
  let slot = currentSlot()
  if (list.length === 0) {
    if (order.length !== 0) {
      playOrder.set([])
    }
    if (slot !== -1) {
      currentSlot.set(-1)
    }
    resetPlaybackState()
    return
  }
  const permutationOk =
    order.length === list.length &&
    order.every((idx: number) => idx >= 0 && idx < list.length) &&
    new Set(order).size === order.length
  if (!permutationOk) {
    const rebuilt = shuffleEnabled()
      ? shuffledIndices(list.length)
      : Array.from({ length: list.length }, (_, index) => index)
    playOrder.set(rebuilt)
    slot = Math.min(Math.max(slot, 0), rebuilt.length - 1)
    currentSlot.set(slot)
    void loadCurrentTrack()
    return
  }
  if (slot < 0 || slot >= order.length) {
    currentSlot.set(0)
    void loadCurrentTrack()
  }
}, 'reconcilePlaybackWithPlaylist')

export const togglePlay = action(async () => {
  const el = audioElementHost()
  if (!el) {
    return
  }
  if (!el.src) {
    const slot = currentSlot()
    const order = playOrder()
    const list = playlist()
    if (
      list.length === 0 ||
      order.length === 0 ||
      slot < 0 ||
      slot >= order.length
    ) {
      return
    }
    await loadCurrentTrack()
    return
  }
  if (isPlaying()) {
    el.pause()
  } else {
    await resumeAudioGraph()
    await wrap(el.play())
  }
}, 'togglePlay')

export const stopPlayback = action(() => {
  const el = audioElementHost()
  if (!el) {
    return
  }
  el.pause()
  el.currentTime = 0
  isPlaying.set(false)
  positionSec.set(0)
}, 'stopPlayback')

export const nextTrack = action(() => {
  const order = playOrder()
  const lastIndex = order.length - 1
  if (lastIndex < 0) {
    return
  }
  const slot = currentSlot()
  if (slot < lastIndex) {
    currentSlot.set(slot + 1)
  } else if (repeatMode() === 'all') {
    currentSlot.set(0)
  } else {
    return
  }
  void loadCurrentTrack()
}, 'nextTrack')

export const prevTrack = action(() => {
  const el = audioElementHost()
  const order = playOrder()
  if (order.length === 0) {
    return
  }
  if (el && el.currentTime > 3) {
    el.currentTime = 0
    positionSec.set(0)
    return
  }
  const slot = currentSlot()
  if (slot > 0) {
    currentSlot.set(slot - 1)
    void loadCurrentTrack()
  } else if (repeatMode() === 'all') {
    currentSlot.set(order.length - 1)
    void loadCurrentTrack()
  }
}, 'prevTrack')

export const selectPlayOrderSlot = action(async (slot: number) => {
  const order = playOrder()
  if (slot < 0 || slot >= order.length) {
    return
  }
  currentSlot.set(slot)
  await loadCurrentTrack()
}, 'selectPlayOrderSlot')

export const toggleShuffle = action(() => {
  const list = playlist()
  const length = list.length
  if (length === 0) {
    return
  }
  const slot = currentSlot()
  const order = playOrder()
  const playingPlaylistIndex =
    slot >= 0 && slot < order.length ? order[slot]! : 0
  shuffleEnabled.set(!shuffleEnabled())
  const nextOrder = shuffleEnabled()
    ? shuffledIndices(length)
    : Array.from({ length }, (_, index) => index)
  playOrder.set(nextOrder)
  const newSlot = nextOrder.indexOf(playingPlaylistIndex)
  currentSlot.set(newSlot >= 0 ? newSlot : 0)
}, 'toggleShuffle')

export const cycleRepeat = action(() => {
  const sequence = Object.values(repeatMode.enum)
  const index = sequence.indexOf(repeatMode())
  repeatMode.set(sequence[(index + 1) % sequence.length]!)
}, 'cycleRepeat')

export const toggleMute = action(() => {
  const currentVolume = volume()
  if (currentVolume > 0) {
    lastAudibleVolume.set(currentVolume)
    volume.set(0)
    return
  }
  volume.set(lastAudibleVolume() || 0.75)
}, 'toggleMute')

export const seekToRatio = action((ratio: number) => {
  const el = audioElementHost()
  const duration = durationSec()
  if (!el || !Number.isFinite(duration) || duration <= 0) {
    return
  }
  const clamped = Math.min(1, Math.max(0, ratio))
  el.currentTime = clamped * duration
  positionSec.set(el.currentTime)
}, 'seekToRatio')

export function bindAudioElement(el: HTMLAudioElement | null) {
  if (!el) {
    revokeObjectUrlAtom()
    audioElementHost.set(null)
    return
  }

  audioElementHost.set(el)
  ensureAudioGraph(el)
  el.volume = volume()

  const onTimeUpdate = () => {
    positionSec.set(el.currentTime)
  }
  const onLoadedMetadata = () => {
    durationSec.set(Number.isFinite(el.duration) ? el.duration : 0)
  }
  const onEnded = () => {
    handleTrackEnded()
  }
  const onPlay = () => {
    isPlaying.set(true)
  }
  const onPause = () => {
    isPlaying.set(false)
  }

  el.addEventListener('timeupdate', onTimeUpdate)
  el.addEventListener('loadedmetadata', onLoadedMetadata)
  el.addEventListener('ended', onEnded)
  el.addEventListener('play', onPlay)
  el.addEventListener('pause', onPause)

  return () => {
    el.removeEventListener('timeupdate', onTimeUpdate)
    el.removeEventListener('loadedmetadata', onLoadedMetadata)
    el.removeEventListener('ended', onEnded)
    el.removeEventListener('play', onPlay)
    el.removeEventListener('pause', onPause)
    revokeObjectUrlAtom()
    audioElementHost.set(null)
  }
}

effect(() => {
  const level = volume()
  const el = audioElementHost()
  if (level > 0) {
    lastAudibleVolume.set(level)
  }
  if (el) {
    el.volume = level
  }
}, 'syncVolume')

export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00'
  }
  const total = Math.floor(seconds)
  const minutes = Math.floor(total / 60)
  const secs = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
