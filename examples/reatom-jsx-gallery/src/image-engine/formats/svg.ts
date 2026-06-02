type SvgMeta = {
  width: number
  height: number
}

const SVG_HEADER_READ_BYTES = 4096

function parseLength(value: string): number | null {
  const trimmed = value.trim()
  // Only accept absolute pixel values or bare numbers
  const match = trimmed.match(/^(\d+(?:\.\d+)?)(px)?$/)
  if (!match) return null
  return parseFloat(match[1]!)
}

function parseViewBox(
  viewBox: string,
): { width: number; height: number } | null {
  const parts = viewBox.trim().split(/[\s,]+/)
  if (parts.length !== 4) return null
  const w = parseFloat(parts[2]!)
  const h = parseFloat(parts[3]!)
  if (!isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) return null
  return { width: Math.round(w), height: Math.round(h) }
}

function extractSvgTagAttrs(text: string): string | null {
  const svgStart = text.indexOf('<svg')
  if (svgStart === -1) return null

  let i = svgStart + 4
  let inQuotes = false
  let quoteChar = ''
  while (i < text.length) {
    const c = text[i]
    if (inQuotes) {
      if (c === quoteChar) inQuotes = false
    } else {
      if (c === '"' || c === "'") {
        inQuotes = true
        quoteChar = c
      } else if (c === '>') {
        return text.slice(svgStart + 4, i)
      }
    }
    i++
  }
  return null
}

export function parseSvgMeta(blob: Blob): Promise<SvgMeta | null> {
  const headerSlice = blob.slice(0, SVG_HEADER_READ_BYTES)
  return headerSlice.text().then((text) => {
    const attrs = extractSvgTagAttrs(text)
    if (!attrs) return null

    const widthMatch = attrs.match(/\bwidth\s*=\s*["']([^"']*)["']/)
    const heightMatch = attrs.match(/\bheight\s*=\s*["']([^"']*)["']/)
    const viewBoxMatch = attrs.match(/\bviewBox\s*=\s*["']([^"']*)["']/)

    const parsedWidth = widthMatch ? parseLength(widthMatch[1]!) : null
    const parsedHeight = heightMatch ? parseLength(heightMatch[1]!) : null

    if (parsedWidth !== null && parsedHeight !== null) {
      return {
        width: Math.round(parsedWidth),
        height: Math.round(parsedHeight),
      }
    }

    if (viewBoxMatch) {
      return parseViewBox(viewBoxMatch[1]!)
    }

    return null
  })
}
