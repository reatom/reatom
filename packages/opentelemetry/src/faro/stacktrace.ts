/** Faro native frames; parsing is bounded and never evaluates stack content. */
export interface FaroStackFrame {
  filename: string
  function: string
  lineno?: number
  colno?: number
  bundleid?: string
}
const MAX_FRAMES = 100
const MAX_LENGTH = 64 * 1024
const coordinate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

export const stackFrames = (
  manual: unknown,
  stack: unknown,
): FaroStackFrame[] => {
  if (Array.isArray(manual))
    return manual.slice(0, MAX_FRAMES).flatMap((frame) => {
      if (!frame || typeof frame !== 'object') return []
      const { filename, function: fn, lineno, colno, bundleid } = frame
      if (typeof filename !== 'string' || typeof fn !== 'string') return []
      return [
        {
          filename: filename.slice(0, 4096),
          function: fn.slice(0, 1024),
          ...(coordinate(lineno) && { lineno }),
          ...(coordinate(colno) && { colno }),
          ...(typeof bundleid === 'string' && {
            bundleid: bundleid.slice(0, 1024),
          }),
        },
      ]
    })
  if (typeof stack !== 'string') return []
  const frames: FaroStackFrame[] = []
  for (const line of stack.slice(0, MAX_LENGTH).split('\n').slice(0, 200)) {
    if (frames.length >= MAX_FRAMES) break
    const source = line.trim()
    let fn = ''
    let location = ''
    if (source.startsWith('at ')) {
      const chrome = source.slice(3)
      const separator = chrome.lastIndexOf(' (')
      if (separator >= 0 && chrome.endsWith(')')) {
        fn = chrome.slice(0, separator)
        location = chrome.slice(separator + 2, -1)
      } else location = chrome
    } else {
      const separator = source.indexOf('@')
      if (separator < 0) continue
      fn = source.slice(0, separator)
      location = source.slice(separator + 1)
    }
    const match = /^(.*):(\d+):(\d+)$/.exec(location)
    if (!match || !match[1]) continue
    const lineno = Number(match[2]),
      colno = Number(match[3])
    if (!coordinate(lineno) || !coordinate(colno)) continue
    frames.push({
      filename: match[1].slice(0, 4096),
      function: fn.slice(0, 1024),
      lineno,
      colno,
    })
  }
  return frames
}
