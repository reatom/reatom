import {
  action,
  atom,
  computed,
  effect,
  withAsync,
  wrap,
} from '@reatom/core'

import { pickMusicFolder, type PlaylistEntry } from './scanFolder'

export type { PlaylistEntry }

export const folderLabel = atom('', 'folderLabel')

export const playlist = atom<PlaylistEntry[]>([], 'playlist')

export const playOrder = atom<number[]>([], 'playOrder')

export const currentSlot = atom(-1, 'currentSlot')

export const shuffleEnabled = atom(false, 'shuffleEnabled')

export type RepeatMode = 'none' | 'all' | 'one'

export const repeatMode = atom<RepeatMode>('none', 'repeatMode')

export const isPlaying = atom(false, 'isPlaying')

export const volume = atom(0.75, 'volume')

export const positionSec = atom(0, 'positionSec')

export const durationSec = atom(0, 'durationSec')

export const nowPlayingTitle = computed(() => {
  const slot = currentSlot()
  const order = playOrder()
  const list = playlist()
  if (slot < 0 || slot >= order.length || list.length === 0) {
    return 'No file'
  }
  const entry = list[order[slot]]
  return entry?.relativePath ?? 'No file'
}, 'nowPlayingTitle')

let audioElement: HTMLAudioElement | null = null
let currentBlobUrl: string | null = null

function revokeCurrentUrl() {
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl)
    currentBlobUrl = null
  }
}

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

function handleTrackEnded() {
  const el = audioElement
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
  const el = audioElement
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
  revokeCurrentUrl()
  const file = await wrap(entry.handle.getFile())
  const url = URL.createObjectURL(file)
  currentBlobUrl = url
  el.src = url
  await wrap(el.play())
}, 'loadCurrentTrack').extend(withAsync())

export const openFolder = action(async () => {
  const picked = await wrap(pickMusicFolder())
  if (!picked) {
    return
  }
  folderLabel.set(picked.name)
  playlist.set(picked.tracks)
  const trackCount = picked.tracks.length
  if (trackCount === 0) {
    playOrder.set([])
    currentSlot.set(-1)
    revokeCurrentUrl()
    if (audioElement) {
      audioElement.pause()
      audioElement.removeAttribute('src')
      audioElement.load()
    }
    isPlaying.set(false)
    positionSec.set(0)
    durationSec.set(0)
    return
  }
  const order = shuffleEnabled()
    ? shuffledIndices(trackCount)
    : Array.from({ length: trackCount }, (_, index) => index)
  playOrder.set(order)
  currentSlot.set(0)
  await loadCurrentTrack()
}, 'openFolder').extend(withAsync())

export const togglePlay = action(async () => {
  const el = audioElement
  if (!el?.src) {
    return
  }
  if (isPlaying()) {
    el.pause()
  } else {
    await wrap(el.play())
  }
}, 'togglePlay')

export const stopPlayback = action(() => {
  const el = audioElement
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
  const el = audioElement
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
  const sequence: RepeatMode[] = ['none', 'all', 'one']
  const index = sequence.indexOf(repeatMode())
  repeatMode.set(sequence[(index + 1) % sequence.length]!)
}, 'cycleRepeat')

export const seekToRatio = action((ratio: number) => {
  const el = audioElement
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
    revokeCurrentUrl()
    audioElement = null
    return
  }

  audioElement = el
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
    revokeCurrentUrl()
    audioElement = null
  }
}

effect(() => {
  const level = volume()
  if (audioElement) {
    audioElement.volume = level
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
