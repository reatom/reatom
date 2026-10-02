const ORIENTATION_6_PROBE_JPEG_BASE64 =
  '/9j/4QAiRXhpZgAATU0AKgAAAAgAAQESAAMAAAABAAYAAAAAAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAABAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAbEAEAAAcAAAAAAAAAAAAAAAAAAQMFBjV0sv/EABUBAQEAAAAAAAAAAAAAAAAAAAUJ/8QAGxEAAAcBAAAAAAAAAAAAAAAAAAECBAU1c7L/2gAMAwEAAhEDEQA/AIHuHP1LZm9xAU2galpmjkgBNWbrRfRj/9k='

let probe: Promise<boolean> | null = null

async function detectBrowserAppliesExifToBitmaps(): Promise<boolean> {
  try {
    const bytes = Uint8Array.from(
      atob(ORIENTATION_6_PROBE_JPEG_BASE64),
      (char) => char.charCodeAt(0),
    )
    const bitmap = await createImageBitmap(
      new Blob([bytes], { type: 'image/jpeg' }),
      { imageOrientation: 'none' },
    )
    const appliedOrientation = bitmap.width === 1 && bitmap.height === 2
    bitmap.close()
    return appliedOrientation
  } catch {
    return false
  }
}

/**
 * Some Chromium builds rotate `createImageBitmap(blob)` output by the EXIF
 * Orientation tag even when `imageOrientation: 'none'` is requested. The probe
 * decodes a 2x1 JPEG tagged with orientation 6 once: a 1x2 bitmap means the
 * browser already baked the orientation into the pixels.
 */
export function browserAppliesExifToBitmaps(): Promise<boolean> {
  probe ??= detectBrowserAppliesExifToBitmaps()
  return probe
}

export function resetBrowserAppliesExifProbe(): void {
  probe = null
}
