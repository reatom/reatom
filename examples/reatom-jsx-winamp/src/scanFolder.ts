const AUDIO_EXTENSIONS = new Set([
  '.mp3',
  '.m4a',
  '.aac',
  '.ogg',
  '.opus',
  '.flac',
  '.wav',
  '.webm',
])

const MAX_DEPTH = 32

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot).toLowerCase()
}

function isAudioFileName(name: string): boolean {
  return AUDIO_EXTENSIONS.has(extensionOf(name))
}

export type PlaylistEntry = {
  relativePath: string
  fileName: string
  handle: FileSystemFileHandle
}

async function collectFromDirectory(
  dirHandle: FileSystemDirectoryHandle,
  prefix: string,
  depth: number,
  out: PlaylistEntry[],
): Promise<void> {
  if (depth > MAX_DEPTH) {
    return
  }

  for await (const handle of dirHandle.values()) {
    const segment = prefix ? `${prefix}/${handle.name}` : handle.name

    if (handle.kind === 'file') {
      if (isAudioFileName(handle.name)) {
        out.push({
          relativePath: segment,
          fileName: handle.name,
          handle,
        })
      }
    } else {
      await collectFromDirectory(handle, segment, depth + 1, out)
    }
  }
}

export async function scanFolderForAudio(
  rootHandle: FileSystemDirectoryHandle,
): Promise<PlaylistEntry[]> {
  const collected: PlaylistEntry[] = []
  await collectFromDirectory(rootHandle, '', 0, collected)
  collected.sort((a, b) =>
    a.relativePath.localeCompare(b.relativePath, undefined, {
      sensitivity: 'base',
    }),
  )
  return collected
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

export async function pickMusicFolder(): Promise<{
  name: string
  handle: FileSystemDirectoryHandle
  tracks: PlaylistEntry[]
} | null> {
  try {
    const handle = await window.showDirectoryPicker()
    const tracks = await scanFolderForAudio(handle)
    return { name: handle.name, handle, tracks }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return null
    }
    throw error
  }
}
